create index if not exists game_participants_profile_id_idx
on public.game_participants (profile_id);
create index if not exists game_rounds_participant_id_idx
on public.game_rounds (participant_id);
create index if not exists games_group_id_idx
on public.games (group_id);
create index if not exists games_host_profile_id_idx
on public.games (host_profile_id);
create index if not exists games_winner_profile_id_idx
on public.games (winner_profile_id);
create index if not exists group_members_profile_id_idx
on public.group_members (profile_id);
create index if not exists groups_created_by_idx
on public.groups (created_by);
drop policy if exists "group_members_manage_owned_groups" on public.group_members;
create policy "group_members_insert_owned_groups"
on public.group_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.groups
    where public.groups.id = group_members.group_id
      and public.groups.created_by = (select auth.uid())
  )
);
create policy "group_members_update_owned_groups"
on public.group_members
for update
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
create policy "group_members_delete_owned_groups"
on public.group_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.groups
    where public.groups.id = group_members.group_id
      and public.groups.created_by = (select auth.uid())
  )
);
