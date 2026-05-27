-- Consolidates the late-May chart cleanup into one final chart-contract follow-up.
-- 1. rebuild relationship_graph rollups from raw assist-direction tables
-- 2. attach chart payload rebuilding to personal_stats_rollups writes
-- 3. preserve meta-rich chart datasets through get_chart_dataset

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
  safe_payload jsonb := coalesce(base_payload, '{}'::jsonb);
  generated_at jsonb := to_jsonb(now());
  assist_nodes jsonb := '[]'::jsonb;
  assist_edges_source jsonb := '[]'::jsonb;
  relationship_nodes jsonb := '[]'::jsonb;
  relationship_edges jsonb := '[]'::jsonb;
  scoped_player_ids jsonb := '[]'::jsonb;
  finished_game_count integer := 0;
  relationship_node_count integer := 0;
  relationship_edge_count integer := 0;
  relationship_has_data boolean := false;
begin
  if jsonb_typeof(safe_payload) <> 'object' then
    safe_payload := '{}'::jsonb;
  end if;

  if safe_payload ? 'generatedAt' then
    generated_at := safe_payload->'generatedAt';
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
        sum(greatest(coalesce(nullif(gr.assist_prestige_recipients->>edge.key, '')::numeric, 0), 0))::numeric as total_prestige
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
      select from_id as profile_id, sum(times_assisted)::integer as assists_given, sum(total_prestige)::numeric as prestige_given
      from assist_flows
      group by from_id
    ) as ag on ag.profile_id = np.profile_id
    left join (
      select to_id as profile_id, sum(times_assisted)::integer as assists_received, sum(total_prestige)::numeric as prestige_received
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
      sum(greatest(coalesce(nullif(gr.assist_prestige_recipients->>edge.key, '')::numeric, 0), 0))::numeric as total_prestige
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
  relationship_has_data := relationship_edge_count > 0;

  select coalesce(
    jsonb_agg(node->>'id' order by lower(coalesce(nullif(node->>'label', ''), nullif(node->>'name', ''), 'Player')), node->>'id'),
    '[]'::jsonb
  )
  into scoped_player_ids
  from jsonb_array_elements(relationship_nodes) as node
  where nullif(node->>'id', '') is not null;

  if jsonb_array_length(scoped_player_ids) = 0 and target_profile_id is not null then
    scoped_player_ids := jsonb_build_array(target_profile_id);
  end if;

  return jsonb_build_object(
    'relationship_graph',
    jsonb_build_object(
      'chartKey', 'relationship_graph',
      'generatedAt', generated_at,
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
        'players', relationship_nodes,
        'relationships', relationship_edges,
        'scopedPlayerIds', scoped_player_ids,
        'exactScopePlayerIds', '[]'::jsonb,
        'mode', 'network',
        'meta', jsonb_build_object(
          'hasData', relationship_has_data,
          'pointCount', greatest(relationship_node_count, relationship_edge_count),
          'nodeCount', relationship_node_count,
          'edgeCount', relationship_edge_count
        )
      )
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
begin
  if jsonb_typeof(new.payload) <> 'object' then
    new.payload := coalesce(new.payload, '{}'::jsonb);
  end if;

  if jsonb_typeof(new.payload->'charts') = 'object' then
    existing_charts := new.payload->'charts';
  end if;

  rebuilt_charts := private.build_personal_rollup_charts(new.profile_id, new.payload);

  new.payload := new.payload || jsonb_build_object(
    'charts',
    existing_charts || rebuilt_charts
  );

  return new;
end;
$$;

drop trigger if exists personal_stats_rollups_attach_charts on public.personal_stats_rollups;
create trigger personal_stats_rollups_attach_charts
  before insert or update on public.personal_stats_rollups
  for each row
  execute function private.attach_personal_rollup_charts();

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

create or replace function public.get_chart_dataset(
  chart_key text,
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  compare_player_id uuid default null,
  scoped_player_ids uuid[] default null,
  selected_game_id uuid default null,
  metric_key text default null,
  line_mode text default null,
  graph_mode text default null,
  opponent_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
  normalized_chart_key text := lower(coalesce(chart_key, 'default'));
  recognized_chart_keys text[] := array[
    'default',
    'elo',
    'prestige',
    'assists',
    'radar',
    'relationship_graph',
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time',
    'bar_chart',
    'bar',
    'bump_chart',
    'consistency_band',
    'heatmap',
    'efficiency_failure_scatter',
    'replay_chart',
    'rivalry_graph',
    'head_to_head',
    'sparkline',
    'stacked_bar_chart',
    'compare'
  ];
  stored_chart jsonb := null;
  fallback_title text := 'Analytics chart';
  fallback_subtitle text := 'Server-authored placeholder dataset.';
  fallback_empty_state jsonb := jsonb_build_object(
    'title', 'No chart data yet',
    'description', 'Finish at least one tracked game to populate this chart.'
  );
  effective_chart jsonb := '{}'::jsonb;
  effective_data jsonb := '{}'::jsonb;
  effective_generic_data jsonb := '{}'::jsonb;
  effective_points jsonb := '[]'::jsonb;
  effective_series jsonb := '[]'::jsonb;
  effective_meta jsonb := '{}'::jsonb;
  effective_generated_at jsonb := 'null'::jsonb;
  effective_point_count integer := 0;
  node_count integer := 0;
  edge_count integer := 0;
  game_count integer := 0;
  row_count integer := 0;
  scoped_player_ids_jsonb jsonb := coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb);
  exact_scope_player_ids_jsonb jsonb := case
    when coalesce(array_length(scoped_player_ids, 1), 0) >= 2 then coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb)
    else '[]'::jsonb
  end;
  target_profile_id uuid := profile_id;
  default_metric_key text := coalesce(metric_key, 'totalPrestige');
  default_line_mode text := coalesce(line_mode, 'raw');
  default_graph_mode text := coalesce(graph_mode, 'network');
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  if jsonb_typeof(rollup_payload->'charts') = 'object' then
    stored_chart := rollup_payload->'charts'->normalized_chart_key;
  end if;

  if stored_chart is null and rollup_payload is not null then
    stored_chart := private.build_personal_rollup_charts(target_profile_id, rollup_payload)->normalized_chart_key;
  end if;

  case normalized_chart_key
    when 'elo' then
      fallback_title := 'Elo trend';
      fallback_subtitle := 'Server-authored placeholder dataset for Elo.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No Elo history yet',
        'description', 'Finish at least one tracked game to populate Elo history.'
      );
    when 'prestige' then
      fallback_title := 'Prestige totals';
      fallback_subtitle := 'Server-authored placeholder dataset for prestige.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No prestige totals yet',
        'description', 'Finish at least one tracked game to populate prestige totals.'
      );
    when 'assists' then
      fallback_title := 'Assist volume';
      fallback_subtitle := 'Server-authored placeholder dataset for assists.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No assist history yet',
        'description', 'Finish at least one tracked game to populate assist history.'
      );
    when 'relationship_graph' then
      fallback_title := 'Relationship graph';
      fallback_subtitle := 'Server-authored relationship flow from published assist links.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No relationship graph yet',
        'description', 'Finish shared games with tracked assist links to populate the relationship graph.'
      );
    else
      null;
  end case;

  if jsonb_typeof(stored_chart) = 'object' then
    effective_chart := stored_chart;
  elsif rollup_payload is not null
    and normalized_chart_key = any(recognized_chart_keys)
    and jsonb_typeof(rollup_payload->'charts'->'default') = 'object' then
    effective_chart := rollup_payload->'charts'->'default';
  end if;

  if effective_chart ? 'generatedAt' then
    effective_generated_at := effective_chart->'generatedAt';
  elsif rollup_payload is not null and rollup_payload ? 'generatedAt' then
    effective_generated_at := rollup_payload->'generatedAt';
  else
    effective_generated_at := to_jsonb(now());
  end if;

  if jsonb_typeof(effective_chart->'data') = 'object' then
    effective_data := effective_chart->'data';
  end if;

  if jsonb_typeof(effective_data->'points') = 'array' then
    effective_points := effective_data->'points';
  end if;

  if jsonb_typeof(effective_data->'series') = 'array' then
    effective_series := effective_data->'series';
  end if;

  if jsonb_typeof(effective_data->'meta') = 'object' then
    effective_meta := effective_data->'meta';
  end if;

  node_count := case
    when jsonb_typeof(effective_data->'nodes') = 'array' then jsonb_array_length(effective_data->'nodes')
    else 0
  end;

  edge_count := case
    when jsonb_typeof(effective_data->'edges') = 'array' then jsonb_array_length(effective_data->'edges')
    else 0
  end;

  game_count := case
    when jsonb_typeof(effective_data->'games') = 'array' then jsonb_array_length(effective_data->'games')
    when jsonb_typeof(effective_data->'replay') = 'array' then jsonb_array_length(effective_data->'replay')
    else 0
  end;

  row_count := case
    when jsonb_typeof(effective_data->'data') = 'array' then jsonb_array_length(effective_data->'data')
    else 0
  end;

  effective_point_count := case
    when jsonb_typeof(effective_meta->'pointCount') = 'number' then
      (effective_meta->>'pointCount')::integer
    when normalized_chart_key = 'relationship_graph' then
      greatest(node_count, edge_count)
    when normalized_chart_key = 'radar' then
      case when effective_data ? 'primary' and effective_data->'primary' <> 'null'::jsonb then 1 else 0 end
    when normalized_chart_key in ('elo', 'rivalry_graph', 'head_to_head') then
      game_count
    when normalized_chart_key = 'replay_chart' then
      game_count
    when normalized_chart_key = 'sparkline' then
      greatest(
        case when jsonb_typeof(effective_data->'data') = 'array' then jsonb_array_length(effective_data->'data') else 0 end,
        case when jsonb_typeof(effective_data->'comparisonData') = 'array' then jsonb_array_length(effective_data->'comparisonData') else 0 end
      )
    when normalized_chart_key in (
      'line_chart',
      'line',
      'multi_line_chart',
      'multi-line-chart',
      'multi-line',
      'prestige_over_time',
      'bar_chart',
      'bar',
      'bump_chart',
      'consistency_band',
      'heatmap',
      'efficiency_failure_scatter',
      'stacked_bar_chart',
      'compare'
    ) then
      row_count
    else
      jsonb_array_length(effective_points)
  end;

  effective_meta := effective_meta || jsonb_build_object(
    'hasData', effective_point_count > 0,
    'pointCount', effective_point_count,
    'profileId', profile_id,
    'focusPlayerId', focus_player_id,
    'comparePlayerId', compare_player_id,
    'scopedPlayerIds', coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb),
    'selectedGameId', selected_game_id,
    'metricKey', metric_key,
    'lineMode', line_mode,
    'graphMode', graph_mode,
    'opponentId', opponent_id
  );

  if normalized_chart_key = 'relationship_graph' then
    effective_meta := effective_meta || jsonb_build_object(
      'nodeCount', node_count,
      'edgeCount', edge_count
    );
  elsif normalized_chart_key in ('elo', 'rivalry_graph', 'head_to_head', 'replay_chart') then
    effective_meta := effective_meta || jsonb_build_object('gameCount', game_count);
  elsif row_count > 0 then
    effective_meta := effective_meta || jsonb_build_object('rowCount', row_count);
  end if;

  effective_generic_data := jsonb_build_object(
    'points', effective_points,
    'series', effective_series,
    'meta', effective_meta
  );

  effective_data := case
    when normalized_chart_key = 'elo' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end
    )
    when normalized_chart_key = 'radar' then jsonb_build_object(
      'primary', case
        when effective_data ? 'primary' then effective_data->'primary'
        else 'null'::jsonb
      end,
      'comparison', case
        when effective_data ? 'comparison' then effective_data->'comparison'
        else 'null'::jsonb
      end,
      'labels', case
        when jsonb_typeof(effective_data->'labels') = 'array' then effective_data->'labels'
        else '[]'::jsonb
      end
    )
    when normalized_chart_key = 'relationship_graph' then jsonb_build_object(
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        when jsonb_typeof(effective_data->'nodes') = 'array' then effective_data->'nodes'
        else '[]'::jsonb
      end,
      'relationships', case
        when jsonb_typeof(effective_data->'relationships') = 'array' then effective_data->'relationships'
        when jsonb_typeof(effective_data->'edges') = 'array' then effective_data->'edges'
        else '[]'::jsonb
      end,
      'nodes', case
        when jsonb_typeof(effective_data->'nodes') = 'array' then effective_data->'nodes'
        else '[]'::jsonb
      end,
      'edges', case
        when jsonb_typeof(effective_data->'edges') = 'array' then effective_data->'edges'
        else '[]'::jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'exactScopePlayerIds', case
        when jsonb_typeof(effective_data->'exactScopePlayerIds') = 'array' then effective_data->'exactScopePlayerIds'
        else exact_scope_player_ids_jsonb
      end,
      'mode', to_jsonb(coalesce(effective_data->>'mode', default_graph_mode))
    )
    when normalized_chart_key in ('line_chart', 'line', 'multi_line_chart', 'multi-line-chart', 'multi-line', 'prestige_over_time') then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(
        coalesce(
          effective_data->>'statKey',
          case
            when normalized_chart_key = 'prestige_over_time' then 'totalPrestige'
            else default_metric_key
          end
        )
      ),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'mode', to_jsonb(coalesce(effective_data->>'mode', default_line_mode))
    )
    when normalized_chart_key in ('bar_chart', 'bar') then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'bump_chart' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'consistency_band' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'heatmap' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'efficiency_failure_scatter' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'replay_chart' then jsonb_build_object(
      'replay', case
        when jsonb_typeof(effective_data->'replay') = 'array' then effective_data->'replay'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedGameId', coalesce(effective_data->'selectedGameId', to_jsonb(selected_game_id))
    )
    when normalized_chart_key = 'rivalry_graph' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'playerId', coalesce(effective_data->'playerId', to_jsonb(focus_player_id))
    )
    when normalized_chart_key = 'head_to_head' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'playerId', coalesce(effective_data->'playerId', to_jsonb(focus_player_id)),
      'compareId', coalesce(effective_data->'compareId', to_jsonb(compare_player_id))
    )
    when normalized_chart_key = 'sparkline' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'comparisonData', case
        when jsonb_typeof(effective_data->'comparisonData') = 'array' then effective_data->'comparisonData'
        else '[]'::jsonb
      end,
      'metricKey', to_jsonb(coalesce(effective_data->>'metricKey', default_metric_key)),
      'primaryLabel', case
        when effective_data ? 'primaryLabel' then effective_data->'primaryLabel'
        else 'null'::jsonb
      end,
      'comparisonLabel', case
        when effective_data ? 'comparisonLabel' then effective_data->'comparisonLabel'
        else 'null'::jsonb
      end
    )
    when normalized_chart_key = 'stacked_bar_chart' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'metricDataMap', case
        when jsonb_typeof(effective_data->'metricDataMap') = 'object' then effective_data->'metricDataMap'
        else '{}'::jsonb
      end,
      'metricOptions', case
        when jsonb_typeof(effective_data->'metricOptions') = 'array' then effective_data->'metricOptions'
        else '[]'::jsonb
      end,
      'activeMetricKey', to_jsonb(coalesce(effective_data->>'activeMetricKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'compare' then jsonb_build_object(
      'focusPlayerId', coalesce(effective_data->'focusPlayerId', to_jsonb(focus_player_id)),
      'comparePlayerId', coalesce(effective_data->'comparePlayerId', to_jsonb(compare_player_id)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'rows', case
        when jsonb_typeof(effective_data->'rows') = 'array' then effective_data->'rows'
        else '[]'::jsonb
      end
    )
    else effective_generic_data
  end;

  effective_data := effective_data || jsonb_build_object('meta', effective_meta);

  return jsonb_build_object(
    'chartKey', normalized_chart_key,
    'generatedAt', effective_generated_at,
    'title', coalesce(effective_chart->>'title', fallback_title),
    'subtitle', coalesce(effective_chart->>'subtitle', fallback_subtitle),
    'emptyState', case
      when jsonb_typeof(effective_chart->'emptyState') = 'object' then effective_chart->'emptyState'
      else fallback_empty_state
    end,
    'data', effective_data
  );
end;
$$;
