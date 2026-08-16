-- Today's data audit found the exact failure 20260813190000 was built to heal,
-- but on the rollup it does not cover: a game finished at 08:14, the post-save
-- client refresh died, and while overview refreshed inline, the global
-- elo_leaderboard rollup sat stale for hours. reconcile_stale_rollup only
-- checks the viewer's personal rollup, so nothing on any read path ever
-- noticed - stale ELO for every player, indefinitely, until the next game's
-- refresh happened to succeed.
--
-- The reconcile now also compares elo_leaderboard.updated_at against the
-- newest finished game (a missing row counts as stale when finished games
-- exist) and refreshes it through the same private machinery. Any player's
-- next screen load heals the whole leaderboard.

create or replace function private.reconcile_stale_rollup(target_profile_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  rollup_games integer;
  live_games integer;
  latest_finished timestamptz;
  elo_rollup_at timestamptz;
  refreshed_personal boolean := false;
  refreshed_elo boolean := false;
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
  if rollup_games is null or rollup_games <> coalesce(live_games, 0) then
    perform private.admin_refresh_analytics(target_profile_id);
    refreshed_personal := true;
  end if;

  select max(public.games.finished_at)
  into latest_finished
  from public.games
  where public.games.status = 'finished';

  select public.global_stats_rollups.updated_at
  into elo_rollup_at
  from public.global_stats_rollups
  where public.global_stats_rollups.key = 'elo_leaderboard';

  if latest_finished is not null
    and (elo_rollup_at is null or elo_rollup_at < latest_finished) then
    perform private.refresh_elo_rollups();
    refreshed_elo := true;
  end if;

  return jsonb_build_object(
    'refreshed', refreshed_personal,
    'refreshedElo', refreshed_elo,
    'rollupGames', rollup_games,
    'liveGames', live_games
  );
end;
$$;

revoke all on function private.reconcile_stale_rollup(uuid) from public;
revoke all on function private.reconcile_stale_rollup(uuid) from anon;
revoke all on function private.reconcile_stale_rollup(uuid) from authenticated;
