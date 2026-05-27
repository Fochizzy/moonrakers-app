-- Restores chart RPCs for linked projects where the earlier analytics migration
-- was applied before these functions existed in the checked-in file.

create or replace function public.get_chart_setup(
  chart_key text,
  profile_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  normalized_chart_key text := lower(coalesce(chart_key, 'default'));
  focus_player_options jsonb := '[]'::jsonb;
  compare_player_options jsonb := '[]'::jsonb;
  scope_player_options jsonb := '[]'::jsonb;
  metric_options jsonb := '[]'::jsonb;
  line_mode_options jsonb := '[]'::jsonb;
  elo_view_options jsonb := '[]'::jsonb;
  opponent_options jsonb := '[]'::jsonb;
  default_focus_player_id uuid := null;
  default_compare_player_id uuid := null;
  default_scoped_player_ids uuid[] := array[]::uuid[];
  default_metric_key text := null;
  default_line_mode text := null;
  default_elo_tab text := null;
  total_players integer := 0;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select count(*)
  into total_players
  from public.profiles;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', public.profiles.id,
        'label', coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player')
      )
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    ),
    '[]'::jsonb
  )
  into focus_player_options
  from public.profiles;

  if exists (
    select 1
    from public.profiles
    where public.profiles.id = profile_id
  ) then
    default_focus_player_id := profile_id;
  else
    select public.profiles.id
    into default_focus_player_id
    from public.profiles
    order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', public.profiles.id,
        'label', coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player')
      )
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    ),
    '[]'::jsonb
  )
  into compare_player_options
  from public.profiles
  where public.profiles.id is distinct from default_focus_player_id;

  select public.profiles.id
  into default_compare_player_id
  from public.profiles
  where public.profiles.id is distinct from default_focus_player_id
  order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
  limit 1;

  if normalized_chart_key in (
    'elo',
    'prestige_over_time',
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'bump_chart',
    'bar_chart',
    'bar',
    'heatmap',
    'efficiency_failure_scatter',
    'relationship_graph',
    'consistency_band',
    'stacked_bar_chart',
    'compare'
  ) then
    scope_player_options := focus_player_options;

    select coalesce(array_agg(choice.id), array[]::uuid[])
    into default_scoped_player_ids
    from (
      select public.profiles.id
      from public.profiles
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
      limit 4
    ) as choice;
  end if;

  if normalized_chart_key not in ('head_to_head', 'rivalry_graph', 'sparkline', 'compare') then
    compare_player_options := '[]'::jsonb;
    default_compare_player_id := null;
  end if;

  if normalized_chart_key in (
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time',
    'sparkline',
    'bar_chart',
    'bar',
    'bump_chart',
    'consistency_band',
    'heatmap'
  ) then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'score', 'label', 'Score'),
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'prestige', 'label', 'Prestige'),
      jsonb_build_object('key', 'directPrestige', 'label', 'Direct Prestige'),
      jsonb_build_object('key', 'assistPrestigeReceived', 'label', 'Assist Prestige Received'),
      jsonb_build_object('key', 'objectivePrestige', 'label', 'Objective Prestige'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'failures', 'label', 'Failures'),
      jsonb_build_object('key', 'turns', 'label', 'Turns'),
      jsonb_build_object('key', 'efficiency', 'label', 'Efficiency'),
      jsonb_build_object('key', 'assistEfficiency', 'label', 'Assist Efficiency'),
      jsonb_build_object('key', 'directEfficiency', 'label', 'Direct Efficiency'),
      jsonb_build_object('key', 'contractSuccessRate', 'label', 'Contract Success Rate'),
      jsonb_build_object('key', 'netPrestige', 'label', 'Net Prestige'),
      jsonb_build_object('key', 'supportBalance', 'label', 'Support Balance')
    );
    default_metric_key := 'totalPrestige';
  elsif normalized_chart_key = 'stacked_bar_chart' then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'score', 'label', 'Score'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'failures', 'label', 'Failures')
    );
    default_metric_key := 'totalPrestige';
  elsif normalized_chart_key in ('replay_chart', 'replay') then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'directPrestige', 'label', 'Direct Prestige'),
      jsonb_build_object('key', 'assistPrestigeReceived', 'label', 'Assist Prestige Received'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'failures', 'label', 'Failures')
    );
    default_metric_key := 'totalPrestige';
  end if;

  if normalized_chart_key in (
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time'
  ) then
    line_mode_options := jsonb_build_array(
      jsonb_build_object('key', 'raw', 'label', 'Raw'),
      jsonb_build_object('key', 'cumulative', 'label', 'Cumulative'),
      jsonb_build_object('key', 'average', 'label', 'Average')
    );
    default_line_mode := 'raw';
  end if;

  if normalized_chart_key = 'elo' then
    elo_view_options := jsonb_build_array(
      jsonb_build_object('key', 'Leaderboard', 'label', 'Leaderboard'),
      jsonb_build_object('key', 'Momentum', 'label', 'Momentum'),
      jsonb_build_object('key', 'Skills', 'label', 'Skills'),
      jsonb_build_object('key', 'Context', 'label', 'Context'),
      jsonb_build_object('key', 'Projection', 'label', 'Projection')
    );
    default_elo_tab := 'Leaderboard';
    opponent_options := jsonb_build_array(
      jsonb_build_object('key', 'none', 'label', 'None')
    ) || compare_player_options;
  end if;

  return jsonb_build_object(
    'chartKey', normalized_chart_key,
    'generatedAt', now(),
    'focusPlayerOptions', focus_player_options,
    'comparePlayerOptions', compare_player_options,
    'scopePlayerOptions', scope_player_options,
    'metricOptions', metric_options,
    'lineModeOptions', line_mode_options,
    'eloViewOptions', elo_view_options,
    'opponentOptions', opponent_options,
    'defaults', jsonb_build_object(
      'focusPlayerId', default_focus_player_id,
      'comparePlayerId', default_compare_player_id,
      'scopedPlayerIds', to_jsonb(default_scoped_player_ids),
      'metricKey', default_metric_key,
      'lineMode', default_line_mode,
      'eloTab', default_elo_tab,
      'opponentId', null
    ),
    'emptyState', case
      when total_players = 0 then jsonb_build_object(
        'title', 'No chart setup data yet',
        'description', 'Create at least one profile in Supabase to unlock chart setup options.'
      )
      else null
    end
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
  rollup_game_history jsonb := '[]'::jsonb;
  rollup_assist_network jsonb := '{}'::jsonb;
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
  fallback_source_games jsonb := '[]'::jsonb;
  fallback_source_players jsonb := '[]'::jsonb;
  fallback_replay jsonb := '[]'::jsonb;
  fallback_replay_players jsonb := '[]'::jsonb;
  relationship_graph_players jsonb := '[]'::jsonb;
  relationship_graph_edges jsonb := '[]'::jsonb;
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
  resolved_selected_game_id uuid := null;
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

  if rollup_payload is not null and rollup_payload ? 'charts' then
    stored_chart := rollup_payload->'charts'->normalized_chart_key;
  end if;

  rollup_game_history := case
    when jsonb_typeof(rollup_payload->'statsScreen'->'games'->'items') = 'array' then
      rollup_payload->'statsScreen'->'games'->'items'
    else '[]'::jsonb
  end;

  rollup_assist_network := case
    when jsonb_typeof(rollup_payload->'insightsScreen'->'assistNetwork') = 'object' then
      rollup_payload->'insightsScreen'->'assistNetwork'
    else '{}'::jsonb
  end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', history_game->'id',
        'createdAt', to_jsonb(
          coalesce(
            ((extract(epoch from nullif(history_game->>'finishedAt', '')::timestamptz) * 1000)::bigint),
            ((extract(epoch from nullif(history_game->>'createdAt', '')::timestamptz) * 1000)::bigint),
            0::bigint
          )
        ),
        'winnerId', history_game->'winnerId',
        'selectedWinnerId', history_game->'winnerId',
        'manualWinnerId', history_game->'winnerId',
        'players', case
          when jsonb_typeof(history_game->'players') = 'array' then history_game->'players'
          else '[]'::jsonb
        end,
        'totals', coalesce(
          (
            select jsonb_object_agg(
              player_id,
              jsonb_build_object(
                'name', player_name,
                'playerName', player_name,
                'score', player_total_prestige,
                'totalPrestige', player_total_prestige,
                'prestige', player_total_prestige
              )
            )
            from (
              select
                coalesce(nullif(player_row->>'id', ''), player_row->>'profileId') as player_id,
                coalesce(nullif(player_row->>'name', ''), 'Player') as player_name,
                coalesce((player_row->>'totalPrestige')::numeric, 0) as player_total_prestige
              from jsonb_array_elements(
                case
                  when jsonb_typeof(history_game->'players') = 'array' then history_game->'players'
                  else '[]'::jsonb
                end
              ) as player_row
            ) as totals_rows
            where player_id <> ''
          ),
          '{}'::jsonb
        )
      )
      order by coalesce(
        nullif(history_game->>'finishedAt', ''),
        nullif(history_game->>'createdAt', ''),
        history_game->>'id'
      ) asc
    ),
    '[]'::jsonb
  )
  into fallback_source_games
  from jsonb_array_elements(rollup_game_history) as history_game;

  select coalesce(
    jsonb_agg(player_value order by sort_name asc, player_id asc),
    '[]'::jsonb
  )
  into fallback_source_players
  from (
    select distinct on (player_id)
      player_id,
      lower(coalesce(nullif(player_row->>'name', ''), 'Player')) as sort_name,
      jsonb_build_object(
        'id', player_id,
        'name', coalesce(nullif(player_row->>'name', ''), 'Player'),
        'color', nullif(player_row->>'color', ''),
        'assignedCardArtIndex', case
          when player_row ? 'assignedCardArtIndex' then player_row->'assignedCardArtIndex'
          else 'null'::jsonb
        end
      ) as player_value
    from jsonb_array_elements(rollup_game_history) as history_game
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(history_game->'players') = 'array' then history_game->'players'
        else '[]'::jsonb
      end
    ) as player_row
    cross join lateral (
      select coalesce(nullif(player_row->>'id', ''), player_row->>'profileId') as player_id
    ) as player_key
    where player_id <> ''
    order by player_id asc, nullif(player_row->>'color', '') desc, sort_name asc
  ) as dedup_players;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', node->'id',
        'name', to_jsonb(coalesce(nullif(node->>'label', ''), nullif(node->>'name', ''), 'Player')),
        'color', node->'color',
        'assignedCardArtIndex', case
          when node ? 'assignedCardArtIndex' then node->'assignedCardArtIndex'
          else 'null'::jsonb
        end
      )
      order by lower(coalesce(nullif(node->>'label', ''), nullif(node->>'name', ''), 'Player')) asc
    ),
    '[]'::jsonb
  )
  into relationship_graph_players
  from jsonb_array_elements(
    case
      when jsonb_typeof(rollup_assist_network->'nodes') = 'array' then rollup_assist_network->'nodes'
      else '[]'::jsonb
    end
  ) as node
  where coalesce(nullif(node->>'id', ''), '') <> '';

  relationship_graph_edges := case
    when jsonb_typeof(rollup_assist_network->'edges') = 'array' then rollup_assist_network->'edges'
    else '[]'::jsonb
  end;

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

  resolved_selected_game_id := coalesce(
    selected_game_id,
    nullif(effective_data->>'selectedGameId', '')::uuid
  );

  if normalized_chart_key = 'replay_chart' and resolved_selected_game_id is not null then
    with selected_game as (
      select g.id
      from public.games as g
      where g.id = resolved_selected_game_id
        and g.status = 'finished'
        and (
          g.host_profile_id = auth.uid()
          or exists (
            select 1
            from public.game_participants as auth_gp
            where auth_gp.game_id = g.id
              and auth_gp.profile_id = auth.uid()
          )
        )
      limit 1
    ),
    replay_players as (
      select
        gp.id as participant_id,
        coalesce(gp.profile_id::text, gp.id::text) as player_id,
        coalesce(
          nullif(profile.display_name, ''),
          nullif(gp.display_name_snapshot, ''),
          gp.player_name_snapshot,
          'Player'
        ) as player_name,
        gp.color_snapshot as color,
        gp.start_order
      from public.game_participants as gp
      join selected_game as sg on sg.id = gp.game_id
      left join public.profiles as profile on profile.id = gp.profile_id
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', replay_player.player_id,
          'name', replay_player.player_name,
          'color', replay_player.color
        )
        order by replay_player.start_order asc, lower(replay_player.player_name) asc
      ),
      '[]'::jsonb
    )
    into fallback_replay_players
    from replay_players as replay_player;

    with selected_game as (
      select g.id
      from public.games as g
      where g.id = resolved_selected_game_id
        and g.status = 'finished'
        and (
          g.host_profile_id = auth.uid()
          or exists (
            select 1
            from public.game_participants as auth_gp
            where auth_gp.game_id = g.id
              and auth_gp.profile_id = auth.uid()
          )
        )
      limit 1
    ),
    replay_players as (
      select
        gp.id as participant_id,
        coalesce(gp.profile_id::text, gp.id::text) as player_id,
        coalesce(
          nullif(profile.display_name, ''),
          nullif(gp.display_name_snapshot, ''),
          gp.player_name_snapshot,
          'Player'
        ) as player_name,
        gp.color_snapshot as color,
        gp.start_order
      from public.game_participants as gp
      join selected_game as sg on sg.id = gp.game_id
      left join public.profiles as profile on profile.id = gp.profile_id
    ),
    replay_assist_received as (
      select
        recipient.participant_id,
        gr.round_index,
        coalesce(sum(greatest(coalesce(nullif(edge.value, '')::numeric, 0), 0)), 0)::numeric as assist_prestige_received
      from public.game_rounds as gr
      join selected_game as sg on sg.id = gr.game_id
      join replay_players as source_player on source_player.participant_id = gr.participant_id
      join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key, value) on true
      join replay_players as recipient
        on recipient.player_id = btrim(edge.key)
      where btrim(edge.key) <> ''
      group by recipient.participant_id, gr.round_index
    ),
    replay_turn_rows as (
      select
        row_number() over (
          order by gr.round_index asc, replay_player.start_order asc, replay_player.player_id asc
        )::int as event_index,
        replay_player.player_id,
        replay_player.player_name,
        replay_player.color,
        greatest(
          coalesce(gr.prestige, 0)
          - coalesce(replay_assist_received.assist_prestige_received, 0)
          - coalesce(gr.objective_prestige, 0),
          0
        )::numeric as direct_prestige,
        coalesce(replay_assist_received.assist_prestige_received, 0)::numeric as assist_prestige_received,
        coalesce(gr.objective_prestige, 0)::numeric as objective_prestige,
        coalesce(gr.contracts, 0)::int as contracts,
        coalesce(gr.failures, 0)::int as failures,
        coalesce((
          select sum(greatest(coalesce(nullif(assist_count.value, '')::int, 0), 0))
          from jsonb_each_text(gr.assist_recipients) as assist_count(key, value)
        ), 0)::int as assists
      from public.game_rounds as gr
      join selected_game as sg on sg.id = gr.game_id
      join replay_players as replay_player on replay_player.participant_id = gr.participant_id
      left join replay_assist_received
        on replay_assist_received.participant_id = gr.participant_id
       and replay_assist_received.round_index = gr.round_index
    ),
    replay_running as (
      select
        replay_turn.event_index,
        replay_turn.player_id,
        replay_turn.player_name,
        replay_turn.color,
        sum(
          replay_turn.direct_prestige
          + replay_turn.assist_prestige_received
          + replay_turn.objective_prestige
        ) over player_window as total_prestige,
        sum(replay_turn.direct_prestige) over player_window as direct_prestige_total,
        sum(replay_turn.assist_prestige_received) over player_window as assist_prestige_received_total,
        sum(replay_turn.objective_prestige) over player_window as objective_prestige_total,
        sum(replay_turn.contracts) over player_window as contracts_total,
        sum(replay_turn.failures) over player_window as failures_total,
        sum(replay_turn.assists) over player_window as assists_total,
        row_number() over (
          partition by replay_turn.player_id
          order by replay_turn.event_index
        )::int as turns_total
      from replay_turn_rows as replay_turn
      window player_window as (
        partition by replay_turn.player_id
        order by replay_turn.event_index
        rows between unbounded preceding and current row
      )
    ),
    replay_states as (
      select
        replay_running.event_index,
        replay_running.player_id,
        jsonb_build_object(
          'playerId', replay_running.player_id,
          'playerName', replay_running.player_name,
          'label', replay_running.player_name,
          'color', replay_running.color,
          'score', replay_running.total_prestige,
          'totalPrestige', replay_running.total_prestige,
          'prestige', replay_running.total_prestige,
          'directPrestige', replay_running.direct_prestige_total,
          'assistPrestigeReceived', replay_running.assist_prestige_received_total,
          'objectivePrestige', replay_running.objective_prestige_total,
          'assists', replay_running.assists_total,
          'contracts', replay_running.contracts_total,
          'failures', replay_running.failures_total,
          'turns', replay_running.turns_total,
          'efficiency', case
            when replay_running.turns_total > 0 then replay_running.total_prestige / replay_running.turns_total
            else 0
          end,
          'assistEfficiency', case
            when replay_running.turns_total > 0 then replay_running.assist_prestige_received_total / replay_running.turns_total
            else 0
          end,
          'directEfficiency', case
            when replay_running.turns_total > 0 then replay_running.direct_prestige_total / replay_running.turns_total
            else 0
          end,
          'contractSuccessRate', case
            when replay_running.contracts_total + replay_running.failures_total > 0 then
              (replay_running.contracts_total::numeric / (replay_running.contracts_total + replay_running.failures_total)::numeric) * 100
            else 0
          end,
          'netPrestige',
          replay_running.direct_prestige_total
          + replay_running.assist_prestige_received_total
          + replay_running.objective_prestige_total,
          'supportBalance',
          replay_running.assist_prestige_received_total
          - replay_running.direct_prestige_total
        ) as player_state
      from replay_running
    ),
    replay_snapshots as (
      select
        replay_state.event_index,
        jsonb_object_agg(replay_state.player_id, replay_state.player_state) over (
          order by replay_state.event_index
          rows between unbounded preceding and current row
        ) as running_snapshot
      from replay_states as replay_state
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'round', replay_snapshot.event_index,
          'gameIndex', replay_snapshot.event_index,
          'label', concat('Round ', replay_snapshot.event_index),
          'snapshot', replay_snapshot.running_snapshot
        )
        order by replay_snapshot.event_index
      ),
      '[]'::jsonb
    )
    into fallback_replay
    from replay_snapshots as replay_snapshot;
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
    when normalized_chart_key in ('elo', 'rivalry_graph', 'head_to_head') then jsonb_array_length(fallback_source_games)
    when normalized_chart_key = 'replay_chart' then greatest(
      case
        when jsonb_typeof(effective_data->'replay') = 'array' then jsonb_array_length(effective_data->'replay')
        else 0
      end,
      jsonb_array_length(fallback_replay)
    )
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
      case
        when effective_data ? 'primary' and effective_data->'primary' <> 'null'::jsonb then 1
        else 0
      end
    when normalized_chart_key in ('elo', 'rivalry_graph', 'head_to_head', 'replay_chart') then
      game_count
    when normalized_chart_key = 'sparkline' then
      greatest(
        case
          when jsonb_typeof(effective_data->'data') = 'array' then jsonb_array_length(effective_data->'data')
          else 0
        end,
        case
          when jsonb_typeof(effective_data->'comparisonData') = 'array' then jsonb_array_length(effective_data->'comparisonData')
          else 0
        end
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
        when jsonb_typeof(effective_data->'games') = 'array' and jsonb_array_length(effective_data->'games') > 0 then effective_data->'games'
        else fallback_source_games
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' and jsonb_array_length(effective_data->'players') > 0 then effective_data->'players'
        else fallback_source_players
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
        when jsonb_typeof(effective_data->'replay') = 'array' and jsonb_array_length(effective_data->'replay') > 0 then effective_data->'replay'
        else fallback_replay
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' and jsonb_array_length(effective_data->'players') > 0 then effective_data->'players'
        else fallback_replay_players
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedGameId', coalesce(effective_data->'selectedGameId', to_jsonb(resolved_selected_game_id))
    )
    when normalized_chart_key = 'rivalry_graph' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' and jsonb_array_length(effective_data->'games') > 0 then effective_data->'games'
        else fallback_source_games
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' and jsonb_array_length(effective_data->'players') > 0 then effective_data->'players'
        else fallback_source_players
      end,
      'playerId', coalesce(effective_data->'playerId', to_jsonb(focus_player_id))
    )
    when normalized_chart_key = 'head_to_head' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' and jsonb_array_length(effective_data->'games') > 0 then effective_data->'games'
        else fallback_source_games
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' and jsonb_array_length(effective_data->'players') > 0 then effective_data->'players'
        else fallback_source_players
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

  if normalized_chart_key = 'relationship_graph' then
    effective_data := effective_data || jsonb_build_object(
      'nodes', case
        when jsonb_typeof(effective_data->'nodes') = 'array' and jsonb_array_length(effective_data->'nodes') > 0 then
          effective_data->'nodes'
        when jsonb_typeof(rollup_assist_network->'nodes') = 'array' then
          rollup_assist_network->'nodes'
        else '[]'::jsonb
      end,
      'edges', case
        when jsonb_typeof(effective_data->'edges') = 'array' and jsonb_array_length(effective_data->'edges') > 0 then
          effective_data->'edges'
        else relationship_graph_edges
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' and jsonb_array_length(effective_data->'players') > 0 then
          effective_data->'players'
        else relationship_graph_players
      end,
      'relationships', case
        when jsonb_typeof(effective_data->'relationships') = 'array' and jsonb_array_length(effective_data->'relationships') > 0 then
          effective_data->'relationships'
        when jsonb_typeof(effective_data->'edges') = 'array' and jsonb_array_length(effective_data->'edges') > 0 then
          effective_data->'edges'
        else relationship_graph_edges
      end
    );
  end if;

  if jsonb_typeof(effective_data) = 'object' then
    effective_data := effective_data || jsonb_build_object('meta', effective_meta);
    effective_data := effective_data || jsonb_build_object(
      'sourceGames', case
        when jsonb_typeof(effective_data->'sourceGames') = 'array' and jsonb_array_length(effective_data->'sourceGames') > 0 then
          effective_data->'sourceGames'
        else fallback_source_games
      end,
      'sourcePlayers', case
        when jsonb_typeof(effective_data->'sourcePlayers') = 'array' and jsonb_array_length(effective_data->'sourcePlayers') > 0 then
          effective_data->'sourcePlayers'
        else fallback_source_players
      end
    );
  end if;

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

revoke all on function public.get_chart_setup(text, uuid) from public;
revoke all on function public.get_chart_setup(text, uuid) from anon;
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from public;
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from anon;

grant execute on function public.get_chart_setup(text, uuid) to authenticated;
grant execute on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) to authenticated;
