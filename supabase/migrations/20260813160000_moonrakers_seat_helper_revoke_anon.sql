-- 20260813150000 tried to limit the seat helper to authenticated with
--   revoke all on function ... from public;
-- That only drops the PUBLIC pseudo-role grant. Supabase's default privileges on
-- schema public also hand an explicit EXECUTE to anon and service_role, and an
-- explicit grant survives a revoke aimed at PUBLIC, so anon kept access.
--
-- No data is exposed either way (the helper is pure math over two arrays and reads
-- no tables), but the privileges should match what the previous migration claimed.
revoke all on function public.seat_advantage_spread(numeric[], numeric[], int) from anon;
