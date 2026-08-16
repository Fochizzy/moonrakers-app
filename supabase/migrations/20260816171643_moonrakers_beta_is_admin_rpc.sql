-- PostgREST only exposes `public`, and the console needs to distinguish
-- "you are not the admin" from "the list is empty". Without this the two look
-- identical, because RLS returns zero rows either way.
create or replace function public.is_beta_admin()
returns boolean
language sql
stable
security definer
set search_path = private, auth
as $$
  select private.is_beta_admin()
$$;

revoke all on function public.is_beta_admin() from public, anon;
grant execute on function public.is_beta_admin() to authenticated;
