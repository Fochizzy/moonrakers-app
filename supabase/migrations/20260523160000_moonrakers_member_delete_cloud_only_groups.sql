drop policy if exists "groups_manage_own" on public.groups;

create policy "groups_insert_self_created"
on public.groups
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "groups_update_own"
on public.groups
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

create policy "groups_delete_group_members"
on public.groups
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_members
    where public.group_members.group_id = groups.id
      and public.group_members.profile_id = (select auth.uid())
  )
);
