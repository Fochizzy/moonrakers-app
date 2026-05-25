create table public.user_game_drafts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft_id uuid not null default gen_random_uuid(),
  phase text not null check (phase in ('player_selection', 'setup', 'in_progress', 'ready_to_finish')),
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  device_updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);
alter table public.user_game_drafts enable row level security;
drop policy if exists "user_game_drafts_select_self" on public.user_game_drafts;
create policy "user_game_drafts_select_self"
on public.user_game_drafts
for select
to authenticated
using ((select auth.uid()) = profile_id);
drop policy if exists "user_game_drafts_insert_self" on public.user_game_drafts;
create policy "user_game_drafts_insert_self"
on public.user_game_drafts
for insert
to authenticated
with check ((select auth.uid()) = profile_id);
drop policy if exists "user_game_drafts_update_self" on public.user_game_drafts;
create policy "user_game_drafts_update_self"
on public.user_game_drafts
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);
drop policy if exists "user_game_drafts_delete_self" on public.user_game_drafts;
create policy "user_game_drafts_delete_self"
on public.user_game_drafts
for delete
to authenticated
using ((select auth.uid()) = profile_id);
create or replace function public.bump_user_game_draft_revision()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at = coalesce(new.updated_at, now());
    new.device_updated_at = coalesce(new.device_updated_at, now());
    new.revision = coalesce(new.revision, 0);
    return new;
  end if;

  new.updated_at = now();
  new.revision = coalesce(old.revision, 0) + 1;
  return new;
end;
$$;
drop trigger if exists user_game_drafts_bump_revision on public.user_game_drafts;
create trigger user_game_drafts_bump_revision
before insert or update on public.user_game_drafts
for each row
execute function public.bump_user_game_draft_revision();
grant select, insert, update, delete on public.user_game_drafts to authenticated;
