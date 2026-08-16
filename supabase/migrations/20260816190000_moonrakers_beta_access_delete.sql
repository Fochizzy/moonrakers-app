-- Let the beta operator remove a signup.
--
-- Insert is open to anon by design, so the table also collects test rows,
-- typos, and the occasional duplicate mailbox: the unique index is
-- case-insensitive but not Gmail-dot-insensitive, so `a.b@gmail.com` and
-- `ab@gmail.com` are two rows for one inbox. Until now the only way to clear
-- one was the SQL editor.
--
-- Same gate as select and update. An authenticated non-admin already sees zero
-- rows, so it can delete zero rows; this policy does not widen anything beyond
-- the addresses an admin can already read.

drop policy if exists "beta_access_requests_delete_admin" on public.beta_access_requests;
create policy "beta_access_requests_delete_admin"
  on public.beta_access_requests
  for delete
  to authenticated
  using (private.is_beta_admin());

grant delete on public.beta_access_requests to authenticated;
