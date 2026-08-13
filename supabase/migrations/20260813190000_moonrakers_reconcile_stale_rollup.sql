-- Self-heal for personal_stats_rollups.
--
-- save_completed_game deliberately suppresses the per-participant rollup trigger
-- (app.skip_rollup_trigger) so finishing a game does not block on a full analytics
-- rebuild -- that was the finish-game timeout this design exists to avoid. The
-- rebuild instead happens client-side afterwards, via
-- refresh_completed_game_participant_rollup.
--
-- That client call is best-effort: refreshFinishedGameCloudState is wrapped in a
-- catch that reports "Game saved with refresh pending" and never retries. So any
-- transient failure -- dropped connection, app killed mid-save, timeout -- strands
-- the rollup permanently. Observed live: the rollup sat 2 finished games behind,
-- which is what made the Home leaderboard read stale game counts.
--
-- This gives the app a cheap way to notice and repair that later. It compares the
-- rollup's recorded finished-game count against the live count and only does the
-- expensive rebuild when they actually disagree, so calling it on a warm rollup
-- costs one count query.
--
-- Callers can only reconcile themselves; there is no target parameter.
create or replace function private.reconcile_stale_rollup(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rollup_games integer;
  live_games integer;
begin
  if target_profile_id is null then
    raise exception 'target_profile_id is required';
  end if;

  select nullif(
    public.personal_stats_rollups.payload
      ->'statsScreen'->'players'->'detail'->'stats'->>'games',
    ''
  )::int
  into rollup_games
  from public.personal_stats_rollups
  where public.personal_stats_rollups.profile_id = target_profile_id;

  select count(distinct public.games.id)::int
  into live_games
  from public.game_participants
  join public.games
    on public.games.id = public.game_participants.game_id
  where public.game_participants.profile_id = target_profile_id
    and public.games.status = 'finished';

  -- A missing rollup counts as stale: the player has finished games but no payload.
  if rollup_games is not null and rollup_games = coalesce(live_games, 0) then
    return jsonb_build_object(
      'refreshed', false,
      'rollupGames', rollup_games,
      'liveGames', live_games
    );
  end if;

  perform private.admin_refresh_analytics(target_profile_id);

  return jsonb_build_object(
    'refreshed', true,
    'rollupGames', rollup_games,
    'liveGames', live_games
  );
end;
$$;

revoke all on function private.reconcile_stale_rollup(uuid) from public;
revoke all on function private.reconcile_stale_rollup(uuid) from anon;
revoke all on function private.reconcile_stale_rollup(uuid) from authenticated;

-- Public wrapper: no parameter, so a caller can only ever reconcile themselves.
--
-- security definer, matching refresh_completed_game_participant_rollup and
-- refresh_elo_rollups. It is required, not stylistic: authenticated has no USAGE on
-- schema private, so a security invoker wrapper would fail with
-- "permission denied for schema private" for every caller. auth.uid() still reads
-- the caller's JWT claim under definer rights, so the self-only guard holds.
create or replace function public.reconcile_stale_rollup()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  viewer_profile_id uuid := (select auth.uid());
begin
  if viewer_profile_id is null then
    raise exception 'authenticated profile is required';
  end if;

  return private.reconcile_stale_rollup(viewer_profile_id);
end;
$$;

revoke all on function public.reconcile_stale_rollup() from public;
revoke all on function public.reconcile_stale_rollup() from anon;
grant execute on function public.reconcile_stale_rollup() to authenticated;
