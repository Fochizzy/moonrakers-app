-- A saved group is the durable authorization artifact for fast game setup.
-- The private rows are deliberately inaccessible to clients: they can only be
-- created after every non-host member has a valid, short-lived draft grant.
create table private.group_member_authorizations (
  group_id uuid not null
    references public.groups(id) on update cascade on delete cascade,
  profile_id uuid not null
    references public.profiles(id) on update cascade on delete cascade,
  authorized_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index group_member_authorizations_profile_id_idx
  on private.group_member_authorizations (profile_id);

revoke all on table private.group_member_authorizations
  from public, anon, authenticated;

create or replace function public.create_verified_group(
  p_name text,
  p_profile_ids uuid[],
  p_draft_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_host_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_member_ids uuid[];
  v_member_count integer;
  v_group public.groups;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_draft_id is null then
    raise exception 'Group verification draft is required';
  end if;

  if v_name = '' or char_length(v_name) > 80 then
    raise exception 'Group name must be 1 to 80 characters';
  end if;

  select coalesce(array_agg(member_id order by first_position), array[]::uuid[])
  into v_member_ids
  from (
    select input.member_id, min(input.position) as first_position
    from unnest(coalesce(p_profile_ids, array[]::uuid[]))
      with ordinality as input(member_id, position)
    where input.member_id is not null
    group by input.member_id
  ) as unique_members;

  v_member_count := cardinality(v_member_ids);

  if v_member_count < 2 or v_member_count > 5 then
    raise exception 'A saved group must contain 2 to 5 players';
  end if;

  if cardinality(coalesce(p_profile_ids, array[]::uuid[])) <> v_member_count then
    raise exception 'A saved group cannot contain duplicate or empty players';
  end if;

  if not (v_host_id = any(v_member_ids)) then
    raise exception 'The signed-in player must be in the saved group';
  end if;

  if (
    select count(*)
    from public.profiles as profile
    where profile.id = any(v_member_ids)
      and profile.deleted_at is null
  ) <> v_member_count then
    raise exception 'Every group member must be an active player or guest profile';
  end if;

  if exists (
    select 1
    from unnest(v_member_ids) as member(profile_id)
    where member.profile_id <> v_host_id
      and not exists (
        select 1
        from private.player_add_authorizations as authorization_row
        where authorization_row.host_profile_id = v_host_id
          and authorization_row.draft_id = p_draft_id
          and authorization_row.subject_profile_id = member.profile_id
          and authorization_row.expires_at > now()
      )
  ) then
    raise exception 'Group authorization expired. Re-enter each player passcode';
  end if;

  insert into public.groups (created_by, name)
  values (v_host_id, v_name)
  returning * into v_group;

  insert into public.group_members (group_id, profile_id, position)
  select v_group.id, member.profile_id, (member.position - 1)::integer
  from unnest(v_member_ids) with ordinality as member(profile_id, position);

  insert into private.group_member_authorizations (
    group_id,
    profile_id,
    authorized_at
  )
  select v_group.id, member.profile_id, now()
  from unnest(v_member_ids) as member(profile_id);

  delete from private.player_add_authorizations
  where host_profile_id = v_host_id
    and draft_id = p_draft_id;

  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'created_at', v_group.created_at,
    'player_ids', to_jsonb(v_member_ids),
    'fast_setup_authorized', true
  );
end;
$$;

create or replace function public.is_group_authorized_for_fast_setup(
  p_group_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_host_id uuid := auth.uid();
  v_member_count integer;
begin
  if v_host_id is null or p_group_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.group_members as host_membership
    where host_membership.group_id = p_group_id
      and host_membership.profile_id = v_host_id
  ) then
    return false;
  end if;

  select count(distinct member.profile_id)
  into v_member_count
  from public.group_members as member
  join public.profiles as profile on profile.id = member.profile_id
  where member.group_id = p_group_id
    and profile.deleted_at is null;

  if v_member_count < 2 or v_member_count > 5 then
    return false;
  end if;

  return not exists (
    select 1
    from public.group_members as member
    join public.profiles as profile on profile.id = member.profile_id
    where member.group_id = p_group_id
      and profile.deleted_at is null
      and not exists (
        select 1
        from private.group_member_authorizations as authorization_row
        where authorization_row.group_id = p_group_id
          and authorization_row.profile_id = member.profile_id
      )
  );
end;
$$;

create or replace function public.authorize_group_for_fast_setup(
  p_group_id uuid,
  p_draft_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_host_id uuid := auth.uid();
  v_member_ids uuid[];
  v_member_count integer;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_group_id is null or p_draft_id is null then
    raise exception 'Group and verification draft are required';
  end if;

  perform 1
  from public.groups as saved_group
  where saved_group.id = p_group_id
  for update;

  if not found then
    raise exception 'Saved group not found';
  end if;

  select coalesce(array_agg(member.profile_id order by member.first_position), array[]::uuid[])
  into v_member_ids
  from (
    select group_member.profile_id,
           min(coalesce(group_member.position, 2147483647)) as first_position
    from public.group_members as group_member
    where group_member.group_id = p_group_id
    group by group_member.profile_id
  ) as member;

  v_member_count := cardinality(v_member_ids);

  if v_member_count < 2 or v_member_count > 5 then
    raise exception 'A saved group must contain 2 to 5 players';
  end if;

  if not (v_host_id = any(v_member_ids)) then
    raise exception 'Only a member of this group can authorize it';
  end if;

  if (
    select count(*)
    from public.profiles as profile
    where profile.id = any(v_member_ids)
      and profile.deleted_at is null
  ) <> v_member_count then
    raise exception 'Every group member must be an active player or guest profile';
  end if;

  if exists (
    select 1
    from unnest(v_member_ids) as member(profile_id)
    where member.profile_id <> v_host_id
      and not exists (
        select 1
        from private.player_add_authorizations as authorization_row
        where authorization_row.host_profile_id = v_host_id
          and authorization_row.draft_id = p_draft_id
          and authorization_row.subject_profile_id = member.profile_id
          and authorization_row.expires_at > now()
      )
  ) then
    raise exception 'Group authorization expired. Re-enter each player passcode';
  end if;

  delete from private.group_member_authorizations
  where group_id = p_group_id;

  insert into private.group_member_authorizations (
    group_id,
    profile_id,
    authorized_at
  )
  select p_group_id, member.profile_id, now()
  from unnest(v_member_ids) as member(profile_id);

  delete from private.player_add_authorizations
  where host_profile_id = v_host_id
    and draft_id = p_draft_id;

  return true;
end;
$$;

-- Removing a passcode also removes that player's durable group approvals.
-- Changing a passcode does not: the group was already approved by every member.
create or replace function public.remove_my_player_passcode()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from private.player_passcodes where profile_id = v_user_id;
  delete from private.player_add_authorizations
  where subject_profile_id = v_user_id;
  delete from private.group_member_authorizations
  where profile_id = v_user_id;

  return jsonb_build_object('removed', true);
end;
$$;

-- Keep the existing save implementation private and expand only the public
-- authorization wrapper. A completed game may use either fresh per-draft
-- grants or one fully authorized saved group whose membership exactly matches
-- the participant list.
create or replace function public.save_completed_game(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_host_id uuid := auth.uid();
  v_requested_host_id uuid := nullif(payload->>'host_profile_id', '')::uuid;
  v_draft_id uuid := nullif(payload->>'client_game_id', '')::uuid;
  v_requested_group_id uuid := nullif(payload->>'group_id', '')::uuid;
  v_group_authorized boolean := false;
  v_existing_game_id uuid;
  v_game_id uuid;
begin
  if v_host_id is null or v_requested_host_id is null or v_requested_host_id <> v_host_id then
    raise exception 'host_profile_id must match the authenticated profile';
  end if;

  if v_draft_id is null then
    raise exception 'client_game_id is required for player authorization';
  end if;

  select game.id
  into v_existing_game_id
  from public.games as game
  where game.client_game_id = v_draft_id
    and game.host_profile_id = v_host_id;

  if v_existing_game_id is not null then
    return v_existing_game_id;
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant(item)
    where nullif(participant.item->>'profile_id', '')::uuid = v_host_id
  ) then
    raise exception 'The host must be a game participant';
  end if;

  if v_requested_group_id is not null then
    select exists (
      select 1
      from public.groups as saved_group
      where saved_group.id = v_requested_group_id
        and (
          select count(distinct member.profile_id)
          from public.group_members as member
          where member.group_id = saved_group.id
        ) between 2 and 5
        and exists (
          select 1
          from public.group_members as host_membership
          where host_membership.group_id = saved_group.id
            and host_membership.profile_id = v_host_id
        )
        and not exists (
          select 1
          from public.group_members as member
          where member.group_id = saved_group.id
            and not exists (
              select 1
              from private.group_member_authorizations as authorization_row
              where authorization_row.group_id = saved_group.id
                and authorization_row.profile_id = member.profile_id
            )
        )
        and not exists (
          select 1
          from public.group_members as member
          where member.group_id = saved_group.id
            and not exists (
              select 1
              from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb))
                as participant(item)
              where nullif(participant.item->>'profile_id', '')::uuid = member.profile_id
            )
        )
        and not exists (
          select 1
          from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb))
            as participant(item)
          where not exists (
            select 1
            from public.group_members as member
            where member.group_id = saved_group.id
              and member.profile_id = nullif(participant.item->>'profile_id', '')::uuid
          )
        )
    ) into v_group_authorized;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant(item)
    where nullif(participant.item->>'profile_id', '')::uuid <> v_host_id
      and not v_group_authorized
      and not exists (
        select 1
        from private.player_add_authorizations as authorization_row
        where authorization_row.host_profile_id = v_host_id
          and authorization_row.draft_id = v_draft_id
          and authorization_row.subject_profile_id =
            nullif(participant.item->>'profile_id', '')::uuid
          and authorization_row.expires_at > now()
      )
  ) then
    raise exception 'Player authorization expired. Re-enter the player passcode';
  end if;

  v_game_id := private.save_completed_game_unverified(payload);

  delete from private.player_add_authorizations
  where host_profile_id = v_host_id
    and draft_id = v_draft_id;

  return v_game_id;
end;
$$;

revoke execute on function public.create_verified_group(text, uuid[], uuid)
  from public, anon;
revoke execute on function public.is_group_authorized_for_fast_setup(uuid)
  from public, anon;
revoke execute on function public.authorize_group_for_fast_setup(uuid, uuid)
  from public, anon;
revoke execute on function public.remove_my_player_passcode()
  from public, anon;
revoke execute on function public.save_completed_game(jsonb)
  from public, anon;

grant execute on function public.create_verified_group(text, uuid[], uuid)
  to authenticated;
grant execute on function public.is_group_authorized_for_fast_setup(uuid)
  to authenticated;
grant execute on function public.authorize_group_for_fast_setup(uuid, uuid)
  to authenticated;
grant execute on function public.remove_my_player_passcode()
  to authenticated;
grant execute on function public.save_completed_game(jsonb)
  to authenticated;

notify pgrst, 'reload schema';
