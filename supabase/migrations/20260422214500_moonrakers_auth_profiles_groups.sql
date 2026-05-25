create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text unique not null,
  display_name text,
  favorite_color text,
  assigned_card_art_index int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  position int,
  primary key (group_id, profile_id)
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "groups_manage_own"
on public.groups
for all
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

create policy "group_members_select_authenticated"
on public.group_members
for select
to authenticated
using (true);

create policy "group_members_manage_owned_groups"
on public.group_members
for all
to authenticated
using (
  exists (
    select 1
    from public.groups
    where public.groups.id = group_members.group_id
      and public.groups.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.groups
    where public.groups.id = group_members.group_id
      and public.groups.created_by = (select auth.uid())
  )
);

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
  where length(trim(coalesce(query, ''))) > 0
    and profiles.player_name ilike trim(query) || '%'
  order by
    case when lower(profiles.player_name) = lower(trim(query)) then 0 else 1 end,
    profiles.player_name asc
  limit 10
$$;

grant execute on function public.search_profiles_by_player_name(text) to authenticated;;
