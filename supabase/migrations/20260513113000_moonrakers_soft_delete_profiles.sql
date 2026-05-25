alter table public.profiles
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at);

alter table public.games
  alter column host_profile_id drop not null;

alter table public.games
  drop constraint if exists games_host_profile_id_fkey;

alter table public.games
  add constraint games_host_profile_id_fkey
  foreign key (host_profile_id)
  references public.profiles(id)
  on delete set null;

create or replace function public.search_profiles_by_player_name(query text)
returns table (
  id uuid,
  player_name text,
  display_name text,
  favorite_color text,
  assigned_card_art_index int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.player_name,
    profiles.display_name,
    profiles.favorite_color,
    profiles.assigned_card_art_index
  from public.profiles
  where profiles.deleted_at is null
    and length(trim(coalesce(query, ''))) > 0
    and profiles.player_name ilike trim(query) || '%'
  order by
    case when lower(profiles.player_name) = lower(trim(query)) then 0 else 1 end,
    profiles.player_name asc
  limit 10
$$;

create or replace function public.delete_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := (select auth.uid());
  replacement_name constant text := 'Mx. Doe';
begin
  if current_profile_id is null then
    raise exception 'authenticated profile required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where public.profiles.id = current_profile_id
      and public.profiles.deleted_at is null
  ) then
    raise exception 'active profile not found';
  end if;

  delete from public.group_members
  where public.group_members.profile_id = current_profile_id;

  delete from public.groups
  where public.groups.created_by = current_profile_id;

  update public.game_participants
  set
    profile_id = null,
    player_name_snapshot = replacement_name,
    display_name_snapshot = replacement_name,
    color_snapshot = null,
    assigned_card_art_index_snapshot = null
  where public.game_participants.profile_id = current_profile_id;

  update public.games
  set winner_profile_id = null
  where public.games.winner_profile_id = current_profile_id;

  update public.games
  set host_profile_id = null
  where public.games.host_profile_id = current_profile_id;

  update public.profiles
  set
    player_name = concat('deleted-', replace(current_profile_id::text, '-', '')),
    display_name = replacement_name,
    favorite_color = null,
    assigned_card_art_index = null,
    deleted_at = now(),
    updated_at = now()
  where public.profiles.id = current_profile_id;

  delete from auth.users
  where auth.users.id = current_profile_id;

  return jsonb_build_object(
    'status', 'ok',
    'replacement_name', replacement_name,
    'deleted_auth_user_id', current_profile_id
  );
end;
$$;

grant execute on function public.delete_my_profile() to authenticated;
