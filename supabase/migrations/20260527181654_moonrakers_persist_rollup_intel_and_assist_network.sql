-- Persists the missing enrichment branches directly on personal_stats_rollups:
-- 1. store raw assist-network nodes/edges under insightsScreen.assistNetwork
-- 2. store the safer aggregate Moonrakers Intel payload under moonrakersIntel
-- 3. keep relationship_graph chart rollups sourced from the same raw network helper

create or replace function private.build_personal_rollup_assist_network(
  target_profile_id uuid,
  base_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_payload jsonb := coalesce(base_payload, '{}'::jsonb);
  generated_at jsonb := to_jsonb(now());
  relationship_nodes jsonb := '[]'::jsonb;
  relationship_edges jsonb := '[]'::jsonb;
  scoped_player_ids jsonb := '[]'::jsonb;
  finished_game_count integer := 0;
  relationship_node_count integer := 0;
  relationship_edge_count integer := 0;
begin
  if jsonb_typeof(safe_payload) <> 'object' then
    safe_payload := '{}'::jsonb;
  end if;

  if safe_payload ? 'generatedAt' then
    generated_at := safe_payload->'generatedAt';
  end if;

  if target_profile_id is null then
    return jsonb_build_object(
      'generatedAt', generated_at,
      'nodes', '[]'::jsonb,
      'edges', '[]'::jsonb,
      'players', '[]'::jsonb,
      'relationships', '[]'::jsonb,
      'scopedPlayerIds', '[]'::jsonb,
      'exactScopePlayerIds', '[]'::jsonb,
      'mode', 'network',
      'meta', jsonb_build_object(
        'hasData', false,
        'pointCount', 0,
        'nodeCount', 0,
        'edgeCount', 0
      )
    );
  end if;

  select count(distinct g.id)::integer
  into finished_game_count
  from public.games as g
  join public.game_participants as gp
    on gp.game_id = g.id
  where gp.profile_id = target_profile_id
    and g.status = 'finished';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', network_players.profile_id,
        'label', network_players.display_name,
        'name', network_players.display_name,
        'color', network_players.favorite_color,
        'assignedCardArtIndex', network_players.assigned_card_art_index,
        'assistsGiven', coalesce(network_players.assists_given, 0),
        'prestigeGiven', coalesce(network_players.prestige_given, 0),
        'assistsReceived', coalesce(network_players.assists_received, 0),
        'prestigeReceived', coalesce(network_players.prestige_received, 0)
      )
      order by lower(network_players.display_name), network_players.profile_id::text
    ),
    '[]'::jsonb
  )
  into relationship_nodes
  from (
    with tracked_games as (
      select g.id as game_id
      from public.games as g
      join public.game_participants as gp
        on gp.game_id = g.id
      where gp.profile_id = target_profile_id
        and g.status = 'finished'
    ),
    net_players as (
      select distinct on (gp.profile_id)
        gp.profile_id,
        coalesce(nullif(p.display_name, ''), p.player_name, 'Player') as display_name,
        p.favorite_color,
        p.assigned_card_art_index
      from public.game_participants as gp
      join tracked_games as tg on tg.game_id = gp.game_id
      join public.profiles as p on p.id = gp.profile_id
      where gp.profile_id is not null
      order by gp.profile_id, gp.game_id desc
    ),
    assist_flows as (
      select
        src.profile_id as from_id,
        rec.profile_id as to_id,
        sum(greatest(edge.value::integer, 0))::integer as times_assisted,
        sum(
          greatest(
            coalesce(nullif(gr.assist_prestige_recipients->>edge.key, '')::numeric, 0),
            0
          )
        )::numeric as total_prestige
      from public.game_rounds as gr
      join tracked_games as tg on tg.game_id = gr.game_id
      join public.game_participants as src on src.id = gr.participant_id
      join lateral jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as edge(key, value) on true
      join public.game_participants as rec
        on rec.game_id = gr.game_id
       and rec.profile_id is not null
       and rec.profile_id::text = btrim(edge.key)
      where src.profile_id is not null
        and rec.profile_id <> src.profile_id
        and btrim(edge.key) <> ''
        and edge.value::integer > 0
      group by src.profile_id, rec.profile_id
    )
    select
      np.profile_id,
      np.display_name,
      np.favorite_color,
      np.assigned_card_art_index,
      ag.assists_given,
      ag.prestige_given,
      ar.assists_received,
      ar.prestige_received
    from net_players as np
    left join (
      select
        from_id as profile_id,
        sum(times_assisted)::integer as assists_given,
        sum(total_prestige)::numeric as prestige_given
      from assist_flows
      group by from_id
    ) as ag on ag.profile_id = np.profile_id
    left join (
      select
        to_id as profile_id,
        sum(times_assisted)::integer as assists_received,
        sum(total_prestige)::numeric as prestige_received
      from assist_flows
      group by to_id
    ) as ar on ar.profile_id = np.profile_id
  ) as network_players;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'fromId', flow.from_id,
        'toId', flow.to_id,
        'timesAssisted', flow.times_assisted,
        'assistCount', flow.times_assisted,
        'totalPrestige', flow.total_prestige,
        'assistPrestige', flow.total_prestige,
        'assistFrequencyPerGame', case
          when finished_game_count > 0 then round(flow.times_assisted::numeric / finished_game_count::numeric, 3)
          else flow.times_assisted::numeric
        end,
        'value', case
          when finished_game_count > 0 then round(flow.times_assisted::numeric / finished_game_count::numeric, 3)
          else flow.times_assisted::numeric
        end,
        'weight', case
          when finished_game_count > 0 then round(flow.times_assisted::numeric / finished_game_count::numeric, 3)
          else flow.times_assisted::numeric
        end,
        'labelText', case
          when finished_game_count > 0 then concat(
            trim(to_char(round(flow.times_assisted::numeric / finished_game_count::numeric, 3), 'FM999990.0##')),
            '/game'
          )
          else format('%s assists', flow.times_assisted)
        end
      )
      order by
        case
          when finished_game_count > 0 then round(flow.times_assisted::numeric / finished_game_count::numeric, 3)
          else flow.times_assisted::numeric
        end desc,
        flow.from_id::text,
        flow.to_id::text
    ),
    '[]'::jsonb
  )
  into relationship_edges
  from (
    with tracked_games as (
      select g.id as game_id
      from public.games as g
      join public.game_participants as gp
        on gp.game_id = g.id
      where gp.profile_id = target_profile_id
        and g.status = 'finished'
    )
    select
      src.profile_id as from_id,
      rec.profile_id as to_id,
      sum(greatest(edge.value::integer, 0))::integer as times_assisted,
      sum(
        greatest(
          coalesce(nullif(gr.assist_prestige_recipients->>edge.key, '')::numeric, 0),
          0
        )
      )::numeric as total_prestige
    from public.game_rounds as gr
    join tracked_games as tg on tg.game_id = gr.game_id
    join public.game_participants as src on src.id = gr.participant_id
    join lateral jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as edge(key, value) on true
    join public.game_participants as rec
      on rec.game_id = gr.game_id
     and rec.profile_id is not null
     and rec.profile_id::text = btrim(edge.key)
    where src.profile_id is not null
      and rec.profile_id <> src.profile_id
      and btrim(edge.key) <> ''
      and edge.value::integer > 0
    group by src.profile_id, rec.profile_id
  ) as flow;

  relationship_node_count := jsonb_array_length(relationship_nodes);
  relationship_edge_count := jsonb_array_length(relationship_edges);

  select coalesce(
    jsonb_agg(
      node->>'id'
      order by lower(coalesce(nullif(node->>'label', ''), nullif(node->>'name', ''), 'Player')),
      node->>'id'
    ),
    '[]'::jsonb
  )
  into scoped_player_ids
  from jsonb_array_elements(relationship_nodes) as node
  where nullif(node->>'id', '') is not null;

  if jsonb_array_length(scoped_player_ids) = 0 then
    scoped_player_ids := jsonb_build_array(target_profile_id);
  end if;

  return jsonb_build_object(
    'generatedAt', generated_at,
    'nodes', relationship_nodes,
    'edges', relationship_edges,
    'players', relationship_nodes,
    'relationships', relationship_edges,
    'scopedPlayerIds', scoped_player_ids,
    'exactScopePlayerIds', '[]'::jsonb,
    'mode', 'network',
    'meta', jsonb_build_object(
      'hasData', relationship_edge_count > 0,
      'pointCount', greatest(relationship_node_count, relationship_edge_count),
      'nodeCount', relationship_node_count,
      'edgeCount', relationship_edge_count
    )
  );
end;
$$;

create or replace function private.build_personal_rollup_charts(
  target_profile_id uuid,
  base_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  relationship_payload jsonb := private.build_personal_rollup_assist_network(target_profile_id, base_payload);
  relationship_nodes jsonb := coalesce(relationship_payload->'nodes', '[]'::jsonb);
  relationship_edges jsonb := coalesce(relationship_payload->'edges', '[]'::jsonb);
  relationship_meta jsonb := coalesce(
    relationship_payload->'meta',
    jsonb_build_object('hasData', false, 'pointCount', 0, 'nodeCount', 0, 'edgeCount', 0)
  );
  relationship_node_count integer := coalesce((relationship_meta->>'nodeCount')::integer, 0);
  relationship_edge_count integer := coalesce((relationship_meta->>'edgeCount')::integer, 0);
  relationship_has_data boolean := coalesce((relationship_meta->>'hasData')::boolean, false);
begin
  return jsonb_build_object(
    'relationship_graph',
    jsonb_build_object(
      'chartKey', 'relationship_graph',
      'generatedAt', coalesce(relationship_payload->'generatedAt', to_jsonb(now())),
      'title', 'Relationship graph',
      'subtitle', case
        when relationship_edge_count > 0 then 'Server-authored relationship flow from published assist links.'
        when relationship_node_count > 0 then 'Server-authored relationship nodes are available, but no directed assist links are published yet.'
        else 'Server-authored relationship data will publish after shared assist links are recorded.'
      end,
      'emptyState', jsonb_build_object(
        'title', 'No relationship graph yet',
        'description', 'Finish shared games with tracked assist links to populate the relationship graph.'
      ),
      'data', jsonb_build_object(
        'nodes', relationship_nodes,
        'edges', relationship_edges,
        'players', coalesce(relationship_payload->'players', relationship_nodes),
        'relationships', coalesce(relationship_payload->'relationships', relationship_edges),
        'scopedPlayerIds', coalesce(relationship_payload->'scopedPlayerIds', '[]'::jsonb),
        'exactScopePlayerIds', coalesce(relationship_payload->'exactScopePlayerIds', '[]'::jsonb),
        'mode', coalesce(relationship_payload->>'mode', 'network'),
        'meta', relationship_meta
      )
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
  tracked_games_label text := '0 tracked games';
  assist_events_label text := '0 assists';
  timed_assist_events_label text := '0 timed assists';
  import_health_label text := 'No assist context';
  import_health_tone text := 'red';
  import_health_sub_label text := 'No tracked or inferred assist data for this profile.';
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
    and g.status = 'finished';

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

  tracked_games_label := format(
    '%s tracked %s',
    moonrakers_game_count,
    case when moonrakers_game_count = 1 then 'game' else 'games' end
  );
  assist_events_label := format(
    '%s %s',
    assist_events_count,
    case when assist_events_count = 1 then 'assist' else 'assists' end
  );

  if assist_events_count <= 0 then
    import_health_label := 'No assist context';
    import_health_tone := 'red';
    import_health_sub_label := 'No tracked or inferred assist data for this profile.';
  else
    import_health_label := 'Aggregate assist totals only';
    import_health_tone := 'gold';
    import_health_sub_label := format(
      '%s across %s. Directional assist-target timing is intentionally omitted in this safe fallback.',
      assist_events_label,
      tracked_games_label
    );
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
      'assistGapToTargetLabel', null,
      'assistGapToLeaderLabel', null,
      'assistsAtSixPlusLabel', null,
      'assistsOverFiveBehindLeaderLabel', null,
      'assistPrestigeGainedLabel', null,
      'assistPrestigePerAssistLabel', null,
      'assistEventsCount', assist_events_count,
      'assistEventsLabel', assist_events_label,
      'timedEventsCount', timed_assist_events_count,
      'timedAssistEventsLabel', timed_assist_events_label,
      'trackedGamesLabel', tracked_games_label,
      'importHealthLabel', import_health_label,
      'importHealthTone', import_health_tone,
      'importHealthSubLabel', import_health_sub_label
    )
  );
end;
$$;

create or replace function private.attach_personal_rollup_charts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_charts jsonb := '{}'::jsonb;
  rebuilt_charts jsonb := '{}'::jsonb;
  relationship_payload jsonb := '{}'::jsonb;
  assist_network jsonb := jsonb_build_object(
    'nodes', '[]'::jsonb,
    'edges', '[]'::jsonb,
    'players', '[]'::jsonb,
    'relationships', '[]'::jsonb,
    'scopedPlayerIds', '[]'::jsonb,
    'exactScopePlayerIds', '[]'::jsonb,
    'mode', 'network',
    'meta', jsonb_build_object('hasData', false, 'pointCount', 0, 'nodeCount', 0, 'edgeCount', 0)
  );
  moonrakers_intel jsonb := null;
  insights_screen jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(new.payload) <> 'object' then
    new.payload := coalesce(new.payload, '{}'::jsonb);
  end if;

  if jsonb_typeof(new.payload->'charts') = 'object' then
    existing_charts := new.payload->'charts';
  end if;

  if jsonb_typeof(new.payload->'insightsScreen') = 'object' then
    insights_screen := new.payload->'insightsScreen';
  end if;

  relationship_payload := private.build_personal_rollup_assist_network(new.profile_id, new.payload);
  rebuilt_charts := private.build_personal_rollup_charts(new.profile_id, new.payload);
  moonrakers_intel := private.build_personal_rollup_moonrakers_intel(new.profile_id);

  assist_network := jsonb_build_object(
    'generatedAt', coalesce(relationship_payload->'generatedAt', new.payload->'generatedAt', to_jsonb(now())),
    'nodes', coalesce(relationship_payload->'nodes', '[]'::jsonb),
    'edges', coalesce(relationship_payload->'edges', '[]'::jsonb),
    'players', coalesce(relationship_payload->'players', '[]'::jsonb),
    'relationships', coalesce(relationship_payload->'relationships', '[]'::jsonb),
    'scopedPlayerIds', coalesce(relationship_payload->'scopedPlayerIds', '[]'::jsonb),
    'exactScopePlayerIds', coalesce(relationship_payload->'exactScopePlayerIds', '[]'::jsonb),
    'mode', coalesce(relationship_payload->>'mode', 'network'),
    'meta', coalesce(
      relationship_payload->'meta',
      jsonb_build_object('hasData', false, 'pointCount', 0, 'nodeCount', 0, 'edgeCount', 0)
    )
  );

  insights_screen := insights_screen || jsonb_build_object(
    'assistNetwork', assist_network
  );

  new.payload := new.payload || jsonb_build_object(
    'moonrakersIntel', moonrakers_intel,
    'insightsScreen', insights_screen,
    'charts', existing_charts || rebuilt_charts
  );

  return new;
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
