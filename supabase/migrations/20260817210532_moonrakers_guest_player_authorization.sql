-- Guests and players share public.profiles so completed games keep one stable
-- participant contract. Passcodes are never stored in the exposed schema.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

alter table public.profiles
  add column if not exists is_guest boolean not null default false,
  add column if not exists claimed_at timestamptz,
  add column if not exists created_by uuid;

-- A guest profile does not have an auth.users row until it is claimed.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select constraint_name.conname
    from pg_constraint as constraint_name
    where constraint_name.conrelid = 'public.profiles'::regclass
      and constraint_name.confrelid = 'auth.users'::regclass
      and constraint_name.contype = 'f'
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_created_by_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_created_by_fkey
      foreign key (created_by)
      references public.profiles(id)
      on update cascade
      on delete set null;
  end if;
end;
$$;

-- Claiming a guest changes the profile id to auth.uid(). Every profile foreign
-- key therefore needs to follow that re-key operation.
do $$
declare
  constraint_row record;
  constraint_definition text;
begin
  for constraint_row in
    select foreign_key.oid,
           foreign_key.conrelid,
           foreign_key.conname
    from pg_constraint as foreign_key
    where foreign_key.confrelid = 'public.profiles'::regclass
      and foreign_key.contype = 'f'
      and foreign_key.confupdtype <> 'c'
  loop
    constraint_definition := pg_get_constraintdef(constraint_row.oid);

    if position(' ON DELETE ' in constraint_definition) > 0 then
      constraint_definition := replace(
        constraint_definition,
        ' ON DELETE ',
        ' ON UPDATE CASCADE ON DELETE '
      );
    else
      constraint_definition := constraint_definition || ' ON UPDATE CASCADE';
    end if;

    execute format(
      'alter table %s drop constraint %I',
      constraint_row.conrelid::regclass,
      constraint_row.conname
    );
    execute format(
      'alter table %s add constraint %I %s',
      constraint_row.conrelid::regclass,
      constraint_row.conname,
      constraint_definition
    );
  end loop;
end;
$$;

-- The five existing profiles were created with a table name in player_name
-- and the actual username in display_name: RevLoki, Fochizzy, GregMtG,
-- Lurker, and Cpl_Baloo. Collapse them onto the username before new
-- guest/player flows start treating player_name as the only name.
do $$
declare
  duplicate_username text;
begin
  select string_agg(username, ', ')
  into duplicate_username
  from (
    select lower(
      coalesce(nullif(btrim(profile.display_name), ''), btrim(profile.player_name))
    ) as username
    from public.profiles as profile
    group by 1
    having count(*) > 1
  ) as duplicates;

  if duplicate_username is not null then
    raise exception 'Cannot collapse profiles to usernames; duplicate usernames: %',
      duplicate_username;
  end if;
end;
$$;

update public.profiles
set player_name = btrim(display_name),
    display_name = null,
    updated_at = now()
where nullif(btrim(display_name), '') is not null;

-- Saved snapshots are deliberately rewritten too: historical screens read
-- these columns directly instead of joining the current profile.
update public.game_participants as participant
set player_name_snapshot = profile.player_name,
    display_name_snapshot = null
from public.profiles as profile
where participant.profile_id = profile.id
  and (
    participant.player_name_snapshot is distinct from profile.player_name
    or participant.display_name_snapshot is not null
  );

alter table public.profiles
  drop constraint if exists profiles_username_only_check;
alter table public.profiles
  add constraint profiles_username_only_check
  check (display_name is null or btrim(display_name) = btrim(player_name));

create unique index if not exists profiles_active_player_name_lower_key
  on public.profiles (lower(btrim(player_name)))
  where deleted_at is null;

create table if not exists private.player_passcodes (
  profile_id uuid primary key
    references public.profiles(id) on update cascade on delete cascade,
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.player_add_authorizations (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null
    references public.profiles(id) on update cascade on delete cascade,
  draft_id uuid not null,
  subject_profile_id uuid not null
    references public.profiles(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (host_profile_id, draft_id, subject_profile_id)
);

create table if not exists private.player_passcode_failures (
  host_profile_id uuid not null
    references public.profiles(id) on update cascade on delete cascade,
  subject_profile_id uuid not null
    references public.profiles(id) on update cascade on delete cascade,
  window_started_at timestamptz not null default now(),
  failed_attempts int not null default 0,
  locked_until timestamptz,
  primary key (host_profile_id, subject_profile_id)
);

revoke all on table private.player_passcodes from public, anon, authenticated;
revoke all on table private.player_add_authorizations from public, anon, authenticated;
revoke all on table private.player_passcode_failures from public, anon, authenticated;

create or replace function private.normalize_player_passcode(p_passcode text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(p_passcode, '')));
$$;

create or replace function private.player_add_authorization_ttl()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '12 hours';
$$;

revoke all on function private.normalize_player_passcode(text)
  from public, anon, authenticated;
revoke all on function private.player_add_authorization_ttl()
  from public, anon, authenticated;

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and not is_guest
  and created_by is null
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = id
  and not is_guest
)
with check (
  (select auth.uid()) = id
  and not is_guest
);

-- Remove every legacy overload that accepted a separate display name before
-- exposing the username-only guest contract.
drop function if exists public.create_guest_profile(text, text, text, text, integer);
drop function if exists public.create_guest_profile(text, text, text, integer);
create function public.create_guest_profile(
  p_player_name text,
  p_passcode text,
  p_favorite_color text default null,
  p_assigned_card_art_index integer default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_host_id uuid := auth.uid();
  v_player_name text := btrim(coalesce(p_player_name, ''));
  v_passcode text := private.normalize_player_passcode(p_passcode);
  v_guest public.profiles;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_player_name !~ '^[A-Za-z0-9_-]{3,20}$' then
    raise exception 'Username must be 3 to 20 letters, numbers, dashes or underscores';
  end if;

  if v_passcode !~ '^[a-z0-9]{3,8}$' then
    raise exception 'Passcode must be 3 to 8 letters or numbers';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(btrim(public.profiles.player_name)) = lower(v_player_name)
      and public.profiles.deleted_at is null
  ) then
    raise exception 'That username is already taken';
  end if;

  insert into public.profiles (
    id,
    player_name,
    display_name,
    favorite_color,
    assigned_card_art_index,
    is_guest,
    created_by
  )
  values (
    gen_random_uuid(),
    v_player_name,
    null,
    coalesce(nullif(lower(btrim(coalesce(p_favorite_color, ''))), ''), 'blue'),
    coalesce(p_assigned_card_art_index, 0),
    true,
    v_host_id
  )
  returning * into v_guest;

  insert into private.player_passcodes (profile_id, passcode_hash)
  values (
    v_guest.id,
    extensions.crypt(v_passcode, extensions.gen_salt('bf'))
  );

  return v_guest;
end;
$$;

drop function if exists public.claim_guest_profile(text, text, text);
drop function if exists public.claim_guest_profile(text, text);
create function public.claim_guest_profile(
  p_player_name text,
  p_passcode text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_name text := btrim(coalesce(p_player_name, ''));
  v_passcode text := private.normalize_player_passcode(p_passcode);
  v_guest public.profiles;
  v_hash text;
  v_seats int := 0;
  v_failure private.player_passcode_failures;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_player_name = '' or v_passcode = '' then
    raise exception 'Guest username and passcode are required';
  end if;

  select profile.*
  into v_guest
  from public.profiles as profile
  where lower(btrim(profile.player_name)) = lower(v_player_name)
    and profile.is_guest
    and profile.deleted_at is null
  limit 1
  for update;

  if v_guest.id is null then
    return jsonb_build_object('claimed', false);
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'This account already has a player profile';
  end if;

  select failure.*
  into v_failure
  from private.player_passcode_failures as failure
  where failure.host_profile_id = v_user_id
    and failure.subject_profile_id = v_guest.id;

  if v_failure.locked_until is not null and v_failure.locked_until > now() then
    raise exception 'Too many attempts. Try again later';
  end if;

  select passcode.passcode_hash
  into v_hash
  from private.player_passcodes as passcode
  where passcode.profile_id = v_guest.id;

  if v_hash is null
     or extensions.crypt(v_passcode, v_hash) <> v_hash then
    insert into private.player_passcode_failures as failure (
      host_profile_id,
      subject_profile_id,
      window_started_at,
      failed_attempts,
      locked_until
    )
    values (v_user_id, v_guest.id, now(), 1, null)
    on conflict (host_profile_id, subject_profile_id) do update
      set window_started_at = case
            when failure.window_started_at < now() - interval '10 minutes'
              then now()
            else failure.window_started_at
          end,
          failed_attempts = case
            when failure.window_started_at < now() - interval '10 minutes'
              then 1
            else failure.failed_attempts + 1
          end,
          locked_until = case
            when (
              case
                when failure.window_started_at < now() - interval '10 minutes'
                  then 1
                else failure.failed_attempts + 1
              end
            ) >= 5
              then now() + interval '10 minutes'
            else null
          end;
    return jsonb_build_object('claimed', false);
  end if;

  delete from private.player_passcode_failures
  where host_profile_id = v_user_id
    and subject_profile_id = v_guest.id;

  select count(*)::int
  into v_seats
  from public.game_participants
  where profile_id = v_guest.id;

  -- Assist maps use profile ids as JSON object keys and therefore cannot rely
  -- on foreign-key cascades.
  update public.game_rounds
  set assist_recipients =
    (assist_recipients - v_guest.id::text)
    || jsonb_build_object(v_user_id::text, assist_recipients->v_guest.id::text)
  where assist_recipients ? v_guest.id::text;

  update public.game_rounds
  set assist_prestige_recipients =
    (assist_prestige_recipients - v_guest.id::text)
    || jsonb_build_object(
      v_user_id::text,
      assist_prestige_recipients->v_guest.id::text
    )
  where assist_prestige_recipients ? v_guest.id::text;

  update public.profiles
  set id = v_user_id,
      is_guest = false,
      claimed_at = now(),
      updated_at = now()
  where id = v_guest.id;

  begin
    delete from public.personal_stats_rollups where profile_id = v_user_id;
    perform private.admin_refresh_analytics(v_user_id);
    perform private.post_process_analytics(v_user_id);
    perform private.refresh_all_elo_snapshots();
  exception
    when others then
      null;
  end;

  return jsonb_build_object(
    'claimed', true,
    'guestId', v_guest.id,
    'profileId', v_user_id,
    'guestUsername', v_guest.player_name,
    'seatsTransferred', v_seats
  );
end;
$$;

create or replace function public.set_my_player_passcode(p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_passcode text := private.normalize_player_passcode(p_passcode);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id and not is_guest and deleted_at is null
  ) then
    raise exception 'Finish player profile setup first';
  end if;

  if v_passcode !~ '^[a-z0-9]{3,8}$' then
    raise exception 'Passcode must be 3 to 8 letters or numbers';
  end if;

  insert into private.player_passcodes as existing (
    profile_id,
    passcode_hash,
    updated_at
  )
  values (
    v_user_id,
    extensions.crypt(v_passcode, extensions.gen_salt('bf')),
    now()
  )
  on conflict (profile_id) do update
    set passcode_hash = excluded.passcode_hash,
        updated_at = excluded.updated_at;

  delete from private.player_add_authorizations
  where subject_profile_id = v_user_id;

  return jsonb_build_object('updated', true);
end;
$$;

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

  return jsonb_build_object('removed', true);
end;
$$;

create or replace function public.list_passcode_protected_profiles()
returns table(profile_id uuid)
language sql
security definer
set search_path = public
as $$
  select passcode.profile_id
  from private.player_passcodes as passcode
  join public.profiles as profile on profile.id = passcode.profile_id
  where auth.uid() is not null
    and profile.deleted_at is null;
$$;

drop function if exists public.verify_player_passcode(uuid, text);
drop function if exists public.verify_player_passcode(uuid, text, uuid);
create function public.verify_player_passcode(
  p_profile_id uuid,
  p_passcode text,
  p_draft_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_host_id uuid := auth.uid();
  v_hash text;
  v_passcode text := private.normalize_player_passcode(p_passcode);
  v_failure private.player_passcode_failures;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_profile_id is null or p_draft_id is null then
    raise exception 'Player and game draft are required';
  end if;

  if p_profile_id = v_host_id then
    return true;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and deleted_at is null
  ) then
    return false;
  end if;

  select failure.*
  into v_failure
  from private.player_passcode_failures as failure
  where failure.host_profile_id = v_host_id
    and failure.subject_profile_id = p_profile_id;

  if v_failure.locked_until is not null and v_failure.locked_until > now() then
    raise exception 'Too many attempts. Try again later';
  end if;

  select passcode.passcode_hash
  into v_hash
  from private.player_passcodes as passcode
  where passcode.profile_id = p_profile_id;

  if v_hash is not null
     and v_passcode <> ''
     and extensions.crypt(v_passcode, v_hash) = v_hash then
    delete from private.player_passcode_failures
    where host_profile_id = v_host_id
      and subject_profile_id = p_profile_id;

    insert into private.player_add_authorizations as existing_authorization (
      host_profile_id,
      draft_id,
      subject_profile_id,
      expires_at
    )
    values (
      v_host_id,
      p_draft_id,
      p_profile_id,
      now() + private.player_add_authorization_ttl()
    )
    on conflict (host_profile_id, draft_id, subject_profile_id) do update
      set created_at = now(),
          expires_at = now() + private.player_add_authorization_ttl();

    return true;
  end if;

  insert into private.player_passcode_failures as failure (
    host_profile_id,
    subject_profile_id,
    window_started_at,
    failed_attempts,
    locked_until
  )
  values (v_host_id, p_profile_id, now(), 1, null)
  on conflict (host_profile_id, subject_profile_id) do update
    set window_started_at = case
          when failure.window_started_at < now() - interval '10 minutes'
            then now()
          else failure.window_started_at
        end,
        failed_attempts = case
          when failure.window_started_at < now() - interval '10 minutes'
            then 1
          else failure.failed_attempts + 1
        end,
        locked_until = case
          when (
            case
              when failure.window_started_at < now() - interval '10 minutes'
                then 1
              else failure.failed_attempts + 1
            end
          ) >= 5
            then now() + interval '10 minutes'
          else null
        end;

  return false;
end;
$$;

create or replace function public.set_my_player_name(p_player_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_name text := btrim(coalesce(p_player_name, ''));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_player_name !~ '^[A-Za-z0-9_-]{3,20}$' then
    raise exception 'Username must be 3 to 20 letters, numbers, dashes or underscores';
  end if;

  if exists (
    select 1
    from public.profiles
    where id <> v_user_id
      and deleted_at is null
      and lower(btrim(player_name)) = lower(v_player_name)
  ) then
    raise exception 'That username is already used by another player or guest';
  end if;

  update public.profiles
  set player_name = v_player_name,
      display_name = null,
      updated_at = now()
  where id = v_user_id and not is_guest;

  if not found then
    raise exception 'Finish profile setup before changing your username';
  end if;

  return jsonb_build_object('playerName', v_player_name);
end;
$$;

-- Preserve the current implementation (including later analytics fixes) and
-- put the authorization check in a small, auditable public wrapper.
do $$
begin
  if to_regprocedure('private.save_completed_game_unverified(jsonb)') is null then
    if to_regprocedure('public.save_completed_game(jsonb)') is null then
      raise exception 'public.save_completed_game(jsonb) must exist before authorization is installed';
    end if;

    alter function public.save_completed_game(jsonb) set schema private;
    alter function private.save_completed_game(jsonb)
      rename to save_completed_game_unverified;
  end if;
end;
$$;

revoke all on function private.save_completed_game_unverified(jsonb)
  from public, anon, authenticated;

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

  if exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant(item)
    where nullif(participant.item->>'profile_id', '')::uuid <> v_host_id
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

revoke execute on function public.create_guest_profile(text, text, text, integer)
  from public, anon;
revoke execute on function public.claim_guest_profile(text, text)
  from public, anon;
revoke execute on function public.set_my_player_passcode(text)
  from public, anon;
revoke execute on function public.remove_my_player_passcode()
  from public, anon;
revoke execute on function public.list_passcode_protected_profiles()
  from public, anon;
revoke execute on function public.verify_player_passcode(uuid, text, uuid)
  from public, anon;
revoke execute on function public.set_my_player_name(text)
  from public, anon;
revoke execute on function public.save_completed_game(jsonb)
  from public, anon;

grant execute on function public.create_guest_profile(text, text, text, integer)
  to authenticated;
grant execute on function public.claim_guest_profile(text, text)
  to authenticated;
grant execute on function public.set_my_player_passcode(text)
  to authenticated;
grant execute on function public.remove_my_player_passcode()
  to authenticated;
grant execute on function public.list_passcode_protected_profiles()
  to authenticated;
grant execute on function public.verify_player_passcode(uuid, text, uuid)
  to authenticated;
grant execute on function public.set_my_player_name(text)
  to authenticated;
grant execute on function public.save_completed_game(jsonb)
  to authenticated;

-- Refresh cached analytics after the username-only snapshot rewrite. Run the
-- personal rebuild before ELO because it replaces the complete payload.
do $$
declare
  profile_row record;
begin
  for profile_row in
    select id from public.profiles where deleted_at is null
  loop
    perform private.admin_refresh_analytics(profile_row.id);
    perform private.post_process_analytics(profile_row.id);
  end loop;

  perform private.refresh_all_elo_snapshots();
end;
$$;
