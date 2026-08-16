-- Restore the phase-1 stats clusters that the focus-player RPC rewrite dropped.
--
-- 20260527143000 wrapped public.get_stats_screen so the payload gained four
-- enrichment blocks: overview.formClosing, players.detail.pressureContext,
-- games.turnOrderOverview / games.turnOrderByTableSize, and
-- correlations.turnOrderSummary.
--
-- 20260706030843 then dropped and recreated get_stats_screen with the
-- focus_player_id signature. The new body returns private.get_stats_screen_rollup()
-- straight through, so none of the enrichment survived and every one of those
-- sections has been rendering empty in the app ever since. All of the private
-- helpers except phase1_turn_order_summary were dropped from the database too.
--
-- This migration recreates the helpers and re-applies the enrichment inside the
-- current get_stats_screen, keyed on the *focused* player rather than the
-- requester so the clusters follow the focus picker. Everything is schema
-- qualified because get_stats_screen runs security definer with search_path ''.

create or replace function private.phase1_turn_order_overview(target_profile_id uuid)
returns jsonb
language sql
stable
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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

-- The rollup's paceProfile no longer publishes the avgOpeningTurns /
-- avgClosingTurns keys the original cluster read, so restoring that version
-- verbatim would emit four metrics that all read 0. Read the keys the payload
-- actually carries, fall back to the legacy names when they are present, drop
-- any metric with no value behind it, and return an empty object when there is
-- no pace data at all so the section stays hidden instead of showing zeros.
create or replace function private.phase1_form_closing_cluster(base_payload jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with pace as (
    select coalesce(base_payload->'paceProfile', '{}'::jsonb) as profile
  ),
  candidate_metrics as (
    select jsonb_build_array(
      jsonb_build_object(
        'key', 'avgFirstHalf',
        'label', 'First-half prestige',
        'value', coalesce(
          (pace.profile->>'avgFirstHalf')::numeric,
          (pace.profile->>'avgOpeningTurns')::numeric
        )
      ),
      jsonb_build_object(
        'key', 'avgSecondHalf',
        'label', 'Second-half prestige',
        'value', coalesce(
          (pace.profile->>'avgSecondHalf')::numeric,
          (pace.profile->>'avgClosingTurns')::numeric
        )
      ),
      jsonb_build_object(
        'key', 'avgLateDelta',
        'label', 'Late-game delta',
        'value', (pace.profile->>'avgLateDelta')::numeric
      ),
      jsonb_build_object(
        'key', 'avgFirstHalfWin',
        'label', 'First half in wins',
        'value', coalesce(
          (pace.profile->>'avgFirstHalfWin')::numeric,
          (pace.profile->>'avgClosingTurnsWin')::numeric
        )
      ),
      jsonb_build_object(
        'key', 'avgFirstHalfLose',
        'label', 'First half in losses',
        'value', coalesce(
          (pace.profile->>'avgFirstHalfLose')::numeric,
          (pace.profile->>'avgClosingTurnsLoss')::numeric
        )
      )
    ) as metrics
    from pace
  ),
  kept_metrics as (
    select coalesce(
      jsonb_agg(entry.value order by entry.ordinality),
      '[]'::jsonb
    ) as metrics
    from candidate_metrics
    cross join lateral jsonb_array_elements(candidate_metrics.metrics)
      with ordinality as entry(value, ordinality)
    where jsonb_typeof(entry.value->'value') = 'number'
  )
  select case
    when jsonb_array_length(kept_metrics.metrics) = 0 then '{}'::jsonb
    else jsonb_build_object(
      'key', 'formClosing',
      'label', 'Form closing',
      'summary', coalesce(
        (select nullif(pace.profile->>'description', '') from pace),
        'Closing-form context is not available yet.'
      ),
      'metrics', kept_metrics.metrics
    )
  end
  from kept_metrics;
$$;

create or replace function private.phase1_pressure_context_cluster(target_profile_id uuid)
returns jsonb
language sql
stable
set search_path = ''
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

revoke all on function private.phase1_turn_order_overview(uuid) from public;
revoke all on function private.phase1_turn_order_overview(uuid) from anon;
revoke all on function private.phase1_turn_order_overview(uuid) from authenticated;

revoke all on function private.phase1_turn_order_by_table_size(uuid) from public;
revoke all on function private.phase1_turn_order_by_table_size(uuid) from anon;
revoke all on function private.phase1_turn_order_by_table_size(uuid) from authenticated;

revoke all on function private.phase1_turn_order_summary(uuid, jsonb) from public;
revoke all on function private.phase1_turn_order_summary(uuid, jsonb) from anon;
revoke all on function private.phase1_turn_order_summary(uuid, jsonb) from authenticated;

revoke all on function private.phase1_form_closing_cluster(jsonb) from public;
revoke all on function private.phase1_form_closing_cluster(jsonb) from anon;
revoke all on function private.phase1_form_closing_cluster(jsonb) from authenticated;

revoke all on function private.phase1_pressure_context_cluster(uuid) from public;
revoke all on function private.phase1_pressure_context_cluster(uuid) from anon;
revoke all on function private.phase1_pressure_context_cluster(uuid) from authenticated;

-- Same signature, guards, and fallback payload as 20260706030843; the only
-- change is the enrichment applied to the rollup before it is returned.
create or replace function public.get_stats_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null::uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester_profile_id uuid := coalesce(profile_id, auth.uid());
  effective_focus_player_id uuid := null;
  rollup_stats jsonb := null;
  player_options jsonb := '[]'::jsonb;
  focus_label text := 'Selected player';
  form_closing jsonb := '{}'::jsonb;
  turn_order_overview jsonb := '[]'::jsonb;
  turn_order_by_table_size jsonb := '[]'::jsonb;
begin
  if requester_profile_id is null or requester_profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select coalesce(
    focus_player_id,
    requester_profile_id
  )
  into effective_focus_player_id;

  if focus_player_id is not null then
    select p.id
    into effective_focus_player_id
    from public.profiles as p
    where p.id = focus_player_id
      and p.deleted_at is null
    limit 1;

    if effective_focus_player_id is null then
      effective_focus_player_id := requester_profile_id;
    end if;
  end if;

  select private.get_stats_screen_rollup(effective_focus_player_id)
  into rollup_stats;

  if rollup_stats is not null then
    form_closing := private.phase1_form_closing_cluster(rollup_stats);

    if jsonb_typeof(rollup_stats->'overview') = 'object'
      and form_closing <> '{}'::jsonb
    then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{overview,formClosing}',
        form_closing,
        true
      );
    end if;

    if jsonb_typeof(rollup_stats->'players'->'detail') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{players,detail,pressureContext}',
        private.phase1_pressure_context_cluster(effective_focus_player_id),
        true
      );
    end if;

    turn_order_overview := private.phase1_turn_order_overview(effective_focus_player_id);
    turn_order_by_table_size := private.phase1_turn_order_by_table_size(effective_focus_player_id);

    if jsonb_typeof(rollup_stats->'games') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{games,turnOrderOverview}',
        turn_order_overview,
        true
      );

      rollup_stats := jsonb_set(
        rollup_stats,
        '{games,turnOrderByTableSize}',
        turn_order_by_table_size,
        true
      );
    end if;

    if jsonb_typeof(rollup_stats->'correlations') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{correlations,turnOrderSummary}',
        private.phase1_turn_order_summary(
          effective_focus_player_id,
          turn_order_overview
        ),
        true
      );
    end if;

    return rollup_stats;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'label', coalesce(nullif(p.display_name, ''), p.player_name, 'Player'),
        'displayName', nullif(p.display_name, ''),
        'playerName', p.player_name
      )
      order by lower(coalesce(nullif(p.display_name, ''), p.player_name, 'Player')), p.id
    ),
    '[]'::jsonb
  )
  into player_options
  from public.profiles as p
  where p.deleted_at is null;

  select coalesce(nullif(p.display_name, ''), p.player_name, 'Selected player')
  into focus_label
  from public.profiles as p
  where p.id = effective_focus_player_id
  limit 1;

  return jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Stats overview',
        'takeaway', 'No finished games are available for this player yet.',
        'games', 0,
        'players', jsonb_array_length(player_options)
      ),
      'cards', '[]'::jsonb,
      'topSignals', '[]'::jsonb
    ),
    'players', jsonb_build_object(
      'options', player_options,
      'selectedPlayerId', effective_focus_player_id,
      'detail', jsonb_build_object(
        'playerId', effective_focus_player_id,
        'label', focus_label,
        'summary', 'No finished games are available for this player yet.',
        'stats', jsonb_build_object(
          'games', 0,
          'wins', 0,
          'winRate', '0%',
          'avgPrestige', 0,
          'contractConversion', '0%'
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
    ),
    'emptyState', jsonb_build_object(
      'title', 'No data yet',
      'description', 'Stats will appear after this player finishes a tracked game.'
    )
  );
end;
$$;

revoke all on function public.get_stats_screen(uuid, uuid) from public;
revoke all on function public.get_stats_screen(uuid, uuid) from anon;
grant execute on function public.get_stats_screen(uuid, uuid) to authenticated;
grant execute on function public.get_stats_screen(uuid, uuid) to service_role;
