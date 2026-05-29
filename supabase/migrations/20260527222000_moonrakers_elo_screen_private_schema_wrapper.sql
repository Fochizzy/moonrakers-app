-- Repairs linked projects where get_elo_screen still runs as SECURITY INVOKER
-- while calling private.elo_expected_score_multi(...), which causes
-- "permission denied for schema private" for authenticated app traffic.

alter function public.get_elo_screen(uuid, uuid, uuid, text) security definer;
alter function public.get_elo_screen(uuid, uuid, uuid, text) set search_path = '';

revoke all on function public.get_elo_screen(uuid, uuid, uuid, text) from public;
revoke all on function public.get_elo_screen(uuid, uuid, uuid, text) from anon;
grant execute on function public.get_elo_screen(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.get_elo_screen(uuid, uuid, uuid, text) to service_role;
