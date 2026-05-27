do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_stats_screen'
      and oidvectortypes(p.proargtypes) = 'uuid'
  ) and not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_stats_screen_phase1_base_20260527'
      and oidvectortypes(p.proargtypes) = 'uuid'
  ) then
    alter function public.get_stats_screen(uuid)
      rename to get_stats_screen_phase1_base_20260527;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_insights_screen'
      and oidvectortypes(p.proargtypes) = 'uuid'
  ) and not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_insights_screen_phase1_base_20260527'
      and oidvectortypes(p.proargtypes) = 'uuid'
  ) then
    alter function public.get_insights_screen(uuid)
      rename to get_insights_screen_phase1_base_20260527;
  end if;
end
$$;

create or replace function private.phase1_turn_order_overview(target_profile_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  with seat_rows as (
    select
      gp.start_order as seat,
      count(*)::int as appearances,
      count(*) filter (where gp.is_winner)::int as wins,
      round(
        case
          when count(*) > 0 then count(*) filter (where gp.is_winner)::numeric / count(*)
          else 0
        end,
        3
      ) as win_rate,
      round(coalesce(avg(gp.total_prestige), 0), 1) as avg_prestige
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
    group by gp.start_order
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'seat', seat_rows.seat,
        'label', concat('Seat ', seat_rows.seat),
        'appearances', seat_rows.appearances,
        'wins', seat_rows.wins,
        'winRate', seat_rows.win_rate,
        'avgPrestige', seat_rows.avg_prestige
      )
      order by seat_rows.seat
    ),
    '[]'::jsonb
  )
  from seat_rows;
$$;

create or replace function private.phase1_turn_order_by_table_size(target_profile_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  with per_game_sizes as (
    select
      gp.game_id,
      count(*)::int as table_size
    from public.game_participants as gp
    group by gp.game_id
  ),
  seat_rows as (
    select
      per_game_sizes.table_size,
      gp.start_order as seat,
      count(*)::int as appearances,
      count(*) filter (where gp.is_winner)::int as wins,
      round(
        case
          when count(*) > 0 then count(*) filter (where gp.is_winner)::numeric / count(*)
          else 0
        end,
        3
      ) as win_rate,
      round(coalesce(avg(gp.total_prestige), 0), 1) as avg_prestige
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    join per_game_sizes
      on per_game_sizes.game_id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
    group by per_game_sizes.table_size, gp.start_order
  ),
  grouped_rows as (
    select
      seat_rows.table_size,
      jsonb_agg(
        jsonb_build_object(
          'seat', seat_rows.seat,
          'label', concat('Seat ', seat_rows.seat),
          'tableSize', seat_rows.table_size,
          'appearances', seat_rows.appearances,
          'wins', seat_rows.wins,
          'winRate', seat_rows.win_rate,
          'avgPrestige', seat_rows.avg_prestige
        )
        order by seat_rows.seat
      ) as rows
    from seat_rows
    group by seat_rows.table_size
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tableSize', grouped_rows.table_size,
        'label', concat(grouped_rows.table_size, '-player tables'),
        'summary', concat(
          jsonb_array_length(grouped_rows.rows),
          ' tracked seat lane',
          case when jsonb_array_length(grouped_rows.rows) = 1 then '' else 's' end
        ),
        'rows', grouped_rows.rows
      )
      order by grouped_rows.table_size
    ),
    '[]'::jsonb
  )
  from grouped_rows;
$$;

create or replace function private.phase1_turn_order_summary(
  target_profile_id uuid,
  overview_rows jsonb
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with corr_source as (
    select
      gp.start_order::double precision as seat_value,
      case
        when gp.is_winner then 1::double precision
        else 0::double precision
      end as win_value
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
  ),
  correlation_value as (
    select coalesce(corr(corr_source.seat_value, corr_source.win_value)::numeric, 0) as turn_order_win_correlation
    from corr_source
  ),
  best_row as (
    select row_value
    from jsonb_array_elements(overview_rows) as row_value
    order by
      coalesce((row_value->>'winRate')::numeric, 0) desc,
      coalesce((row_value->>'appearances')::int, 0) desc,
      coalesce((row_value->>'seat')::int, 999)
    limit 1
  ),
  worst_row as (
    select row_value
    from jsonb_array_elements(overview_rows) as row_value
    order by
      coalesce((row_value->>'winRate')::numeric, 0) asc,
      coalesce((row_value->>'appearances')::int, 0) desc,
      coalesce((row_value->>'seat')::int, 999)
    limit 1
  ),
  totals as (
    select count(*)::int as total_games
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
  )
  select jsonb_build_object(
    'totalGames', totals.total_games,
    'turnOrderWinCorrelation', round(correlation_value.turn_order_win_correlation, 3),
    'bestSeat', (select row_value from best_row),
    'worstSeat', (select row_value from worst_row),
    'summary', case
      when totals.total_games = 0 then 'No finished games yet for turn-order analysis.'
      else format(
        'Seat-to-win correlation across %s finished game%s.',
        totals.total_games,
        case when totals.total_games = 1 then '' else 's' end
      )
    end
  )
  from totals
  cross join correlation_value;
$$;

create or replace function private.phase1_form_closing_cluster(base_payload jsonb)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'key', 'formClosing',
    'label', 'Form closing',
    'summary', coalesce(
      base_payload->'paceProfile'->>'description',
      'Closing-form context is not available yet.'
    ),
    'metrics', jsonb_build_array(
      jsonb_build_object(
        'key', 'avgOpeningTurns',
        'label', 'Opening turns',
        'value', coalesce((base_payload->'paceProfile'->>'avgOpeningTurns')::numeric, 0)
      ),
      jsonb_build_object(
        'key', 'avgClosingTurns',
        'label', 'Closing turns',
        'value', coalesce((base_payload->'paceProfile'->>'avgClosingTurns')::numeric, 0)
      ),
      jsonb_build_object(
        'key', 'avgClosingTurnsWin',
        'label', 'Closing turns in wins',
        'value', coalesce((base_payload->'paceProfile'->>'avgClosingTurnsWin')::numeric, 0)
      ),
      jsonb_build_object(
        'key', 'avgClosingTurnsLoss',
        'label', 'Closing turns in losses',
        'value', coalesce((base_payload->'paceProfile'->>'avgClosingTurnsLoss')::numeric, 0)
      )
    )
  );
$$;

create or replace function private.phase1_pressure_context_cluster(target_profile_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  with finished_rows as (
    select
      gp.game_id,
      gp.assists,
      gp.assist_prestige_received,
      gp.is_winner
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
  ),
  assist_leaders as (
    select
      gp.game_id,
      max(gp.assists)::numeric as max_assists
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where g.status = 'finished'
    group by gp.game_id
  ),
  support_rollup as (
    select
      count(*)::int as games_played,
      round(coalesce(avg(finished_rows.assists), 0), 2) as avg_assists,
      round(coalesce(avg(finished_rows.assist_prestige_received), 0), 2) as avg_assist_prestige,
      round(
        coalesce(avg(coalesce(assist_leaders.max_assists, 0) - coalesce(finished_rows.assists, 0)), 0),
        2
      ) as assist_gap_to_leader,
      round(
        coalesce(
          avg(
            case
              when finished_rows.is_winner then 1::numeric
              else 0::numeric
            end
          ),
          0
        ),
        3
      ) as support_win_rate
    from finished_rows
    left join assist_leaders
      on assist_leaders.game_id = finished_rows.game_id
  )
  select jsonb_build_object(
    'key', 'pressureContext',
    'label', 'Pressure context',
    'summary', case
      when support_rollup.games_played = 0 then 'No finished games yet for support-pressure context.'
      else format(
        'Support context across %s finished game%s.',
        support_rollup.games_played,
        case when support_rollup.games_played = 1 then '' else 's' end
      )
    end,
    'highlightKey', 'assistGapToLeader',
    'metrics', jsonb_build_array(
      jsonb_build_object(
        'key', 'assistGapToLeader',
        'label', 'Assist gap to leader',
        'value', support_rollup.assist_gap_to_leader
      ),
      jsonb_build_object(
        'key', 'avgAssists',
        'label', 'Average assists',
        'value', support_rollup.avg_assists
      ),
      jsonb_build_object(
        'key', 'assistPrestigeReceived',
        'label', 'Assist prestige received',
        'value', support_rollup.avg_assist_prestige
      ),
      jsonb_build_object(
        'key', 'supportWinRate',
        'label', 'Win rate under support load',
        'value', support_rollup.support_win_rate
      )
    )
  )
  from support_rollup;
$$;

create or replace function private.phase1_featured_macro_rows(
  target_profile_id uuid,
  viewer_profile_id uuid
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with target_games as (
    select g.id as game_id
    from public.games as g
    where g.status = 'finished'
      and exists (
        select 1
        from public.game_participants as gp
        where gp.game_id = g.id
          and gp.profile_id = target_profile_id
      )
      and (
        target_profile_id = viewer_profile_id
        or exists (
          select 1
          from public.game_participants as viewer_gp
          where viewer_gp.game_id = g.id
            and viewer_gp.profile_id = viewer_profile_id
        )
      )
  ),
  turn_windows as (
    select
      gp.id as participant_id,
      gp.game_id,
      gp.profile_id,
      gp.start_order,
      gp.assists,
      gp.contracts,
      gp.failures,
      gp.is_winner,
      gp.total_prestige,
      coalesce(turn_counts.total_turns, 0) as total_turns,
      coalesce(closing_turns.closing_prestige, 0) as closing_prestige
    from public.game_participants as gp
    join target_games
      on target_games.game_id = gp.game_id
    left join lateral (
      select count(*)::numeric as total_turns
      from public.game_rounds as gr_count
      where gr_count.participant_id = gp.id
    ) as turn_counts on true
    left join lateral (
      select sum(gr_close.prestige)::numeric as closing_prestige
      from public.game_rounds as gr_close
      where gr_close.participant_id = gp.id
        and gr_close.player_turn > gr_close.total_turns - 3
    ) as closing_turns on true
    where gp.profile_id is not null
  ),
  late_leads as (
    select
      turn_windows.participant_id,
      case
        when turn_windows.closing_prestige > 0
          and turn_windows.closing_prestige = max(turn_windows.closing_prestige) over (partition by turn_windows.game_id)
        then 1::double precision
        else 0::double precision
      end as late_lead
    from turn_windows
  ),
  participant_samples as (
    select
      turn_windows.start_order::double precision as start_order_value,
      case
        when turn_windows.is_winner then 1::double precision
        else 0::double precision
      end as win_value,
      late_leads.late_lead,
      (
        coalesce(turn_windows.contracts, 0)::double precision / greatest(coalesce(turn_windows.failures, 0), 1)::double precision
      ) + (
        coalesce(turn_windows.total_prestige, 0)::double precision / nullif(turn_windows.total_turns, 0)::double precision
      ) as tempo_control,
      (
        coalesce(turn_windows.assists, 0) + coalesce(turn_windows.contracts, 0)
      )::double precision as interaction_index
    from turn_windows
    join late_leads
      on late_leads.participant_id = turn_windows.participant_id
  ),
  correlation_rollup as (
    select
      coalesce(corr(participant_samples.late_lead, participant_samples.win_value)::numeric, 0) as late_lead_conversion,
      coalesce(corr(participant_samples.tempo_control, participant_samples.win_value)::numeric, 0) as tempo_control,
      coalesce(corr(participant_samples.start_order_value, participant_samples.win_value)::numeric, 0) as turn_order_win_correlation,
      coalesce(corr(participant_samples.interaction_index, participant_samples.win_value)::numeric, 0) as interaction_index
    from participant_samples
  )
  select jsonb_build_array(
    jsonb_build_object(
      'key', 'lateLeadConversion',
      'label', 'Late lead conversion',
      'value', round(correlation_rollup.late_lead_conversion, 3),
      'strength', case
        when abs(correlation_rollup.late_lead_conversion) >= 0.5 then 'Strong'
        when abs(correlation_rollup.late_lead_conversion) >= 0.25 then 'Moderate'
        else 'Light'
      end
    ),
    jsonb_build_object(
      'key', 'tempoControl',
      'label', 'Tempo control',
      'value', round(correlation_rollup.tempo_control, 3),
      'strength', case
        when abs(correlation_rollup.tempo_control) >= 0.5 then 'Strong'
        when abs(correlation_rollup.tempo_control) >= 0.25 then 'Moderate'
        else 'Light'
      end
    ),
    jsonb_build_object(
      'key', 'turnOrderWinCorrelation',
      'label', 'Turn-order win correlation',
      'value', round(correlation_rollup.turn_order_win_correlation, 3),
      'strength', case
        when abs(correlation_rollup.turn_order_win_correlation) >= 0.5 then 'Strong'
        when abs(correlation_rollup.turn_order_win_correlation) >= 0.25 then 'Moderate'
        else 'Light'
      end
    ),
    jsonb_build_object(
      'key', 'interactionIndex',
      'label', 'Interaction index',
      'value', round(correlation_rollup.interaction_index, 3),
      'strength', case
        when abs(correlation_rollup.interaction_index) >= 0.5 then 'Strong'
        when abs(correlation_rollup.interaction_index) >= 0.25 then 'Moderate'
        else 'Light'
      end
    )
  )
  from correlation_rollup;
$$;

create or replace function private.phase1_merge_macro_rows(
  existing_macro_rows jsonb,
  featured_macro_rows jsonb
)
returns jsonb
language sql
stable
as $$
  with existing_source as (
    select
      row_value,
      0 as sort_bucket,
      row_number() over () as ordinal
    from jsonb_array_elements(coalesce(existing_macro_rows, '[]'::jsonb)) as row_value
  ),
  existing_rows as (
    select
      existing_source.row_value,
      existing_source.sort_bucket,
      existing_source.ordinal,
      coalesce(
        nullif(lower(regexp_replace(trim(existing_source.row_value->>'key'), '[^a-z0-9]+', '', 'g')), ''),
        nullif(lower(regexp_replace(trim(existing_source.row_value->>'label'), '[^a-z0-9]+', '', 'g')), ''),
        format('__legacy__:%s:%s', existing_source.sort_bucket, existing_source.ordinal)
      ) as row_identity
    from existing_source
  ),
  featured_source as (
    select
      row_value,
      1 as sort_bucket,
      row_number() over () as ordinal
    from jsonb_array_elements(coalesce(featured_macro_rows, '[]'::jsonb)) as row_value
  ),
  featured_rows as (
    select
      featured_source.row_value,
      featured_source.sort_bucket,
      featured_source.ordinal,
      coalesce(
        nullif(lower(regexp_replace(trim(featured_source.row_value->>'key'), '[^a-z0-9]+', '', 'g')), ''),
        nullif(lower(regexp_replace(trim(featured_source.row_value->>'label'), '[^a-z0-9]+', '', 'g')), ''),
        format('__legacy__:%s:%s', featured_source.sort_bucket, featured_source.ordinal)
      ) as row_identity
    from featured_source
  ),
  ranked_rows as (
    select
      merged.row_value,
      merged.sort_bucket,
      merged.ordinal,
      row_number() over (
        partition by merged.row_identity
        order by merged.sort_bucket desc, merged.ordinal asc
      ) as row_rank
    from (
      select * from existing_rows
      union all
      select * from featured_rows
    ) as merged
  )
  select coalesce(
    jsonb_agg(ranked_rows.row_value order by ranked_rows.sort_bucket asc, ranked_rows.ordinal asc),
    '[]'::jsonb
  )
  from ranked_rows
  where ranked_rows.row_rank = 1;
$$;

create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  base_payload jsonb;
  turn_order_overview jsonb := '[]'::jsonb;
  turn_order_by_table_size jsonb := '[]'::jsonb;
  turn_order_summary jsonb := '{}'::jsonb;
begin
  base_payload := public.get_stats_screen_phase1_base_20260527(target_profile_id);

  turn_order_overview := private.phase1_turn_order_overview(target_profile_id);
  turn_order_by_table_size := private.phase1_turn_order_by_table_size(target_profile_id);
  turn_order_summary := private.phase1_turn_order_summary(target_profile_id, turn_order_overview);

  base_payload := jsonb_set(
    base_payload,
    '{overview,formClosing}',
    private.phase1_form_closing_cluster(base_payload),
    true
  );

  base_payload := jsonb_set(
    base_payload,
    '{players,detail,pressureContext}',
    private.phase1_pressure_context_cluster(target_profile_id),
    true
  );

  base_payload := jsonb_set(
    base_payload,
    '{games,turnOrderOverview}',
    turn_order_overview,
    true
  );

  base_payload := jsonb_set(
    base_payload,
    '{games,turnOrderByTableSize}',
    turn_order_by_table_size,
    true
  );

  base_payload := jsonb_set(
    base_payload,
    '{correlations,turnOrderSummary}',
    turn_order_summary,
    true
  );

  return base_payload;
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
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  viewer_profile_id uuid := auth.uid();
  base_payload jsonb;
  featured_macro_rows jsonb := '[]'::jsonb;
begin
  base_payload := public.get_insights_screen_phase1_base_20260527(target_profile_id);
  featured_macro_rows := private.phase1_featured_macro_rows(target_profile_id, viewer_profile_id);

  base_payload := jsonb_set(
    base_payload,
    '{correlations,macro}',
    private.phase1_merge_macro_rows(
      base_payload->'correlations'->'macro',
      featured_macro_rows
    ),
    true
  );

  return base_payload;
end;
$$;
