-- Hardening pass from today's advisor sweep.
--
-- 1) Postgres grants EXECUTE on functions to PUBLIC by default, so every RPC the
--    app exposes -- including delete_my_profile and save_completed_game -- was
--    callable by the anon role. Each one requires a signed-in auth.uid()
--    internally, so anon calls only ever burned a round-trip, but logged-out
--    clients have no business invoking them at all. Lock the current surface and
--    the migration role's future public functions, then preserve signed-in and
--    service-role access for the functions newly flagged by the advisor.
--
-- 2) Three helper functions had a role-mutable search_path (linter 0011). They
--    are not security definer, but pinning costs nothing and silences a real
--    hijack vector class.
--
-- 3) client_error_reports.profile_id had no covering index (linter 0001), while
--    the four indexes reported by the unused-index advisor had never served a
--    scan. Add the FK index and remove those four requested indexes.

revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public
  revoke execute on functions from public;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.bump_user_game_draft_revision()',
    'public.can_manage_game(uuid)',
    'public.delete_my_profile()',
    'public.enforce_unique_profile_display_name()',
    'public.get_achievements(uuid)',
    'public.get_error_report_digest()',
    'public.get_game_history(uuid, integer, timestamptz, uuid, uuid)',
    'public.get_group_screen(uuid)',
    'public.get_pace_screen(uuid)',
    'public.get_player_profile_screen(uuid, uuid, uuid)',
    'public.save_completed_game(jsonb)',
    'public.search_profiles_by_player_name(text)'
  ]
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;

alter function public.bump_user_game_draft_revision() set search_path = public;
alter function public.correlation_card(text, text, text, numeric) set search_path = public;
alter function public.seat_advantage_spread(numeric[], numeric[], integer) set search_path = public;

create index if not exists client_error_reports_profile_id_idx
  on public.client_error_reports (profile_id);

drop index if exists public.profiles_deleted_at_idx;
drop index if exists public.games_group_id_idx;
drop index if exists public.games_host_profile_id_idx;
drop index if exists public.games_winner_profile_id_idx;
