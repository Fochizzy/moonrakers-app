
-- Fix #1: Head-to-head W/L records (insightsScreen.rivalries)
-- Fix #2: Win/loss streaks — current + longest ever (statsScreen.overview.streaks + topSignals)
-- Fix #3: Start-order position stats (statsScreen.overview.positionStats)
-- Fix #4: Early vs late game pace profile (statsScreen.paceProfile)
-- Fix #5: Objective / assist / failure correlations with wins (statsScreen.correlations, insightsScreen.correlations)
-- Fix #6: Per-game history list (statsScreen.games.items)

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
  -- top-signals inputs (existing)
  signal_win_count integer := 0;
  signal_avg_assists numeric := 0;
  signal_avg_failures numeric := 0;
  signal_contract_conversion numeric := 0;
  signal_win_rate numeric := 0;
  top_signals jsonb := '[]'::jsonb;
  days_since_last_game integer := null;
  -- #2 streaks
  streak_longest_win integer := 0;
  streak_longest_loss integer := 0;
  streak_current_is_win boolean := false;
  streak_current_len integer := 0;
  -- #1 head-to-head
  head_to_head jsonb := '[]'::jsonb;
  -- #3 position stats
  position_stats jsonb := '[]'::jsonb;
  -- #4 pace profile
  pace_avg_first_half numeric := 0;
  pace_avg_second_half numeric := 0;
  pace_avg_late_delta numeric := 0;
  pace_avg_first_half_win numeric := 0;
  pace_avg_first_half_lose numeric := 0;
  -- #5 correlations
  corr_avg_obj_win numeric := 0;
  corr_avg_obj_lose numeric := 0;
  corr_avg_assists_win numeric := 0;
  corr_avg_assists_lose numeric := 0;
  corr_avg_failures_win numeric := 0;
  corr_avg_failures_lose numeric := 0;
  correlations_items jsonb := '[]'::jsonb;
  -- #6 game history
  game_history jsonb := '[]'::jsonb;
  -- existing chart / player vars
  base_chart_points jsonb := '[]'::jsonb;
  base_chart_data jsonb := '{}'::jsonb;
  chart_rollups jsonb := '{}'::jsonb;
  player_options jsonb := '[]'::jsonb;
  player_detail jsonb := '{}'::jsonb;
  analytics_payload jsonb;
  target_player_name text := null;
  target_display_name text := null;
begin
  -- No auth check — called only by trusted internal paths.

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

  select count(*) into player_row_count
  from public.game_participants where public.game_participants.profile_id = target_profile_id;

  select (extract(epoch from (now() - max(coalesce(public.games.finished_at, public.games.created_at)))) / 86400)::int
  into days_since_last_game
  from public.games where public.games.status = 'finished';

  -- Per-profile stats for top signals
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

  -- ── #2 STREAKS ─────────────────────────────────────────────────────────────
  -- Uses the island-grouping technique: the difference between two row_number()
  -- windows isolates each unbroken run of consecutive W or L results.
  select
    coalesce(max(streak_len) filter (where is_winner), 0)::int,
    coalesce(max(streak_len) filter (where not is_winner), 0)::int,
    coalesce((array_agg(is_winner order by last_rn desc))[1], false),
    coalesce((array_agg(streak_len order by last_rn desc))[1], 0)::int
  into streak_longest_win, streak_longest_loss, streak_current_is_win, streak_current_len
  from (
    select
      is_winner,
      count(*)::int as streak_len,
      max(rn) as last_rn
    from (
      select
        gp.is_winner,
        row_number() over (order by g.created_at asc, g.id asc) as rn,
        row_number() over (order by g.created_at asc, g.id asc)
          - row_number() over (partition by gp.is_winner order by g.created_at asc, g.id asc) as grp
      from public.game_participants as gp
      join public.games as g on g.id = gp.game_id and g.status = 'finished'
      where gp.profile_id = target_profile_id
    ) as tagged
    group by is_winner, grp
  ) as streaks;

  -- Top signals (fire at >= 3 games; streak signals added here)
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

    if signal_avg_assists >= 1.2 and signal_win_rate < 0.40 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object(
        'key', 'support-low-conversion', 'label', 'Support-heavy, low conversion',
        'value', concat(round(signal_avg_assists, 1)::text, ' assists, ', round(signal_win_rate * 100)::text, '% wins'),
        'tone', 'accent'
      ));
    end if;

    -- Streak signal: fires when the current streak is 3 or longer
    if streak_current_len >= 3 then
      if streak_current_is_win then
        top_signals := top_signals || jsonb_build_array(jsonb_build_object(
          'key', 'win-streak',
          'label', concat(streak_current_len::text, '-game win streak'),
          'value', concat('W×', streak_current_len::text), 'tone', 'green'
        ));
      else
        top_signals := top_signals || jsonb_build_array(jsonb_build_object(
          'key', 'loss-streak',
          'label', concat(streak_current_len::text, '-game losing streak'),
          'value', concat('L×', streak_current_len::text), 'tone', 'danger'
        ));
      end if;
    end if;
  end if;

  -- ── #1 HEAD-TO-HEAD ────────────────────────────────────────────────────────
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'opponentId', opponent_id,
      'opponentName', opponent_name,
      'gamesTogether', games_together,
      'wins', wins,
      'losses', losses,
      'draws', games_together - wins - losses
    ) order by games_together desc, opponent_name asc
  ), '[]'::jsonb)
  into head_to_head
  from (
    select
      other_p.id as opponent_id,
      coalesce(nullif(other_p.display_name, ''), other_p.player_name, 'Player') as opponent_name,
      count(distinct g.id)::int as games_together,
      count(distinct g.id) filter (where g.winner_profile_id = target_profile_id)::int as wins,
      count(distinct g.id) filter (where g.winner_profile_id = other_p.id)::int as losses
    from public.profiles as other_p
    join public.game_participants as gpa on gpa.profile_id = other_p.id
    join public.game_participants as gpb on gpb.game_id = gpa.game_id and gpb.profile_id = target_profile_id
    join public.games as g on g.id = gpa.game_id and g.status = 'finished'
    where other_p.id <> target_profile_id and other_p.deleted_at is null
    group by other_p.id, other_p.display_name, other_p.player_name
  ) as h2h_data;

  -- ── #3 POSITION STATS ──────────────────────────────────────────────────────
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'position', start_order,
      'appearances', appearances,
      'wins', wins,
      'winRate', case when appearances > 0 then round(wins::numeric / appearances, 3) else 0::numeric end,
      'avgPrestige', avg_prestige
    ) order by start_order asc
  ), '[]'::jsonb)
  into position_stats
  from (
    select
      gp.start_order,
      count(*)::int as appearances,
      count(*) filter (where gp.is_winner)::int as wins,
      round(avg(gp.total_prestige), 1) as avg_prestige
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    where gp.profile_id = target_profile_id
    group by gp.start_order
  ) as pos_data;

  -- ── #4 PACE PROFILE ────────────────────────────────────────────────────────
  -- Splits each game at the midpoint round index and compares first-half to
  -- second-half prestige. The lateral subquery supplies max_ri per participant.
  select
    coalesce(round(avg(fp), 1), 0),
    coalesce(round(avg(sp), 1), 0),
    coalesce(round(avg(sp - fp), 1), 0),
    coalesce(round(avg(fp) filter (where is_win), 1), 0),
    coalesce(round(avg(fp) filter (where not is_win), 1), 0)
  into pace_avg_first_half, pace_avg_second_half, pace_avg_late_delta,
       pace_avg_first_half_win, pace_avg_first_half_lose
  from (
    select
      gp.is_winner as is_win,
      coalesce(sum(gr.prestige) filter (where gr.round_index < mri.max_ri / 2.0), 0) as fp,
      coalesce(sum(gr.prestige) filter (where gr.round_index >= mri.max_ri / 2.0), 0) as sp
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    join public.game_rounds as gr on gr.participant_id = gp.id
    join lateral (
      select max(round_index)::float as max_ri
      from public.game_rounds where participant_id = gp.id
    ) as mri on true
    where gp.profile_id = target_profile_id
    group by gp.id, gp.is_winner
  ) as paces;

  -- ── #5 CORRELATIONS ────────────────────────────────────────────────────────
  select
    coalesce(round(avg(gp.objective_prestige) filter (where gp.is_winner), 2), 0),
    coalesce(round(avg(gp.objective_prestige) filter (where not gp.is_winner), 2), 0),
    coalesce(round(avg(gp.assists) filter (where gp.is_winner), 2), 0),
    coalesce(round(avg(gp.assists) filter (where not gp.is_winner), 2), 0),
    coalesce(round(avg(gp.failures) filter (where gp.is_winner), 2), 0),
    coalesce(round(avg(gp.failures) filter (where not gp.is_winner), 2), 0)
  into corr_avg_obj_win, corr_avg_obj_lose,
       corr_avg_assists_win, corr_avg_assists_lose,
       corr_avg_failures_win, corr_avg_failures_lose
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  where gp.profile_id = target_profile_id;

  if finished_game_count >= 3 then
    correlations_items := jsonb_build_array(
      jsonb_build_object(
        'key', 'objectives-vs-wins',
        'label', 'Objective prestige',
        'whenWin', corr_avg_obj_win,
        'whenLose', corr_avg_obj_lose,
        'delta', round(corr_avg_obj_win - corr_avg_obj_lose, 2),
        'direction', case
          when corr_avg_obj_win > corr_avg_obj_lose + 0.1 then 'positive'
          when corr_avg_obj_win < corr_avg_obj_lose - 0.1 then 'negative'
          else 'neutral'
        end,
        'description', case
          when corr_avg_obj_win > corr_avg_obj_lose + 0.1
            then concat('Avg ', corr_avg_obj_win::text, ' in wins vs ', corr_avg_obj_lose::text, ' in losses — objectives track with winning')
          when corr_avg_obj_win < corr_avg_obj_lose - 0.1
            then concat('More objectives in losses (', corr_avg_obj_lose::text, ') than wins (', corr_avg_obj_win::text, ') — wins come from other sources')
          else 'Objective prestige does not meaningfully differ between wins and losses'
        end
      ),
      jsonb_build_object(
        'key', 'assists-vs-wins',
        'label', 'Assists',
        'whenWin', corr_avg_assists_win,
        'whenLose', corr_avg_assists_lose,
        'delta', round(corr_avg_assists_win - corr_avg_assists_lose, 2),
        'direction', case
          when corr_avg_assists_win > corr_avg_assists_lose + 0.1 then 'positive'
          when corr_avg_assists_win < corr_avg_assists_lose - 0.1 then 'negative'
          else 'neutral'
        end,
        'description', case
          when corr_avg_assists_win > corr_avg_assists_lose + 0.1
            then concat('More assists in wins (', corr_avg_assists_win::text, ') than losses (', corr_avg_assists_lose::text, ')')
          when corr_avg_assists_win < corr_avg_assists_lose - 0.1
            then concat('Fewer assists when winning (', corr_avg_assists_win::text, ') — wins rely less on assist-based prestige')
          else 'Assist volume is similar across wins and losses'
        end
      ),
      jsonb_build_object(
        'key', 'failures-vs-wins',
        'label', 'Failures',
        'whenWin', corr_avg_failures_win,
        'whenLose', corr_avg_failures_lose,
        'delta', round(corr_avg_failures_win - corr_avg_failures_lose, 2),
        'direction', case
          when corr_avg_failures_win < corr_avg_failures_lose - 0.1 then 'positive'
          when corr_avg_failures_win > corr_avg_failures_lose + 0.1 then 'negative'
          else 'neutral'
        end,
        'description', case
          when corr_avg_failures_win < corr_avg_failures_lose - 0.1
            then concat('Fewer failures when winning (', corr_avg_failures_win::text, ' vs ', corr_avg_failures_lose::text, ') — clean play correlates with wins')
          when corr_avg_failures_win > corr_avg_failures_lose + 0.1
            then concat('More failures in wins (', corr_avg_failures_win::text, ') than losses (', corr_avg_failures_lose::text, ') — aggressive play still converts')
          else 'Failure count does not meaningfully differ between wins and losses'
        end
      )
    );
  end if;

  -- ── #6 GAME HISTORY ────────────────────────────────────────────────────────
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'gameId', game_id,
      'finishedAt', finished_at,
      'groupName', group_name,
      'playerCount', player_count,
      'isWinner', is_winner,
      'prestige', total_prestige,
      'prestigeSpread', prestige_spread,
      'winnerName', winner_name,
      'assists', assists,
      'failures', failures,
      'contracts', contracts
    ) order by finished_at desc, game_id desc
  ), '[]'::jsonb)
  into game_history
  from (
    select
      g.id as game_id,
      coalesce(g.finished_at, g.created_at) as finished_at,
      g.group_name_snapshot as group_name,
      game_agg.player_count,
      game_agg.prestige_spread,
      gp.is_winner,
      gp.total_prestige,
      gp.assists,
      gp.failures,
      gp.contracts,
      coalesce(nullif(winner_p.display_name, ''), winner_p.player_name, 'Unknown') as winner_name
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    join public.profiles as winner_p on winner_p.id = g.winner_profile_id
    join lateral (
      select
        count(*)::int as player_count,
        (max(agg_gp.total_prestige) - min(agg_gp.total_prestige))::int as prestige_spread
      from public.game_participants as agg_gp
      where agg_gp.game_id = g.id
    ) as game_agg on true
    where gp.profile_id = target_profile_id
  ) as game_data;

  -- ── CHART / PLAYER SETUP (unchanged) ───────────────────────────────────────
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

  -- ── PAYLOAD ────────────────────────────────────────────────────────────────
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
        'topSignals', top_signals,
        -- #2 streaks
        'streaks', jsonb_build_object(
          'currentStreak', streak_current_len,
          'currentStreakIsWin', streak_current_is_win,
          'longestWinStreak', streak_longest_win,
          'longestLossStreak', streak_longest_loss
        ),
        -- #3 position stats
        'positionStats', position_stats
      ),
      'players', jsonb_build_object('options', player_options, 'selectedPlayerId', target_profile_id, 'detail', player_detail),
      -- #4 pace profile
      'paceProfile', jsonb_build_object(
        'avgFirstHalf', pace_avg_first_half,
        'avgSecondHalf', pace_avg_second_half,
        'avgLateDelta', pace_avg_late_delta,
        'avgFirstHalfWin', pace_avg_first_half_win,
        'avgFirstHalfLose', pace_avg_first_half_lose,
        'description', case
          when finished_game_count = 0 then 'No games yet.'
          else concat(
            'Avg prestige: ', pace_avg_first_half::text, ' (first half) → ',
            pace_avg_second_half::text, ' (second half), Δ +', pace_avg_late_delta::text, '.'
          )
        end
      ),
      'playstyle', jsonb_build_object(
        'summary', case
          when finished_game_count > 0 then 'Playstyle data is available. See paceProfile, correlations, and positionStats for per-player breakdowns.'
          else 'Finish at least one tracked game to populate player-specific playstyle insights.'
        end,
        'highlights', '[]'::jsonb
      ),
      -- #5 correlations
      'correlations', jsonb_build_object(
        'summary', case
          when finished_game_count < 3 then 'Need at least 3 games for meaningful correlation analysis.'
          else concat(
            jsonb_array_length(correlations_items)::text, ' stat',
            case when jsonb_array_length(correlations_items) = 1 then '' else 's' end,
            ' analyzed across ', finished_game_count::text, ' games.'
          )
        end,
        'items', correlations_items,
        'selectedKey', null
      ),
      -- #6 game history
      'games', jsonb_build_object(
        'items', game_history,
        'selectedGameId', null,
        'detail', null
      )
    ),
    'insightsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'meta', jsonb_build_object('games', finished_game_count, 'playerRows', player_row_count),
      'topSignals', top_signals,
      -- #1 head-to-head
      'rivalries', head_to_head,
      'assistNetwork', jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb),
      -- #5 correlations also surfaced in insights
      'correlations', jsonb_build_object(
        'summary', case
          when finished_game_count < 3 then 'Need at least 3 games for meaningful correlation analysis.'
          else 'Win/loss correlations across objectives, assists, and failures.'
        end,
        'items', correlations_items,
        'selectedKey', null
      )
    ),
    'charts', chart_rollups
  );

  insert into public.personal_stats_rollups (profile_id, payload, updated_at)
  values (target_profile_id, analytics_payload, generated_at)
  on conflict (profile_id) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;

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
    select count(*)::int as game_count,
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

-- Backfill: re-run all profiles so the new fields appear immediately
do $$
declare
  p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;
;
