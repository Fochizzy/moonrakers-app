
-- Fix #2: Corey's missing rollup + all stale rollups (backfill at end of this migration).
-- Fix #3: topSignals computed from real per-profile stats, wired into insightsScreen + statsScreen.
-- Fix #5: daysSinceLastGame added to analyticsHome payload and cards.
-- Fix #6: group_stats_rollups refreshed for ALL groups with finished games on every rollup write.
--
-- Architecture:
--   private.admin_refresh_analytics  — core logic, no auth check, SECURITY DEFINER
--   private.refresh_server_authored_analytics — auth check then delegates to admin
--   private.trigger_refresh_participant_rollup — AFTER INSERT trigger calls admin directly

-- ─── 1. Core refresh function ─────────────────────────────────────────────────
create or replace function private.admin_refresh_analytics(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_at timestamptz := now();
  registered_player_count integer := 0;
  finished_game_count integer := 0;
  player_row_count integer := 0;
  -- top-signals inputs
  signal_win_count integer := 0;
  signal_avg_assists numeric := 0;
  signal_avg_failures numeric := 0;
  signal_contract_conversion numeric := 0;
  signal_win_rate numeric := 0;
  top_signals jsonb := '[]'::jsonb;
  days_since_last_game integer := null;
  -- existing analytics vars
  base_chart_points jsonb := '[]'::jsonb;
  base_chart_data jsonb := '{}'::jsonb;
  chart_rollups jsonb := '{}'::jsonb;
  player_options jsonb := '[]'::jsonb;
  player_detail jsonb := '{}'::jsonb;
  analytics_payload jsonb;
  target_player_name text := null;
  target_display_name text := null;
begin
  -- No auth check — this function is called by trusted internal paths only.
  -- public.refresh_server_authored_analytics validates auth before calling here.

  select public.profiles.player_name, nullif(public.profiles.display_name, '')
  into target_player_name, target_display_name
  from public.profiles where public.profiles.id = target_profile_id;

  select count(*) into registered_player_count from public.profiles;

  select count(distinct public.game_participants.game_id)
  into finished_game_count
  from public.game_participants
  join public.games on public.games.id = public.game_participants.game_id
  where public.game_participants.profile_id = target_profile_id
    and public.games.status = 'finished';

  select count(*)
  into player_row_count
  from public.game_participants
  where public.game_participants.profile_id = target_profile_id;

  -- Days since most recent finished game (global clock, not per-profile)
  select (extract(epoch from (now() - max(coalesce(public.games.finished_at, public.games.created_at)))) / 86400)::int
  into days_since_last_game
  from public.games where public.games.status = 'finished';

  -- Per-profile stats for top-signals computation
  select
    count(public.game_participants.id) filter (where public.game_participants.is_winner)::int,
    coalesce(avg(public.game_participants.assists), 0)::numeric,
    coalesce(avg(public.game_participants.failures), 0)::numeric,
    coalesce(
      sum(public.game_participants.contracts)::numeric
        / nullif(sum(public.game_participants.contracts + public.game_participants.failures), 0),
      0
    )::numeric
  into signal_win_count, signal_avg_assists, signal_avg_failures, signal_contract_conversion
  from public.game_participants
  join public.games on public.games.id = public.game_participants.game_id
  where public.game_participants.profile_id = target_profile_id
    and public.games.status = 'finished';

  signal_win_rate := case
    when finished_game_count > 0 then signal_win_count::numeric / finished_game_count::numeric
    else 0::numeric
  end;

  -- Signals fire when the player has enough games to be statistically meaningful.
  if finished_game_count >= 3 then
    if signal_win_rate >= 0.60 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'dominant-win-rate', 'label', 'Dominant win conversion',
        'value', concat(round(signal_win_rate * 100)::text, '% win rate'), 'tone', 'green'
      ));
    elsif signal_win_rate <= 0.25 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'low-win-rate', 'label', 'Low win conversion',
        'value', concat(round(signal_win_rate * 100)::text, '% win rate'), 'tone', 'danger'
      ));
    end if;

    if signal_avg_assists >= 1.5 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'high-assists', 'label', 'High assist volume',
        'value', concat(round(signal_avg_assists, 1)::text, ' assists/game'), 'tone', 'blue'
      ));
    end if;

    if signal_avg_failures >= 1.2 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'elevated-failures', 'label', 'Elevated failure rate',
        'value', concat(round(signal_avg_failures, 1)::text, ' failures/game'), 'tone', 'danger'
      ));
    end if;

    if signal_contract_conversion >= 0.80 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'strong-contracts', 'label', 'Strong contract execution',
        'value', concat(round(signal_contract_conversion * 100)::text, '% conversion'), 'tone', 'green'
      ));
    end if;

    -- Support-heavy + low conversion: a compound pattern worth naming explicitly.
    if signal_avg_assists >= 1.2 and signal_win_rate < 0.40 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'support-low-conversion', 'label', 'Support-heavy, low conversion',
        'value', concat(round(signal_avg_assists, 1)::text, ' assists, ', round(signal_win_rate * 100)::text, '% wins'),
        'tone', 'accent'
      ));
    end if;
  end if;

  if finished_game_count > 0 then
    base_chart_points := jsonb_build_array(
      jsonb_build_object('x', 1, 'y', finished_game_count, 'label', 'Tracked games')
    );
  end if;

  player_options := jsonb_build_array(jsonb_build_object(
    'id', target_profile_id,
    'label', coalesce(target_display_name, target_player_name, 'Current player'),
    'playerName', target_player_name,
    'displayName', target_display_name
  ));

  player_detail := jsonb_build_object(
    'playerId', target_profile_id,
    'label', coalesce(target_display_name, target_player_name, 'Current player'),
    'summary', case
      when finished_game_count > 0 then 'Server-authored player detail is available for this profile.'
      else 'No finished games are available for this player yet.'
    end,
    'stats', jsonb_build_object('games', finished_game_count, 'playerRows', player_row_count)
  );

  base_chart_data := jsonb_build_object(
    'points', base_chart_points,
    'series', case when jsonb_array_length(base_chart_points) > 0
      then jsonb_build_array(jsonb_build_object('key', 'tracked-games', 'label', 'Tracked games', 'points', base_chart_points))
      else '[]'::jsonb end,
    'meta', jsonb_build_object('hasData', jsonb_array_length(base_chart_points) > 0, 'pointCount', jsonb_array_length(base_chart_points))
  );

  chart_rollups := jsonb_build_object(
    'default', jsonb_build_object('chartKey', 'default', 'generatedAt', generated_at, 'title', 'Analytics chart',
      'subtitle', 'Server-authored placeholder dataset.',
      'emptyState', jsonb_build_object('title', 'No chart data yet', 'description', 'Finish at least one tracked game to populate this chart.'),
      'data', base_chart_data),
    'elo', jsonb_build_object('chartKey', 'elo', 'generatedAt', generated_at, 'title', 'Elo trend',
      'subtitle', 'Server-authored placeholder dataset for Elo.',
      'emptyState', jsonb_build_object('title', 'No Elo history yet', 'description', 'Finish at least one tracked game to populate Elo history.'),
      'data', jsonb_build_object('games', '[]'::jsonb, 'players', '[]'::jsonb)),
    'prestige', jsonb_build_object('chartKey', 'prestige', 'generatedAt', generated_at, 'title', 'Prestige totals',
      'subtitle', 'Server-authored placeholder dataset for prestige.',
      'emptyState', jsonb_build_object('title', 'No prestige totals yet', 'description', 'Finish at least one tracked game to populate prestige totals.'),
      'data', base_chart_data),
    'assists', jsonb_build_object('chartKey', 'assists', 'generatedAt', generated_at, 'title', 'Assist volume',
      'subtitle', 'Server-authored placeholder dataset for assists.',
      'emptyState', jsonb_build_object('title', 'No assist history yet', 'description', 'Finish at least one tracked game to populate assist history.'),
      'data', base_chart_data),
    'radar', jsonb_build_object('chartKey', 'radar', 'generatedAt', generated_at, 'title', 'Radar comparison',
      'subtitle', 'Server-authored placeholder dataset for radar comparisons.',
      'emptyState', jsonb_build_object('title', 'No radar comparison yet', 'description', 'Finish at least one tracked game to populate radar comparisons.'),
      'data', jsonb_build_object('primary', null, 'comparison', null, 'labels', '[]'::jsonb)),
    'relationship_graph', jsonb_build_object('chartKey', 'relationship_graph', 'generatedAt', generated_at, 'title', 'Relationship graph',
      'subtitle', 'Server-authored placeholder dataset for player relationships.',
      'emptyState', jsonb_build_object('title', 'No relationship graph yet', 'description', 'Finish at least one tracked game to populate relationship links.'),
      'data', jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'exactScopePlayerIds', '[]'::jsonb, 'mode', 'network')),
    'line_chart', jsonb_build_object('chartKey', 'line_chart', 'generatedAt', generated_at, 'title', 'Line chart',
      'subtitle', 'Server-authored placeholder dataset for line charts.',
      'emptyState', jsonb_build_object('title', 'No line chart yet', 'description', 'Finish at least one tracked game to populate line-chart history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'line', jsonb_build_object('chartKey', 'line', 'generatedAt', generated_at, 'title', 'Line chart',
      'subtitle', 'Server-authored placeholder dataset for line charts.',
      'emptyState', jsonb_build_object('title', 'No line chart yet', 'description', 'Finish at least one tracked game to populate line-chart history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'multi_line_chart', jsonb_build_object('chartKey', 'multi_line_chart', 'generatedAt', generated_at, 'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object('title', 'No multi-line chart yet', 'description', 'Finish at least one tracked game to populate multi-line history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'multi-line-chart', jsonb_build_object('chartKey', 'multi-line-chart', 'generatedAt', generated_at, 'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object('title', 'No multi-line chart yet', 'description', 'Finish at least one tracked game to populate multi-line history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'multi-line', jsonb_build_object('chartKey', 'multi-line', 'generatedAt', generated_at, 'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object('title', 'No multi-line chart yet', 'description', 'Finish at least one tracked game to populate multi-line history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'prestige_over_time', jsonb_build_object('chartKey', 'prestige_over_time', 'generatedAt', generated_at, 'title', 'Prestige over time',
      'subtitle', 'Server-authored placeholder dataset for prestige-over-time charts.',
      'emptyState', jsonb_build_object('title', 'No prestige-over-time chart yet', 'description', 'Finish at least one tracked game to populate prestige-over-time history.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb, 'mode', 'raw')),
    'bar_chart', jsonb_build_object('chartKey', 'bar_chart', 'generatedAt', generated_at, 'title', 'Bar chart',
      'subtitle', 'Server-authored placeholder dataset for bar charts.',
      'emptyState', jsonb_build_object('title', 'No bar chart yet', 'description', 'Finish at least one tracked game to populate bar-chart comparisons.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'scopedPlayerIds', '[]'::jsonb)),
    'bar', jsonb_build_object('chartKey', 'bar', 'generatedAt', generated_at, 'title', 'Bar chart',
      'subtitle', 'Server-authored placeholder dataset for bar charts.',
      'emptyState', jsonb_build_object('title', 'No bar chart yet', 'description', 'Finish at least one tracked game to populate bar-chart comparisons.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'scopedPlayerIds', '[]'::jsonb)),
    'bump_chart', jsonb_build_object('chartKey', 'bump_chart', 'generatedAt', generated_at, 'title', 'Bump chart',
      'subtitle', 'Server-authored placeholder dataset for bump charts.',
      'emptyState', jsonb_build_object('title', 'No bump chart yet', 'description', 'Finish at least one tracked game to populate bump-chart rankings.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb)),
    'consistency_band', jsonb_build_object('chartKey', 'consistency_band', 'generatedAt', generated_at, 'title', 'Consistency band',
      'subtitle', 'Server-authored placeholder dataset for consistency bands.',
      'emptyState', jsonb_build_object('title', 'No consistency band yet', 'description', 'Finish at least one tracked game to populate consistency-band trends.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb)),
    'heatmap', jsonb_build_object('chartKey', 'heatmap', 'generatedAt', generated_at, 'title', 'Heatmap',
      'subtitle', 'Server-authored placeholder dataset for heatmaps.',
      'emptyState', jsonb_build_object('title', 'No heatmap yet', 'description', 'Finish at least one tracked game to populate heatmap data.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'scopedPlayerIds', '[]'::jsonb)),
    'efficiency_failure_scatter', jsonb_build_object('chartKey', 'efficiency_failure_scatter', 'generatedAt', generated_at, 'title', 'Efficiency scatter',
      'subtitle', 'Server-authored placeholder dataset for efficiency-versus-failure scatter plots.',
      'emptyState', jsonb_build_object('title', 'No efficiency scatter yet', 'description', 'Finish at least one tracked game to populate efficiency scatter data.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'players', '[]'::jsonb, 'scopedPlayerIds', '[]'::jsonb)),
    'replay_chart', jsonb_build_object('chartKey', 'replay_chart', 'generatedAt', generated_at, 'title', 'Replay chart',
      'subtitle', 'Server-authored placeholder dataset for replay charts.',
      'emptyState', jsonb_build_object('title', 'No replay chart yet', 'description', 'Finish at least one tracked game to populate replay timelines.'),
      'data', jsonb_build_object('replay', '[]'::jsonb, 'players', '[]'::jsonb, 'statKey', 'totalPrestige', 'selectedGameId', null)),
    'rivalry_graph', jsonb_build_object('chartKey', 'rivalry_graph', 'generatedAt', generated_at, 'title', 'Rivalry graph',
      'subtitle', 'Server-authored placeholder dataset for rivalry graphs.',
      'emptyState', jsonb_build_object('title', 'No rivalry graph yet', 'description', 'Finish at least one tracked game to populate rivalry data.'),
      'data', jsonb_build_object('games', '[]'::jsonb, 'players', '[]'::jsonb, 'playerId', null)),
    'head_to_head', jsonb_build_object('chartKey', 'head_to_head', 'generatedAt', generated_at, 'title', 'Head-to-head',
      'subtitle', 'Server-authored placeholder dataset for head-to-head comparisons.',
      'emptyState', jsonb_build_object('title', 'No head-to-head data yet', 'description', 'Finish at least one tracked game to populate head-to-head comparisons.'),
      'data', jsonb_build_object('games', '[]'::jsonb, 'players', '[]'::jsonb, 'playerId', null, 'compareId', null)),
    'sparkline', jsonb_build_object('chartKey', 'sparkline', 'generatedAt', generated_at, 'title', 'Sparkline',
      'subtitle', 'Server-authored placeholder dataset for sparkline summaries.',
      'emptyState', jsonb_build_object('title', 'No sparkline data yet', 'description', 'Finish at least one tracked game to populate sparkline summaries.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'comparisonData', '[]'::jsonb, 'metricKey', 'totalPrestige', 'primaryLabel', null, 'comparisonLabel', null)),
    'stacked_bar_chart', jsonb_build_object('chartKey', 'stacked_bar_chart', 'generatedAt', generated_at, 'title', 'Stacked bar chart',
      'subtitle', 'Server-authored placeholder dataset for stacked bar charts.',
      'emptyState', jsonb_build_object('title', 'No stacked bar chart yet', 'description', 'Finish at least one tracked game to populate stacked-bar comparisons.'),
      'data', jsonb_build_object('data', '[]'::jsonb, 'metricDataMap', '{}'::jsonb, 'metricOptions', '[]'::jsonb, 'activeMetricKey', 'totalPrestige', 'selectedPlayerIds', '[]'::jsonb)),
    'compare', jsonb_build_object('chartKey', 'compare', 'generatedAt', generated_at, 'title', 'Compare players',
      'subtitle', 'Server-authored placeholder dataset for compare views.',
      'emptyState', jsonb_build_object('title', 'No compare data yet', 'description', 'Finish at least one tracked game to populate player comparisons.'),
      'data', jsonb_build_object('focusPlayerId', null, 'comparePlayerId', null, 'scopedPlayerIds', '[]'::jsonb, 'rows', '[]'::jsonb))
  );

  analytics_payload := jsonb_build_object(
    'generatedAt', generated_at,
    'analyticsHome', jsonb_build_object(
      'generatedAt', generated_at,
      'daysSinceLastGame', days_since_last_game,
      'hero', jsonb_build_object('players', registered_player_count, 'games', finished_game_count, 'views', player_row_count),
      'cards', jsonb_build_array(
        jsonb_build_object('key', 'registered-players', 'title', 'Registered players', 'value', registered_player_count,
          'description', 'Players currently available to analytics.'),
        jsonb_build_object('key', 'tracked-games', 'title', 'Tracked games', 'value', finished_game_count,
          'description', 'Finished games involving this profile.'),
        jsonb_build_object('key', 'player-rows', 'title', 'Player rows', 'value', player_row_count,
          'description', 'Saved participant rows available to summarize.'),
        jsonb_build_object('key', 'days-since-last-game', 'title', 'Days since last game',
          'value', coalesce(days_since_last_game::text, '–'),
          'description', 'Calendar days since the most recent finished game.')
      )
    ),
    'statsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'overview', jsonb_build_object(
        'hero', jsonb_build_object(
          'title', 'Stats overview',
          'takeaway', case
            when finished_game_count > 0 then 'Server-authored stats are available for this profile.'
            else 'No finished games are available for this profile yet.'
          end,
          'games', finished_game_count, 'players', registered_player_count
        ),
        'cards', jsonb_build_array(
          jsonb_build_object('key', 'games-played', 'title', 'Games played', 'value', finished_game_count),
          jsonb_build_object('key', 'players-seen', 'title', 'Players in network', 'value', registered_player_count)
        ),
        'topSignals', top_signals
      ),
      'players', jsonb_build_object('options', player_options, 'selectedPlayerId', target_profile_id, 'detail', player_detail),
      'playstyle', jsonb_build_object(
        'summary', case
          when finished_game_count > 0 then 'More player-specific playstyle rollups can be layered onto this payload.'
          else 'Finish at least one tracked game to populate player-specific playstyle insights.'
        end,
        'highlights', '[]'::jsonb
      ),
      'correlations', jsonb_build_object('summary', 'No correlations are available yet.', 'items', '[]'::jsonb, 'selectedKey', null),
      'games', jsonb_build_object('items', '[]'::jsonb, 'selectedGameId', null, 'detail', null)
    ),
    'insightsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'meta', jsonb_build_object('games', finished_game_count, 'playerRows', player_row_count),
      'topSignals', top_signals,
      'assistNetwork', jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb),
      'correlations', jsonb_build_object('summary', 'No insight correlations are available yet.', 'items', '[]'::jsonb, 'selectedKey', null)
    ),
    'charts', chart_rollups
  );

  -- Write personal stats rollup
  insert into public.personal_stats_rollups (profile_id, payload, updated_at)
  values (target_profile_id, analytics_payload, generated_at)
  on conflict (profile_id) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;

  -- Refresh global stats rollup
  insert into public.global_stats_rollups (key, payload, updated_at)
  values (
    'overview',
    jsonb_build_object(
      'gamesPlayed', (select count(*) from public.games where public.games.status = 'finished'),
      'playersRegistered', (select count(*) from public.profiles),
      'lastGameId', (
        select public.games.id from public.games
        where public.games.status = 'finished'
        order by public.games.created_at desc, public.games.id desc
        limit 1
      )
    ),
    now()
  )
  on conflict (key) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;

  -- Refresh group stats rollups for all groups with at least one finished game.
  -- This runs on every profile refresh and is idempotent, ensuring no group is ever missing.
  insert into public.group_stats_rollups (group_id, payload, updated_at)
  select
    g.id,
    jsonb_build_object(
      'groupId', g.id,
      'name', g.name,
      'gamesPlayed', coalesce(gc.game_count, 0),
      'lastGameId', gc.last_game_id,
      'memberCount', coalesce(mc.member_count, 0)
    ),
    now()
  from public.groups as g
  left join lateral (
    select
      count(*)::int as game_count,
      (array_agg(games.id order by games.created_at desc, games.id desc))[1] as last_game_id
    from public.games as games
    where games.group_id = g.id and games.status = 'finished'
  ) as gc on true
  left join lateral (
    select count(*)::int as member_count
    from public.group_members as gm
    where gm.group_id = g.id
  ) as mc on true
  where coalesce(gc.game_count, 0) > 0
  on conflict (group_id) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;

  return jsonb_build_object('refreshed', true, 'profileId', target_profile_id, 'generatedAt', generated_at);
end;
$$;

-- ─── 2. Auth-gated public-facing wrapper ─────────────────────────────────────
create or replace function private.refresh_server_authored_analytics(target_profile_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;
  return private.admin_refresh_analytics(target_profile_id);
end;
$$;

-- ─── 3. Trigger function ─────────────────────────────────────────────────────
create or replace function private.trigger_refresh_participant_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only refresh when the participant row is linked to a registered profile.
  -- Guest rows (profile_id is null) don't have personal rollups.
  if new.profile_id is not null then
    perform private.admin_refresh_analytics(new.profile_id);
  end if;
  return new;
end;
$$;

-- ─── 4. Trigger on game_participants ─────────────────────────────────────────
drop trigger if exists game_participants_auto_refresh_rollup on public.game_participants;
create trigger game_participants_auto_refresh_rollup
  after insert on public.game_participants
  for each row
  execute function private.trigger_refresh_participant_rollup();

-- ─── 5. Backfill: create Corey's missing rollup + freshen all stale rollups ──
do $$
declare
  p record;
begin
  for p in
    select id from public.profiles where deleted_at is null order by created_at asc
  loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;
;
