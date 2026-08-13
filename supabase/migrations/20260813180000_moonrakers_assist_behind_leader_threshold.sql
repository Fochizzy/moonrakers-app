-- Moves the assist-behind-leader threshold from >5 to >2 on the profile side, so
-- Moonrakers Intel agrees with the Insights macro card (20260813170000).
--
-- The observed gap-to-leader across all finished games tops out at exactly 5, so
-- ">5 behind" never fired and both surfaces showed a flat 0 (0%).
--
-- The assist_over_five_behind column name and the assistsOverFiveBehindLeaderLabel
-- payload key keep their historical names; renaming them is a client contract change
-- and belongs in its own commit.
--
-- Body is otherwise identical to 20260527202000.
--
-- Restores full timed assist-context metrics from tracked round payloads.
-- This keeps the stored rollup path and live player-profile fallback aligned:
-- - Exact assist timing when round-level assist links exist
-- - No assist context when legacy/imported rows do not include tracked assist rounds

create or replace function private.build_moonrakers_intel_payload(
  target_profile_id uuid,
  filtered_opponent_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  moonrakers_game_count integer := 0;
  direct_per_game numeric := 0;
  assist_received_per_game numeric := 0;
  objective_points_per_game numeric := 0;
  base_turns_per_game numeric := 0;
  base_rate numeric := 0;
  win_rate_with_base numeric := 0;
  win_rate_without_base numeric := 0;
  prestige_with_base numeric := 0;
  prestige_without_base numeric := 0;
  assists_given_per_game numeric := 0;
  assist_events_count integer := 0;
  games_with_objectives integer := 0;
  high_objective_games integer := 0;
  win_rate_with_objectives numeric := 0;
  win_rate_without_objectives numeric := 0;
  prestige_with_objectives numeric := 0;
  best_condition jsonb := null;
  worst_condition jsonb := null;
  best_support_partner jsonb := null;
  most_common_assist_target jsonb := null;
  style_read text := 'Balanced';
  support_style text := 'Balanced';
  timed_assist_events_count integer := 0;
  timed_assist_game_count integer := 0;
  tracked_games_label text := '0 tracked games';
  assist_events_label text := '0 assists';
  timed_assist_events_label text := '0 timed assists';
  import_health_label text := 'No assist context';
  import_health_tone text := 'red';
  import_health_sub_label text := 'No tracked or inferred assist data for this profile.';
  assist_prestige_gained numeric := 0;
  assist_prestige_per_assist numeric := 0;
  assist_gap_to_target numeric := 0;
  assist_gap_to_leader numeric := 0;
  assists_at_six_plus integer := 0;
  assists_over_five_behind_leader integer := 0;
begin
  if target_profile_id is null then
    return jsonb_build_object(
      'hasData', false,
      'emptyTitle', 'Not enough Moonrakers data yet',
      'emptyBody', 'Finish or import a few more games to unlock player-specific playstyle reads.'
    );
  end if;

  select count(*)::int
  into moonrakers_game_count
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id
  where gp.profile_id = target_profile_id
    and g.status = 'finished'
    and (
      filtered_opponent_id is null or exists (
        select 1
        from public.game_participants as ogp
        where ogp.game_id = gp.game_id
          and ogp.profile_id = filtered_opponent_id
      )
    );

  if moonrakers_game_count < 3 then
    return jsonb_build_object(
      'hasData', false,
      'emptyTitle', 'Not enough Moonrakers data yet',
      'emptyBody', 'Finish or import a few more games to unlock player-specific playstyle reads.'
    );
  end if;

  with player_games as (
    select
      g.id as game_id,
      gp.id as participant_id,
      gp.is_winner,
      gp.total_prestige,
      gp.direct_prestige,
      gp.assist_prestige_received,
      gp.objective_prestige,
      gp.assists,
      gp.failures,
      gp.contracts,
      gp.start_order,
      count(*) over (partition by g.id)::int as table_size
    from public.games as g
    join public.game_participants as gp on gp.game_id = g.id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
      and (
        filtered_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = filtered_opponent_id
        )
      )
  ),
  per_game_base as (
    select
      pg.game_id,
      count(*)::int as total_turns,
      count(*) filter (
        where coalesce(gr.contracts, 0) = 0
          and coalesce(gr.failures, 0) = 0
          and coalesce(gr.objective_count, 0) = 0
          and coalesce(gr.objective_prestige, 0) = 0
      )::int as base_turns
    from player_games as pg
    left join public.game_rounds as gr on gr.participant_id = pg.participant_id
    group by pg.game_id
  ),
  objective_games as (
    select
      count(*) filter (where coalesce(objective_prestige, 0) > 0)::int as with_objectives,
      count(*) filter (where coalesce(objective_prestige, 0) >= 2)::int as high_objectives,
      coalesce(avg(total_prestige) filter (where coalesce(objective_prestige, 0) > 0), 0)::numeric as prestige_with_objectives,
      coalesce(avg(case when is_winner then 1 else 0 end) filter (where coalesce(objective_prestige, 0) > 0), 0)::numeric as win_rate_with_objectives,
      coalesce(avg(case when is_winner then 1 else 0 end) filter (where coalesce(objective_prestige, 0) = 0), 0)::numeric as win_rate_without_objectives
    from player_games
  ),
  condition_candidates as (
    select
      case when table_size >= 5 then 'in 5p+' else format('in %sp', table_size) end as label,
      count(*)::int as sample_size,
      coalesce(avg(case when is_winner then 1 else 0 end), 0)::numeric as win_rate_value,
      coalesce(avg(total_prestige), 0)::numeric as avg_prestige_value
    from player_games
    group by case when table_size >= 5 then 'in 5p+' else format('in %sp', table_size) end
    having count(*) >= 3

    union all

    select
      case
        when start_order = 0 then 'from Early Seat'
        when start_order = table_size - 1 then 'from Late Seat'
        else 'from Middle Seat'
      end as label,
      count(*)::int as sample_size,
      coalesce(avg(case when is_winner then 1 else 0 end), 0)::numeric as win_rate_value,
      coalesce(avg(total_prestige), 0)::numeric as avg_prestige_value
    from player_games
    group by
      case
        when start_order = 0 then 'from Early Seat'
        when start_order = table_size - 1 then 'from Late Seat'
        else 'from Middle Seat'
      end
    having count(*) >= 3
  ),
  best_condition_candidate as (
    select *
    from condition_candidates
    order by win_rate_value desc, avg_prestige_value desc, label asc
    limit 1
  ),
  worst_condition_candidate as (
    select *
    from condition_candidates
    order by win_rate_value asc, avg_prestige_value asc, label asc
    limit 1
  ),
  support_partner_candidates as (
    select
      other_profile.id as player_id,
      coalesce(nullif(other_profile.display_name, ''), other_profile.player_name, 'Player') as player_name,
      count(distinct g.id)::int as sample_size,
      count(distinct g.id) filter (where selected_gp.is_winner)::int as wins,
      coalesce(avg(selected_gp.total_prestige), 0)::numeric as avg_prestige_value
    from public.games as g
    join public.game_participants as selected_gp
      on selected_gp.game_id = g.id
     and selected_gp.profile_id = target_profile_id
    join public.game_participants as other_gp
      on other_gp.game_id = g.id
     and other_gp.profile_id is not null
     and other_gp.profile_id <> target_profile_id
    join public.profiles as other_profile on other_profile.id = other_gp.profile_id
    where g.status = 'finished'
      and (
        filtered_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = filtered_opponent_id
        )
      )
    group by other_profile.id, other_profile.display_name, other_profile.player_name
    having count(distinct g.id) >= 3
  )
  select
    coalesce(avg(player_games.direct_prestige), 0)::numeric,
    coalesce(avg(player_games.assist_prestige_received), 0)::numeric,
    coalesce(avg(player_games.objective_prestige), 0)::numeric,
    coalesce(avg(per_game_base.base_turns), 0)::numeric,
    coalesce(sum(per_game_base.base_turns)::numeric / nullif(sum(per_game_base.total_turns)::numeric, 0), 0)::numeric,
    coalesce(avg(case when per_game_base.base_turns > 0 and player_games.is_winner then 1 else 0 end), 0)::numeric,
    coalesce(avg(case when per_game_base.base_turns = 0 and player_games.is_winner then 1 else 0 end), 0)::numeric,
    coalesce(avg(player_games.total_prestige) filter (where per_game_base.base_turns > 0), 0)::numeric,
    coalesce(avg(player_games.total_prestige) filter (where per_game_base.base_turns = 0), 0)::numeric,
    coalesce(avg(player_games.assists), 0)::numeric,
    coalesce(sum(player_games.assists), 0)::int,
    coalesce(max(objective_games.with_objectives), 0)::int,
    coalesce(max(objective_games.high_objectives), 0)::int,
    coalesce(max(objective_games.win_rate_with_objectives), 0)::numeric,
    coalesce(max(objective_games.win_rate_without_objectives), 0)::numeric,
    coalesce(max(objective_games.prestige_with_objectives), 0)::numeric,
    (
      select jsonb_build_object(
        'label', label,
        'winRate', win_rate_value,
        'avgPrestige', avg_prestige_value,
        'sampleSize', sample_size,
        'winRateLabel', concat(round(win_rate_value * 100)::int, '%'),
        'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
        'sampleSizeLabel', format('%s games', sample_size)
      )
      from best_condition_candidate
    ),
    (
      select jsonb_build_object(
        'label', label,
        'winRate', win_rate_value,
        'avgPrestige', avg_prestige_value,
        'sampleSize', sample_size,
        'winRateLabel', concat(round(win_rate_value * 100)::int, '%'),
        'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
        'sampleSizeLabel', format('%s games', sample_size)
      )
      from worst_condition_candidate
    ),
    (
      select jsonb_build_object(
        'playerId', player_id,
        'playerName', support_partner_candidates.player_name,
        'winRate', coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0),
        'avgPrestige', avg_prestige_value,
        'sampleSize', sample_size,
        'winRateLabel', concat(round(coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0) * 100)::int, '%'),
        'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
        'sampleSizeLabel', format('%s games', sample_size)
      )
      from support_partner_candidates
      order by
        coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0) desc,
        avg_prestige_value desc,
        lower(support_partner_candidates.player_name) asc
      limit 1
    )
  into
    direct_per_game,
    assist_received_per_game,
    objective_points_per_game,
    base_turns_per_game,
    base_rate,
    win_rate_with_base,
    win_rate_without_base,
    prestige_with_base,
    prestige_without_base,
    assists_given_per_game,
    assist_events_count,
    games_with_objectives,
    high_objective_games,
    win_rate_with_objectives,
    win_rate_without_objectives,
    prestige_with_objectives,
    best_condition,
    worst_condition,
    best_support_partner
  from player_games
  left join per_game_base on per_game_base.game_id = player_games.game_id
  cross join objective_games;

  if direct_per_game >= assist_received_per_game + 0.75
     and direct_per_game >= objective_points_per_game + 0.75 then
    style_read := 'Direct';
  elsif assist_received_per_game >= direct_per_game + 0.75
     and assist_received_per_game >= objective_points_per_game + 0.75 then
    style_read := 'Support';
  elsif objective_points_per_game >= direct_per_game + 0.75
     and objective_points_per_game >= assist_received_per_game + 0.75 then
    style_read := 'Objective';
  else
    style_read := 'Balanced';
  end if;

  if assists_given_per_game - assist_received_per_game >= 0.5 then
    support_style := 'Giver';
  elsif assist_received_per_game - assists_given_per_game >= 0.5 then
    support_style := 'Receiver';
  else
    support_style := 'Balanced';
  end if;

  with relevant_games as (
    select g.id as game_id
    from public.games as g
    join public.game_participants as self_gp
      on self_gp.game_id = g.id
     and self_gp.profile_id = target_profile_id
    where g.status = 'finished'
      and (
        filtered_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = filtered_opponent_id
        )
      )
  ),
  game_profiles as (
    select gp.game_id, gp.profile_id
    from public.game_participants as gp
    join relevant_games as rg on rg.game_id = gp.game_id
    where gp.profile_id is not null
  ),
  tracked_rounds as (
    select
      gr.game_id,
      gr.round_index,
      gp.profile_id as target_player_id,
      coalesce(gr.prestige, 0)::numeric as round_prestige,
      coalesce(gr.assist_recipients, '{}'::jsonb) as assist_recipients,
      coalesce(gr.assist_prestige_recipients, '{}'::jsonb) as assist_prestige_recipients
    from public.game_rounds as gr
    join public.game_participants as gp on gp.id = gr.participant_id
    join relevant_games as rg on rg.game_id = gr.game_id
    where gp.profile_id is not null
  ),
  round_prestige_deltas as (
    select
      tr.game_id,
      tr.round_index,
      tr.target_player_id as profile_id,
      tr.round_prestige as prestige_delta
    from tracked_rounds as tr

    union all

    select
      tr.game_id,
      tr.round_index,
      gp2.profile_id,
      greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key, '')::numeric, 0), 0)::numeric
    from tracked_rounds as tr
    join lateral jsonb_each_text(tr.assist_prestige_recipients) as edge(key, value) on true
    join game_profiles as gp2
      on gp2.game_id = tr.game_id
     and gp2.profile_id::text = btrim(edge.key)
    where btrim(edge.key) <> ''
  ),
  prestige_before as (
    select
      tr.game_id,
      tr.round_index,
      gp2.profile_id,
      coalesce(sum(prev.prestige_delta), 0)::numeric as pbr
    from tracked_rounds as tr
    join game_profiles as gp2 on gp2.game_id = tr.game_id
    left join round_prestige_deltas as prev
      on prev.game_id = tr.game_id
     and prev.profile_id = gp2.profile_id
     and prev.round_index < tr.round_index
    group by tr.game_id, tr.round_index, gp2.profile_id
  ),
  leader_state as (
    select pb.game_id, pb.round_index, max(pb.pbr) as leader_prestige
    from prestige_before as pb
    group by pb.game_id, pb.round_index
  ),
  assist_events as (
    select
      tr.game_id,
      gp2.profile_id as player_id,
      tr.target_player_id,
      abs(h_state.pbr - t_state.pbr)::numeric as gap_to_target,
      (ls.leader_prestige - h_state.pbr)::numeric as gap_to_leader,
      case when h_state.pbr >= 6 then 1 else 0 end as assist_at_six_plus,
      case when (ls.leader_prestige - h_state.pbr) > 2 then 1 else 0 end as assist_over_five_behind,
      (
        greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key, '')::numeric, 0), 0)
        / greatest(edge.value::numeric, 1)
      )::numeric as assist_prestige_gained
    from tracked_rounds as tr
    join prestige_before as t_state
      on t_state.game_id = tr.game_id
     and t_state.round_index = tr.round_index
     and t_state.profile_id = tr.target_player_id
    join leader_state as ls
      on ls.game_id = tr.game_id
     and ls.round_index = tr.round_index
    join lateral jsonb_each_text(tr.assist_recipients) as edge(key, value) on true
    join game_profiles as gp2
      on gp2.game_id = tr.game_id
     and gp2.profile_id::text = btrim(edge.key)
    join prestige_before as h_state
      on h_state.game_id = tr.game_id
     and h_state.round_index = tr.round_index
     and h_state.profile_id = gp2.profile_id
    join lateral generate_series(1, greatest(edge.value::int, 0)) as rep(idx) on true
    where btrim(edge.key) <> ''
      and edge.value::int > 0
  ),
  assist_context_samples as (
    select
      gp2.game_id,
      gp2.profile_id,
      count(ae.player_id)::int as assist_count,
      case when count(ae.player_id) > 0 then avg(ae.gap_to_target)::numeric else null end as avg_gap_to_target,
      case when count(ae.player_id) > 0 then avg(ae.gap_to_leader)::numeric else null end as avg_gap_to_leader,
      coalesce(sum(ae.assist_at_six_plus), 0)::int as assists_at_six_plus,
      coalesce(sum(ae.assist_over_five_behind), 0)::int as assists_over_five_behind,
      coalesce(sum(ae.assist_prestige_gained), 0)::numeric as assist_prestige_gained
    from game_profiles as gp2
    left join assist_events as ae
      on ae.game_id = gp2.game_id
     and ae.player_id = gp2.profile_id
    group by gp2.game_id, gp2.profile_id
  )
  select
    coalesce(sum(acs.assist_count), 0)::int,
    count(*) filter (where acs.assist_count > 0)::int,
    coalesce(avg(acs.avg_gap_to_target) filter (where acs.avg_gap_to_target is not null), 0)::numeric,
    coalesce(avg(acs.avg_gap_to_leader) filter (where acs.avg_gap_to_leader is not null), 0)::numeric,
    coalesce(sum(acs.assists_at_six_plus), 0)::int,
    coalesce(sum(acs.assists_over_five_behind), 0)::int,
    coalesce(sum(acs.assist_prestige_gained), 0)::numeric
  into
    timed_assist_events_count,
    timed_assist_game_count,
    assist_gap_to_target,
    assist_gap_to_leader,
    assists_at_six_plus,
    assists_over_five_behind_leader,
    assist_prestige_gained
  from assist_context_samples as acs
  where acs.profile_id = target_profile_id;

  assist_events_count := timed_assist_events_count;
  assist_prestige_per_assist := case
    when timed_assist_events_count > 0 then round(assist_prestige_gained / timed_assist_events_count, 2)
    else 0
  end;

  tracked_games_label := format(
    '%s tracked %s',
    timed_assist_game_count,
    case when timed_assist_game_count = 1 then 'game' else 'games' end
  );
  assist_events_label := format(
    '%s %s',
    assist_events_count,
    case when assist_events_count = 1 then 'assist' else 'assists' end
  );
  timed_assist_events_label := format(
    '%s timed %s',
    timed_assist_events_count,
    case when timed_assist_events_count = 1 then 'assist' else 'assists' end
  );

  if timed_assist_events_count > 0 then
    import_health_label := 'Exact assist timing';
    import_health_tone := 'green';
    import_health_sub_label := format('%s across %s.', timed_assist_events_label, tracked_games_label);
  else
    import_health_label := 'No assist context';
    import_health_tone := 'red';
    import_health_sub_label := 'No tracked or inferred assist data for this profile.';
  end if;

  return jsonb_build_object(
    'hasData', true,
    'playstyle', jsonb_build_object(
      'directPrestigePerGame', direct_per_game,
      'directPrestigePerGameLabel', trim(to_char(direct_per_game, 'FM999990.0')),
      'assistPrestigeReceivedPerGame', assist_received_per_game,
      'assistPrestigeReceivedPerGameLabel', trim(to_char(assist_received_per_game, 'FM999990.0')),
      'objectivePointsPerGame', objective_points_per_game,
      'objectivePointsPerGameLabel', trim(to_char(objective_points_per_game, 'FM999990.0')),
      'baseTurnsPerGame', base_turns_per_game,
      'baseTurnsPerGameLabel', trim(to_char(base_turns_per_game, 'FM999990.0')),
      'baseRate', base_rate,
      'baseRateLabel', concat(round(base_rate * 100)::int, '%'),
      'styleRead', style_read
    ),
    'bestCondition', best_condition,
    'worstCondition', worst_condition,
    'baseDiscipline', jsonb_build_object(
      'baseRate', base_rate,
      'baseRateLabel', concat(round(base_rate * 100)::int, '%'),
      'baseTurnsPerGame', base_turns_per_game,
      'baseTurnsPerGameLabel', trim(to_char(base_turns_per_game, 'FM999990.0')),
      'winRateWithBase', win_rate_with_base,
      'winRateWithBaseLabel', concat(round(win_rate_with_base * 100)::int, '%'),
      'winRateWithoutBase', win_rate_without_base,
      'winRateWithoutBaseLabel', concat(round(win_rate_without_base * 100)::int, '%'),
      'prestigeWithBase', prestige_with_base,
      'prestigeWithBaseLabel', trim(to_char(prestige_with_base, 'FM999990.0')),
      'prestigeWithoutBase', prestige_without_base,
      'prestigeWithoutBaseLabel', trim(to_char(prestige_without_base, 'FM999990.0'))
    ),
    'objectiveProfile', jsonb_build_object(
      'objectivePointsPerGame', objective_points_per_game,
      'objectivePointsPerGameLabel', trim(to_char(objective_points_per_game, 'FM999990.0')),
      'gamesWithObjectives', games_with_objectives,
      'gamesWithObjectivesLabel', format('%s/%s', games_with_objectives, moonrakers_game_count),
      'winRateWithObjectives', win_rate_with_objectives,
      'winRateWithObjectivesLabel', concat(round(win_rate_with_objectives * 100)::int, '%'),
      'winRateWithoutObjectives', win_rate_without_objectives,
      'winRateWithoutObjectivesLabel', concat(round(win_rate_without_objectives * 100)::int, '%'),
      'prestigeWithObjectives', prestige_with_objectives,
      'prestigeWithObjectivesLabel', trim(to_char(prestige_with_objectives, 'FM999990.0')),
      'highObjectiveGames', high_objective_games,
      'highObjectiveGamesLabel', format('%s/%s', high_objective_games, moonrakers_game_count)
    ),
    'supportProfile', jsonb_build_object(
      'assistsGivenPerGame', assists_given_per_game,
      'assistsGivenPerGameLabel', trim(to_char(assists_given_per_game, 'FM999990.0')),
      'assistsReceivedPerGame', assist_received_per_game,
      'assistsReceivedPerGameLabel', trim(to_char(assist_received_per_game, 'FM999990.0')),
      'bestSupportPartner', best_support_partner,
      'mostCommonAssistTarget', most_common_assist_target,
      'supportStyle', support_style
    ),
    'assistContext', jsonb_build_object(
      'assistGapToTargetLabel', case
        when timed_assist_events_count > 0 then trim(to_char(round(assist_gap_to_target, 1), 'FM999990.0'))
        else null
      end,
      'assistGapToLeaderLabel', case
        when timed_assist_events_count > 0 then trim(to_char(round(assist_gap_to_leader, 1), 'FM999990.0'))
        else null
      end,
      'assistsAtSixPlusLabel', case
        when timed_assist_events_count > 0 then format(
          '%s (%s%%)',
          assists_at_six_plus,
          round((assists_at_six_plus::numeric * 100) / timed_assist_events_count)::int
        )
        else null
      end,
      'assistsOverFiveBehindLeaderLabel', case
        when timed_assist_events_count > 0 then format(
          '%s (%s%%)',
          assists_over_five_behind_leader,
          round((assists_over_five_behind_leader::numeric * 100) / timed_assist_events_count)::int
        )
        else null
      end,
      'assistPrestigeGainedLabel', case
        when timed_assist_events_count > 0 or assist_prestige_gained > 0
          then trim(to_char(round(assist_prestige_gained, 1), 'FM999990.0'))
        else null
      end,
      'assistPrestigePerAssistLabel', case
        when timed_assist_events_count > 0 then trim(to_char(assist_prestige_per_assist, 'FM999990.0'))
        else null
      end,
      'assistEventsCount', assist_events_count,
      'assistEventsLabel', assist_events_label,
      'timedEventsCount', timed_assist_events_count,
      'timedAssistEventsLabel', timed_assist_events_label,
      'trackedGamesLabel', tracked_games_label,
      'importHealthLabel', case when timed_assist_events_count > 0 then 'Exact assist timing' else 'No assist context' end,
      'importHealthTone', import_health_tone,
      'importHealthSubLabel', import_health_sub_label
    )
  );
end;
$$;

create or replace function private.build_personal_rollup_moonrakers_intel(
  target_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.build_moonrakers_intel_payload(target_profile_id, null);
end;
$$;

create or replace function public.get_player_profile_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null
)
returns jsonb language plpgsql stable set search_path = 'public'
as $$
declare
  signed_in_profile_id uuid := profile_id;
  generated_at                 timestamptz := now();
  elo_payload                  jsonb := '{}'::jsonb;
  rollup_payload               jsonb;
  selected_player_id           uuid := null;
  selected_opponent_id         uuid := null;
  selected_summary             jsonb := null;
  selected_player_opt          jsonb := null;
  player_options               jsonb := '[]'::jsonb;
  signed_in_top_player_options jsonb := '[]'::jsonb;
  opponent_options             jsonb := '[]'::jsonb;
  top_opponent_options         jsonb := '[]'::jsonb;
  top_cards                    jsonb := '[]'::jsonb;
  tabs                         jsonb := '{}'::jsonb;
  tab_insights                 jsonb := '{}'::jsonb;
  profile_insight              jsonb := null;
  active_insight               jsonb := null;
  recent_games                 jsonb := '[]'::jsonb;
  hero                         jsonb := null;
  moonrakers_intel             jsonb := null;
  total_games                  integer := 0;
  total_wins                   integer := 0;
  win_rate                     numeric := 0;
  current_elo                  integer := 1000;
  peak_elo                     integer := 1000;
  player_name                  text    := 'Player';
  player_color                 text    := null;
  player_card_art_idx          integer := null;
  opponent_name                text    := null;
begin
  if profile_id is null or profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  elo_payload          := public.get_elo_screen(profile_id, focus_player_id, opponent_id, 'elo');
  selected_player_id   := nullif(elo_payload->>'selectedPlayerId','')::uuid;
  selected_opponent_id := nullif(elo_payload->>'selectedOpponentId','')::uuid;
  player_options       := coalesce(elo_payload->'playerOptions','[]'::jsonb);
  selected_summary     := elo_payload->'summary';
  top_cards            := coalesce(elo_payload->'topCards','[]'::jsonb);
  tabs                 := coalesce(elo_payload->'sections','{}'::jsonb);
  tab_insights         := coalesce(elo_payload->'insights','{}'::jsonb);

  select coalesce(jsonb_agg(entry order by ordinality),'[]'::jsonb)
  into signed_in_top_player_options
  from (
    select
      jsonb_build_object(
        'id',shared.opponent_id,'name',shared.opponent_name,'label',shared.opponent_name,
        'displayName',shared.opponent_display_name,'playerName',shared.opponent_player_name,
        'color',shared.favorite_color,'assignedCardArtIndex',shared.assigned_card_art_index,
        'gamesPlayed',shared.games_together,'currentElo',coalesce(nullif(shared.current_elo_text,'')::integer,1000)
      ) as entry,
      row_number() over (
        order by shared.games_together desc,lower(shared.opponent_name) asc,shared.opponent_id
      ) as ordinality
    from (
      select
        other_profile.id as opponent_id,
        coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player') as opponent_name,
        nullif(other_profile.display_name,'') as opponent_display_name,
        other_profile.player_name as opponent_player_name,
        other_profile.favorite_color,
        other_profile.assigned_card_art_index,
        count(distinct g.id)::int as games_together,
        max(player_option->>'currentElo') as current_elo_text
      from public.game_participants as viewer_gp
      join public.games as g on g.id=viewer_gp.game_id and g.status='finished'
      join public.game_participants as other_gp on other_gp.game_id=viewer_gp.game_id and other_gp.profile_id is not null and other_gp.profile_id<>viewer_gp.profile_id
      join public.profiles as other_profile on other_profile.id=other_gp.profile_id
      left join lateral jsonb_array_elements(player_options) as player_option on nullif(player_option->>'id','')::uuid=other_profile.id
      where viewer_gp.profile_id=signed_in_profile_id
      group by other_profile.id,other_profile.display_name,other_profile.player_name,other_profile.favorite_color,other_profile.assigned_card_art_index
      order by count(distinct g.id) desc,lower(coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player')) asc,other_profile.id
      limit 4
    ) as shared
  ) as ranked_entries;

  if selected_player_id is null then
    return jsonb_build_object(
      'generatedAt',generated_at,'selectedPlayerId',null,'selectedOpponentId',null,'playerOptions',player_options,'signedInTopPlayerOptions',signed_in_top_player_options,
      'hero',jsonb_build_object('id',null,'name','Player','color',null,'assignedCardArtIndex',null,'currentElo',1000,'peakElo',1000,'winRate',0,'totalWins',0,'totalGames',0),
      'quickActions',jsonb_build_object('compareLabel','Compare with...','chartsLabel','Open charts','recentGamesLabel','Recent games'),
      'topCards',top_cards,'activeInsight',null,
      'profileInsight',jsonb_build_object('title','No player selected','body','Choose a player from the shared analytics directory to load a full server-authored profile.'),
      'tabs',tabs,'tabInsights',tab_insights,
      'moonrakersIntel',jsonb_build_object('hasData',false,'emptyTitle','Not enough Moonrakers data yet','emptyBody','Finish or import a few more games to unlock player-specific playstyle reads.'),
      'opponentOptions','[]'::jsonb,'topOpponentOptions','[]'::jsonb,'recentGames','[]'::jsonb,
      'emptyState',jsonb_build_object('title','No player profile yet','description','The shared analytics payload does not currently expose a player profile for this account.')
    );
  end if;

  select entry into selected_player_opt from jsonb_array_elements(player_options) as entry
  where nullif(entry->>'id','')::uuid=selected_player_id limit 1;

  player_name         := coalesce(nullif(selected_summary->>'name',''),nullif(selected_player_opt->>'name',''),nullif(selected_player_opt->>'label',''),'Player');
  player_color        := nullif(selected_player_opt->>'color','');
  player_card_art_idx := nullif(selected_player_opt->>'assignedCardArtIndex','')::integer;
  current_elo         := coalesce(nullif(selected_summary->>'currentElo','')::integer,1000);
  peak_elo            := coalesce(nullif(selected_summary->>'peakElo','')::integer,current_elo);

  select psr.payload into rollup_payload
  from public.personal_stats_rollups as psr
  where psr.profile_id = selected_player_id;

  if rollup_payload is not null then
    moonrakers_intel := rollup_payload->'moonrakersIntel';
    if selected_opponent_id is null then
      total_games := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0);
      total_wins  := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'wins')::int,0);
      win_rate    := case when total_games > 0 then total_wins::numeric / total_games else 0 end;
    end if;
  end if;

  if selected_opponent_id is not null or rollup_payload is null or moonrakers_intel is null or coalesce((moonrakers_intel->>'hasData')::boolean,false)=false then
    select
      count(*)::int,
      count(*) filter (where gp.is_winner)::int,
      coalesce(count(*) filter (where gp.is_winner)::numeric / nullif(count(*)::numeric,0),0)::numeric
    into total_games, total_wins, win_rate
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id
    where gp.profile_id = selected_player_id
      and g.status='finished'
      and (
        selected_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = gp.game_id
            and ogp.profile_id = selected_opponent_id
        )
      );
  end if;

  if selected_opponent_id is not null then
    select coalesce(nullif(p.display_name,''),p.player_name,'Player')
    into opponent_name
    from public.profiles as p
    where p.id = selected_opponent_id
    limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ranked_games.id,'gameId',ranked_games.id,'createdAt',ranked_games.created_at,'finishedAt',ranked_games.finished_at,
    'winnerId',ranked_games.winner_profile_id,'groupId',ranked_games.group_id,'groupName',ranked_games.group_name_snapshot,
    'players',coalesce(ranked_games.players,'[]'::jsonb)
  ) order by ranked_games.sort_finished_at desc,ranked_games.id desc),'[]'::jsonb)
  into recent_games
  from (
    select
      g.id,
      g.created_at,
      g.finished_at,
      g.winner_profile_id,
      g.group_id,
      g.group_name_snapshot,
      pp.players,
      coalesce(g.finished_at,g.created_at) as sort_finished_at
    from public.games as g
    join public.game_participants as focus_gp on focus_gp.game_id=g.id and focus_gp.profile_id=selected_player_id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id',gp.profile_id,'profileId',gp.profile_id,
        'name',coalesce(nullif(gp.display_name_snapshot,''),gp.player_name_snapshot,'Player'),
        'color',gp.color_snapshot,'assignedCardArtIndex',gp.assigned_card_art_index_snapshot,
        'startOrder',gp.start_order,'isWinner',gp.is_winner,'totalPrestige',gp.total_prestige
      ) order by gp.start_order asc,gp.profile_id asc) as players
      from public.game_participants as gp
      where gp.game_id=g.id
    ) as pp on true
    where g.status='finished'
      and (
        selected_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = selected_opponent_id
        )
      )
    order by coalesce(g.finished_at,g.created_at) desc,g.id desc
    limit 60
  ) as ranked_games;

  if selected_opponent_id is not null then
    moonrakers_intel := private.build_moonrakers_intel_payload(selected_player_id, selected_opponent_id);
  elsif moonrakers_intel is null or coalesce((moonrakers_intel->>'hasData')::boolean,false)=false then
    moonrakers_intel := private.build_moonrakers_intel_payload(selected_player_id, null);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',shared.opponent_id,'name',shared.opponent_name,'label',shared.opponent_name,
    'displayName',shared.opponent_display_name,'playerName',shared.opponent_player_name,
    'color',shared.favorite_color,'assignedCardArtIndex',shared.assigned_card_art_index,
    'gamesPlayed',shared.games_together,'currentElo',coalesce(nullif(shared.current_elo_text,'')::integer,1000)
  ) order by shared.games_together desc,lower(shared.opponent_name) asc,shared.opponent_id),'[]'::jsonb)
  into opponent_options
  from (
    select
      other_profile.id as opponent_id,
      coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player') as opponent_name,
      nullif(other_profile.display_name,'') as opponent_display_name,
      other_profile.player_name as opponent_player_name,
      other_profile.favorite_color,
      other_profile.assigned_card_art_index,
      count(distinct g.id)::int as games_together,
      max(player_option->>'currentElo') as current_elo_text
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_participants as other_gp on other_gp.game_id=gp.game_id and other_gp.profile_id is not null and other_gp.profile_id<>gp.profile_id
    join public.profiles as other_profile on other_profile.id=other_gp.profile_id
    left join lateral jsonb_array_elements(player_options) as player_option on nullif(player_option->>'id','')::uuid=other_profile.id
    where gp.profile_id=selected_player_id
    group by other_profile.id,other_profile.display_name,other_profile.player_name,other_profile.favorite_color,other_profile.assigned_card_art_index
  ) as shared;

  select coalesce(jsonb_agg(entry order by ordinality),'[]'::jsonb)
  into top_opponent_options
  from (
    select entry,ordinality
    from jsonb_array_elements(opponent_options) with ordinality as entry(entry,ordinality)
    order by coalesce(nullif(entry->>'gamesPlayed','')::integer,0) desc,lower(coalesce(entry->>'label',entry->>'name','player')) asc
    limit 4
  ) as top_entries;

  hero := jsonb_build_object(
    'id',selected_player_id,'name',player_name,'color',player_color,'assignedCardArtIndex',player_card_art_idx,
    'currentElo',current_elo,'peakElo',peak_elo,'winRate',win_rate,'totalWins',total_wins,'totalGames',total_games
  );

  profile_insight := jsonb_build_object(
    'title',case
      when total_games = 0 then 'Awaiting tracked results'
      when selected_opponent_id is not null and opponent_name is not null then format('Context against %s',opponent_name)
      when win_rate >= 0.6 then 'Winning profile'
      when win_rate <= 0.35 then 'Recovery window'
      else 'Balanced profile'
    end,
    'body',case
      when total_games = 0 then 'This player is in the shared directory, but there are no finished games in the published Moonrakers history yet.'
      when selected_opponent_id is not null and opponent_name is not null then format('%s has %s wins across %s shared games against %s in the published Supabase record.',player_name,total_wins,total_games,opponent_name)
      when win_rate >= 0.6 then format('%s is converting %s%% of finished games with a current ELO of %s.',player_name,round(win_rate * 100)::int,current_elo)
      when win_rate <= 0.35 then format('%s is below break-even right now, so the current profile is more about stabilizing form than protecting peak rating.',player_name)
      else format('%s is operating near the league middle, with enough history to compare momentum, context, and projection in one place.',player_name)
    end
  );

  active_insight := coalesce(
    tab_insights->'Leaderboard',
    jsonb_build_object(
      'title','Profile insight',
      'body',format('%s now has a full server-authored analytics profile.',player_name)
    )
  );

  return jsonb_build_object(
    'generatedAt',generated_at,'selectedPlayerId',selected_player_id,'selectedOpponentId',selected_opponent_id,
    'playerOptions',player_options,'signedInTopPlayerOptions',signed_in_top_player_options,'hero',hero,
    'quickActions',jsonb_build_object('compareLabel','Compare with...','chartsLabel','Open charts','recentGamesLabel','Recent games'),
    'topCards',top_cards,'activeInsight',active_insight,'profileInsight',profile_insight,
    'tabs',tabs,'tabInsights',tab_insights,'moonrakersIntel',moonrakers_intel,
    'opponentOptions',opponent_options,'topOpponentOptions',top_opponent_options,'recentGames',recent_games,
    'emptyState',case when total_games > 0 then null else jsonb_build_object('title','No player analytics yet','description','Track or import a few finished games so the full profile contract has live history to summarize.') end
  );
end;
$$;

do $$
declare
  profile_row record;
begin
  for profile_row in
    select public.profiles.id
    from public.profiles
    where public.profiles.deleted_at is null
    order by public.profiles.created_at asc, public.profiles.id asc
  loop
    perform private.admin_refresh_analytics(profile_row.id);
  end loop;
end;
$$;

-- Refresh persisted rollups so the stored copy matches the live profile read.
do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;
