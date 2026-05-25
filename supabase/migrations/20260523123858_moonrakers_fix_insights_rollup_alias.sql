create or replace function public.get_analytics_home(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_analytics_home.profile_id;

  if rollup_payload is not null and rollup_payload ? 'analyticsHome' then
    return rollup_payload->'analyticsHome';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'hero', jsonb_build_object(
      'players', 0,
      'games', 0,
      'views', 0
    ),
    'cards', '[]'::jsonb
  );
end;
$$;

create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_stats_screen.profile_id;

  if rollup_payload is not null and rollup_payload ? 'statsScreen' then
    return rollup_payload->'statsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Stats overview',
        'takeaway', 'No stats rollup is available yet.',
        'games', 0,
        'players', 0
      ),
      'cards', '[]'::jsonb,
      'topSignals', '[]'::jsonb
    ),
    'players', jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object(
          'id', profile_id,
          'label', 'Current player',
          'playerName', null,
          'displayName', null
        )
      ),
      'selectedPlayerId', profile_id,
      'detail', jsonb_build_object(
        'playerId', profile_id,
        'label', 'Current player',
        'summary', 'No player detail is available yet.',
        'stats', jsonb_build_object(
          'games', 0,
          'playerRows', 0
        )
      )
    ),
    'playstyle', jsonb_build_object(
      'summary', 'No playstyle data is available yet.',
      'highlights', '[]'::jsonb
    ),
    'correlations', jsonb_build_object(
      'summary', 'No correlations are available yet.',
      'items', '[]'::jsonb,
      'selectedKey', null
    ),
    'games', jsonb_build_object(
      'items', '[]'::jsonb,
      'selectedGameId', null,
      'detail', null
    )
  );
end;
$$;

create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_insights_screen.profile_id;

  if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
    return rollup_payload->'insightsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'meta', jsonb_build_object(
      'games', 0,
      'playerRows', 0
    ),
    'topSignals', '[]'::jsonb,
    'assistNetwork', jsonb_build_object(
      'nodes', '[]'::jsonb,
      'edges', '[]'::jsonb
    ),
    'correlations', jsonb_build_object(
      'summary', 'No insight correlations are available yet.',
      'items', '[]'::jsonb,
      'selectedKey', null
    )
  );
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
  scoped_player_ids_jsonb jsonb := coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb);
  exact_scope_player_ids_jsonb jsonb := case
    when coalesce(array_length(scoped_player_ids, 1), 0) >= 2 then coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb)
    else '[]'::jsonb
  end;
  default_metric_key text := coalesce(metric_key, 'totalPrestige');
  default_line_mode text := coalesce(line_mode, 'raw');
  default_graph_mode text := coalesce(graph_mode, 'network');
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_chart_dataset.profile_id;

  if rollup_payload is not null and rollup_payload ? 'charts' then
    stored_chart := rollup_payload->'charts'->normalized_chart_key;
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

  effective_point_count := case
    when jsonb_typeof(effective_meta->'pointCount') = 'number' then
      (effective_meta->>'pointCount')::int
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
