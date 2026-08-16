-- Let the beta admin read the signup list and record who has been invited.
--
-- The list is personal data, so the gate lives in RLS rather than only in the
-- route handler: even holding the publishable key and a valid session, a
-- non-admin selects zero rows. The web app never needs a service-role key to
-- run the admin console.

create table if not exists private.beta_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into private.beta_admins (email)
values ('izzy.hodnett@gmail.com')
on conflict (email) do nothing;

-- Kept as a function so the policies below stay readable and the allowlist can
-- change with an insert instead of a migration.
create or replace function private.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = private, auth
as $$
  select exists (
    select 1
    from private.beta_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

grant execute on function private.is_beta_admin() to authenticated;

-- When the invite was last sent, so the console can show "sent" and offer a
-- resend rather than leaving the operator guessing.
alter table public.beta_access_requests
  add column if not exists invited_at timestamptz;

drop policy if exists "beta_access_requests_select_admin" on public.beta_access_requests;
create policy "beta_access_requests_select_admin"
  on public.beta_access_requests
  for select
  to authenticated
  using (private.is_beta_admin());

drop policy if exists "beta_access_requests_update_admin" on public.beta_access_requests;
create policy "beta_access_requests_update_admin"
  on public.beta_access_requests
  for update
  to authenticated
  using (private.is_beta_admin())
  with check (private.is_beta_admin());

grant select, update on public.beta_access_requests to authenticated;
