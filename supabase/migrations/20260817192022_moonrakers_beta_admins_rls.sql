-- Defence in depth for private.beta_admins.
--
-- The Supabase advisor flags this table as "fully exposed to the anon and
-- authenticated roles". That is not accurate here: neither role holds a grant
-- on the table, and the schema itself is postgres=UC/postgres, so no API role
-- can reach it today. Enabling RLS closes the hole that would open if a later
-- migration ever granted usage on the private schema.
--
-- No policy is created on purpose. private.is_beta_admin is the only reader;
-- it is SECURITY DEFINER owned by postgres, which also owns the table, and the
-- table is not FORCE ROW LEVEL SECURITY, so the owner bypasses RLS and keeps
-- working. A policy naming anon or authenticated would grant exactly the
-- access this migration exists to deny.

alter table private.beta_admins enable row level security;

-- Idempotent today; both roles already hold nothing. Kept explicit so the
-- intent survives a future grant, matching moonrakers_seat_helper_revoke_anon.
revoke all on private.beta_admins from anon, authenticated;
revoke all on schema private from anon, authenticated;
