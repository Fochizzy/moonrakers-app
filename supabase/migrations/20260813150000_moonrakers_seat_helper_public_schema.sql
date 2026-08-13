-- Fixes 20260813120000, which put seat_advantage_spread in the private schema.
-- public.get_insights_screen is not security definer, so it executes as the caller
-- and has no USAGE on private -- every Insights load raised
-- "permission denied for schema private". get_elo_screen gets away with calling
-- private helpers only because it IS security definer.
--
-- The helper touches no tables (pure math over two arrays), so there is nothing to
-- protect by hiding it; move it to public, where the caller can reach it, and grant
-- execute to authenticated only.
--
-- Body is otherwise identical to 20260813120000.
--
-- Seat-to-win was a Pearson correlation between the seat number and the win flag.
-- That only sees a monotonic trend, so a table where one seat never wins while the
-- rest all do nets out to r ~= 0 and renders as an empty "no data" card, hiding the
-- strongest turn-order signal in the sample. Group by seat and compare the best and
-- worst seat instead, which catches non-monotonic effects.
--
-- Sign convention is unchanged from the correlation it replaces: negative means
-- earlier seats win more often, positive means later seats do. Returns 0 when fewer
-- than two seats clear min_appearances, i.e. not enough data to compare lanes.
create or replace function public.seat_advantage_spread(
  seats numeric[],
  wins numeric[],
  min_appearances int default 3
)
returns numeric
language sql
immutable
as $$
  with pairs as (
    select
      round(seat_sample.seat)::int as seat,
      case when win_sample.win > 0 then 1 else 0 end as win
    from unnest(seats) with ordinality as seat_sample(seat, position)
    join unnest(wins) with ordinality as win_sample(win, position)
      on win_sample.position = seat_sample.position
    where seat_sample.seat is not null
      and seat_sample.seat >= 1
      and win_sample.win is not null
  ),
  seat_rates as (
    select
      pairs.seat,
      avg(pairs.win::numeric) as win_rate
    from pairs
    group by pairs.seat
    having count(*) >= greatest(coalesce(min_appearances, 1), 1)
  ),
  bounds as (
    select
      (select count(*) from seat_rates) as seat_count,
      -- Ties resolve to the lowest seat on both ends, so best = worst and the
      -- spread collapses to 0 when every qualifying lane performs identically.
      (select seat_rates.seat from seat_rates order by seat_rates.win_rate desc, seat_rates.seat asc limit 1) as best_seat,
      (select seat_rates.win_rate from seat_rates order by seat_rates.win_rate desc, seat_rates.seat asc limit 1) as best_rate,
      (select seat_rates.seat from seat_rates order by seat_rates.win_rate asc, seat_rates.seat asc limit 1) as worst_seat,
      (select seat_rates.win_rate from seat_rates order by seat_rates.win_rate asc, seat_rates.seat asc limit 1) as worst_rate
  )
  select case
    when bounds.seat_count < 2 then 0::numeric
    when bounds.best_seat is null or bounds.worst_seat is null then 0::numeric
    when bounds.best_seat = bounds.worst_seat then 0::numeric
    when bounds.best_seat < bounds.worst_seat then -(bounds.best_rate - bounds.worst_rate)
    else bounds.best_rate - bounds.worst_rate
  end
  from bounds;
$$;

create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  viewer_profile_id uuid := auth.uid();
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  can_view_network boolean := false;
  rollup_payload jsonb;
  insights_payload jsonb;
  existing_correlations jsonb := '{}'::jsonb;
  existing_personal jsonb := '[]'::jsonb;
  existing_pairing jsonb := '[]'::jsonb;
  existing_macro jsonb := '[]'::jsonb;
  existing_synergy jsonb := '[]'::jsonb;
  existing_items jsonb := '[]'::jsonb;
  existing_win_lose_split jsonb := '[]'::jsonb;
  target_game_ids uuid[];
  finished_game_count integer := 0;
  player_row_count integer := 0;
  player_options jsonb := '[]'::jsonb;
  personal_payload jsonb := '[]'::jsonb;
  pairing_payload jsonb := '[]'::jsonb;
  macro_payload jsonb := '[]'::jsonb;
  synergy_payload jsonb := '[]'::jsonb;
  macro_contract_ratio numeric := 0;
  macro_assists_given numeric := 0;
  macro_assists_received numeric := 0;
  macro_early_lead numeric := 0;
  macro_assist_target_gap numeric := 0;
  macro_assist_leader_gap numeric := 0;
  macro_assists_at_six_plus numeric := 0;
  macro_assists_over5_behind numeric := 0;
  macro_assist_prestige_gained numeric := 0;
  macro_late_lead_conversion numeric := 0;
  macro_tempo_control numeric := 0;
  macro_seat_to_win numeric := 0;
  macro_interaction_index numeric := 0;
  personal_base_rate_win numeric := 0;
  personal_base_rate_objectives numeric := 0;
  personal_seat_to_win numeric := 0;
  personal_late_lead_conversion numeric := 0;
  personal_assist_leader_gap numeric := 0;
  personal_assists_at_six_plus numeric := 0;
begin
  if viewer_profile_id is null then
    raise exception 'authenticated profile is required';
  end if;

  if target_profile_id <> viewer_profile_id then
    select exists (
      select 1
      from public.games as g
      where g.status = 'finished'
        and exists (
          select 1
          from public.game_participants as gp
          where gp.game_id = g.id
            and gp.profile_id = target_profile_id
        )
        and exists (
          select 1
          from public.game_participants as vgp
          where vgp.game_id = g.id
            and vgp.profile_id = viewer_profile_id
        )
    )
    into can_view_network;

    if not can_view_network then
      raise exception 'profile_id must match the authenticated profile or a shared network player';
    end if;
  end if;

  select array_agg(g.id)
  into target_game_ids
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
        from public.game_participants as vgp
        where vgp.game_id = g.id
          and vgp.profile_id = viewer_profile_id
      )
    );

  select count(distinct g.id)::int, count(*)::int
  into finished_game_count, player_row_count
  from public.game_participants as gp
  join public.games as g
    on g.id = gp.game_id
  where g.id = any(target_game_ids)
    and gp.profile_id = target_profile_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', np.profile_id,
        'label', np.label,
        'displayName', np.display_name,
        'playerName', np.player_name
      )
      order by np.label
    ),
    '[]'::jsonb
  )
  into player_options
  from (
    select distinct on (gp.profile_id)
      gp.profile_id,
      coalesce(
        nullif(gp.display_name_snapshot, ''),
        nullif(gp.player_name_snapshot, ''),
        'Unknown Player'
      ) as label,
      nullif(gp.display_name_snapshot, '') as display_name,
      nullif(gp.player_name_snapshot, '') as player_name
    from public.game_participants as gp
    where gp.game_id = any(target_game_ids)
      and gp.profile_id is not null
    order by gp.profile_id, coalesce(nullif(gp.display_name_snapshot, ''), nullif(gp.player_name_snapshot, '')) asc
  ) as np;

  select psr.payload
  into rollup_payload
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_profile_id;

  if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
    insights_payload := rollup_payload->'insightsScreen';
  else
    insights_payload := jsonb_build_object(
      'generatedAt', now(),
      'meta', jsonb_build_object('games', 0, 'playerRows', 0),
      'topSignals', '[]'::jsonb,
      'rivalries', '[]'::jsonb,
      'assistNetwork', jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb),
      'correlations', jsonb_build_object(
        'summary', 'No insights available yet.',
        'personal', '[]'::jsonb,
        'pairing', '[]'::jsonb,
        'macro', '[]'::jsonb,
        'synergyPairs', '[]'::jsonb,
        'players', '[]'::jsonb,
        'items', '[]'::jsonb,
        'selectedKey', null,
        'winLoseSplit', '[]'::jsonb
      )
    );
  end if;

  existing_correlations := coalesce(insights_payload->'correlations', '{}'::jsonb);
  existing_personal := case when jsonb_typeof(existing_correlations->'personal') = 'array' then existing_correlations->'personal' else '[]'::jsonb end;
  existing_pairing := case when jsonb_typeof(existing_correlations->'pairing') = 'array' then existing_correlations->'pairing' else '[]'::jsonb end;
  existing_macro := case when jsonb_typeof(existing_correlations->'macro') = 'array' then existing_correlations->'macro' else '[]'::jsonb end;
  existing_synergy := case when jsonb_typeof(existing_correlations->'synergyPairs') = 'array' then existing_correlations->'synergyPairs' else '[]'::jsonb end;
  existing_items := case when jsonb_typeof(existing_correlations->'items') = 'array' then existing_correlations->'items' else '[]'::jsonb end;
  existing_win_lose_split := case when jsonb_typeof(existing_correlations->'winLoseSplit') = 'array' then existing_correlations->'winLoseSplit' else existing_items end;

  if finished_game_count >= 2 then
    with network_players as (
      select distinct on (gp.profile_id)
        gp.profile_id,
        coalesce(
          nullif(gp.display_name_snapshot, ''),
          nullif(gp.player_name_snapshot, ''),
          'Unknown Player'
        ) as label
      from public.game_participants as gp
      where gp.game_id = any(target_game_ids)
        and gp.profile_id is not null
        and gp.profile_id <> target_profile_id
      order by gp.profile_id, label
    ),
    target_games as (
      select
        g.id as game_id,
        exists (
          select 1
          from public.game_participants as gp
          where gp.game_id = g.id
            and gp.profile_id = target_profile_id
            and gp.is_winner
        ) as target_won
      from public.games as g
      where g.id = any(target_game_ids)
    ),
    pairing_metrics as (
      select
        network_players.profile_id,
        network_players.label,
        count(*) filter (where paired.profile_id is not null) as games_together,
        coalesce(
          corr(
            case
              when paired.profile_id is null then 0::double precision
              else 1::double precision
            end,
            case
              when target_games.target_won then 1::double precision
              else 0::double precision
            end
          )::numeric,
          0
        ) as corr_value
      from network_players
      cross join target_games
      left join public.game_participants as paired
        on paired.game_id = target_games.game_id
       and paired.profile_id = network_players.profile_id
      group by network_players.profile_id, network_players.label
    ),
    ranked_pairings as (
      select
        pairing_metrics.label,
        round(pairing_metrics.corr_value, 2) as corr_value,
        pairing_metrics.games_together
      from pairing_metrics
      where pairing_metrics.games_together >= 2
      order by abs(pairing_metrics.corr_value) desc, pairing_metrics.games_together desc, pairing_metrics.label
      limit 6
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'label', format('With %s vs win rate', ranked_pairings.label),
          'value', ranked_pairings.corr_value,
          'strength', case
            when abs(ranked_pairings.corr_value) >= 0.5 then 'Strong'
            when abs(ranked_pairings.corr_value) >= 0.25 then 'Moderate'
            else 'Light'
          end
        )
        order by abs(ranked_pairings.corr_value) desc, ranked_pairings.games_together desc, ranked_pairings.label
      ),
      '[]'::jsonb
    )
    into pairing_payload
    from ranked_pairings;

    with round_one_leaders as (
      select
        gr.game_id,
        gp.profile_id,
        case
          when gr.prestige = max(gr.prestige) over (partition by gr.game_id)
            and gr.prestige > 0
            then 1
          else 0
        end as early_lead
      from public.game_rounds as gr
      join public.game_participants as gp
        on gp.id = gr.participant_id
      where gr.game_id = any(target_game_ids)
        and gr.round_index = 0
        and gp.profile_id is not null
    ),
    player_samples as (
      select
        gp.contracts,
        gp.failures,
        gp.assists,
        gp.assist_prestige_received,
        gp.is_winner,
        coalesce(round_one_leaders.early_lead, 0) as early_lead
      from public.game_participants as gp
      left join round_one_leaders
        on round_one_leaders.game_id = gp.game_id
       and round_one_leaders.profile_id = gp.profile_id
      where gp.game_id = any(target_game_ids)
        and gp.profile_id is not null
    )
    select
      coalesce(
        corr(
          player_samples.contracts::double precision
            / greatest(player_samples.failures, 1)::double precision,
          case
            when player_samples.is_winner then 1::double precision
            else 0::double precision
          end
        )::numeric,
        0
      ),
      coalesce(
        corr(
          player_samples.assists::double precision,
          case
            when player_samples.is_winner then 1::double precision
            else 0::double precision
          end
        )::numeric,
        0
      ),
      coalesce(
        corr(
          player_samples.assist_prestige_received::double precision,
          case
            when player_samples.is_winner then 1::double precision
            else 0::double precision
          end
        )::numeric,
        0
      ),
      coalesce(
        corr(
          player_samples.early_lead::double precision,
          case
            when player_samples.is_winner then 1::double precision
            else 0::double precision
          end
        )::numeric,
        0
      )
    into
      macro_contract_ratio,
      macro_assists_given,
      macro_assists_received,
      macro_early_lead
    from player_samples;

    with network_player_games as (
      select
        gp.game_id,
        gp.profile_id,
        gp.is_winner,
        gp.start_order,
        coalesce(gp.objective_prestige, 0)::numeric as objective_points,
        coalesce(gp.contracts, 0)::numeric as contracts,
        coalesce(gp.assists, 0)::numeric as assists,
        coalesce(gp.failures, 0)::numeric as failures,
        coalesce(gp.total_prestige, 0)::numeric as total_prestige
      from public.game_participants as gp
      where gp.game_id = any(target_game_ids)
        and gp.profile_id is not null
    ),
    base_turn_counts as (
      select
        network_player_games.game_id,
        network_player_games.profile_id,
        count(*) filter (
          where coalesce(gr.contracts, 0) = 0
            and coalesce(gr.failures, 0) = 0
            and coalesce(gr.objective_count, 0) = 0
            and coalesce(gr.objective_prestige, 0) = 0
        )::numeric as base_turns,
        count(*)::numeric as total_turns
      from network_player_games
      join public.game_participants as gp
        on gp.game_id = network_player_games.game_id
       and gp.profile_id = network_player_games.profile_id
      join public.game_rounds as gr
        on gr.participant_id = gp.id
      group by network_player_games.game_id, network_player_games.profile_id
    ),
    early_round_leaders as (
      select
        gr.game_id,
        gp.profile_id,
        case
          when gr.prestige = max(gr.prestige) over (partition by gr.game_id)
            and gr.prestige > 0
            then 1
          else 0
        end as early_lead
      from public.game_rounds as gr
      join public.game_participants as gp
        on gp.id = gr.participant_id
      where gr.game_id = any(target_game_ids)
        and gr.round_index = 0
        and gp.profile_id is not null
    ),
    game_max_round as (
      select
        gr.game_id,
        max(gr.round_index)::int as max_round_index
      from public.game_rounds as gr
      where gr.game_id = any(target_game_ids)
      group by gr.game_id
    ),
    late_round_checkpoint as (
      select
        game_max_round.game_id,
        greatest(
          0,
          ceil(((game_max_round.max_round_index + 1)::numeric) * 0.75)::int - 1
        ) as checkpoint_round_index
      from game_max_round
    ),
    late_round_leaders as (
      select
        gr.game_id,
        gp.profile_id,
        case
          when gr.prestige = max(gr.prestige) over (partition by gr.game_id)
            and gr.prestige > 0
            then 1
          else 0
        end as late_lead
      from public.game_rounds as gr
      join public.game_participants as gp
        on gp.id = gr.participant_id
      join late_round_checkpoint as checkpoint
        on checkpoint.game_id = gr.game_id
       and checkpoint.checkpoint_round_index = gr.round_index
      where gr.game_id = any(target_game_ids)
        and gp.profile_id is not null
    ),
    player_game_samples as (
      select
        network_player_games.game_id,
        network_player_games.profile_id,
        case
          when coalesce(base_turn_counts.total_turns, 0) > 0
            then coalesce(base_turn_counts.base_turns, 0) / base_turn_counts.total_turns
          else 0::numeric
        end as base_rate,
        network_player_games.objective_points,
        case
          when network_player_games.start_order is null then null
          else (network_player_games.start_order + 1)::numeric
        end as start_seat,
        coalesce(early_round_leaders.early_lead, 0)::numeric as early_lead,
        coalesce(late_round_leaders.late_lead, 0)::numeric as late_lead,
        case
          when coalesce(base_turn_counts.total_turns, 0) > 0
            then network_player_games.total_prestige / base_turn_counts.total_turns
          else network_player_games.total_prestige
        end as prestige_per_turn,
        network_player_games.contracts + network_player_games.assists as interaction_index,
        (
          network_player_games.contracts
          / greatest(network_player_games.contracts + network_player_games.failures, 1)
        )
        + coalesce(early_round_leaders.early_lead, 0)::numeric
        + case
            when coalesce(base_turn_counts.total_turns, 0) > 0
              then network_player_games.total_prestige / base_turn_counts.total_turns
            else network_player_games.total_prestige
          end as tempo_control,
        case
          when network_player_games.is_winner then 1::numeric
          else 0::numeric
        end as win_flag
      from network_player_games
      left join base_turn_counts
        on base_turn_counts.game_id = network_player_games.game_id
       and base_turn_counts.profile_id = network_player_games.profile_id
      left join early_round_leaders
        on early_round_leaders.game_id = network_player_games.game_id
       and early_round_leaders.profile_id = network_player_games.profile_id
      left join late_round_leaders
        on late_round_leaders.game_id = network_player_games.game_id
       and late_round_leaders.profile_id = network_player_games.profile_id
    ),
    game_profiles as (
      select
        gp.game_id,
        gp.profile_id
      from public.game_participants as gp
      where gp.game_id = any(target_game_ids)
        and gp.profile_id is not null
    ),
    tracked_rounds as (
      select
        gr.game_id,
        gr.round_index,
        gp.profile_id as target_player_id,
        coalesce(gr.prestige, 0)::numeric as round_prestige,
        gr.assist_recipients,
        gr.assist_prestige_recipients
      from public.game_rounds as gr
      join public.game_participants as gp
        on gp.id = gr.participant_id
      where gr.game_id = any(target_game_ids)
        and gp.profile_id is not null
    ),
    round_prestige_deltas as (
      select
        tracked_rounds.game_id,
        tracked_rounds.round_index,
        tracked_rounds.target_player_id as profile_id,
        tracked_rounds.round_prestige as prestige_delta
      from tracked_rounds
      union all
      select
        tracked_rounds.game_id,
        tracked_rounds.round_index,
        recipient_profiles.profile_id,
        greatest(
          coalesce(
            nullif(tracked_rounds.assist_prestige_recipients->>assist_edge.key, '')::numeric,
            0
          ),
          0
        )::numeric as prestige_delta
      from tracked_rounds
      join lateral jsonb_each_text(tracked_rounds.assist_prestige_recipients) as assist_edge(key, value)
        on true
      join game_profiles as recipient_profiles
        on recipient_profiles.game_id = tracked_rounds.game_id
       and recipient_profiles.profile_id::text = btrim(assist_edge.key)
      where btrim(assist_edge.key) <> ''
    ),
    prestige_before as (
      select
        tracked_rounds.game_id,
        tracked_rounds.round_index,
        game_profiles.profile_id,
        coalesce(sum(previous_delta.prestige_delta), 0)::numeric as pbr
      from tracked_rounds
      join game_profiles
        on game_profiles.game_id = tracked_rounds.game_id
      left join round_prestige_deltas as previous_delta
        on previous_delta.game_id = tracked_rounds.game_id
       and previous_delta.profile_id = game_profiles.profile_id
       and previous_delta.round_index < tracked_rounds.round_index
      group by tracked_rounds.game_id, tracked_rounds.round_index, game_profiles.profile_id
    ),
    leader_state as (
      select
        prestige_before.game_id,
        prestige_before.round_index,
        max(prestige_before.pbr) as leader_prestige
      from prestige_before
      group by prestige_before.game_id, prestige_before.round_index
    ),
    assist_events as (
      select
        tracked_rounds.game_id,
        helper_profiles.profile_id as helper_id,
        abs(helper_state.pbr - target_state.pbr)::numeric as gap_to_target,
        (leader_state.leader_prestige - helper_state.pbr)::numeric as gap_to_leader,
        case when helper_state.pbr >= 6 then 1 else 0 end as assist_at_six_plus,
        case
          when (leader_state.leader_prestige - helper_state.pbr) > 5 then 1
          else 0
        end as assist_over_five_behind,
        (
          greatest(
            coalesce(
              nullif(tracked_rounds.assist_prestige_recipients->>assist_edge.key, '')::numeric,
              0
            ),
            0
          )
          / greatest(assist_edge.value::numeric, 1)
        )::numeric as assist_prestige_gained
      from tracked_rounds
      join prestige_before as target_state
        on target_state.game_id = tracked_rounds.game_id
       and target_state.round_index = tracked_rounds.round_index
       and target_state.profile_id = tracked_rounds.target_player_id
      join leader_state
        on leader_state.game_id = tracked_rounds.game_id
       and leader_state.round_index = tracked_rounds.round_index
      join lateral jsonb_each_text(tracked_rounds.assist_recipients) as assist_edge(key, value)
        on true
      join game_profiles as helper_profiles
        on helper_profiles.game_id = tracked_rounds.game_id
       and helper_profiles.profile_id::text = btrim(assist_edge.key)
      join prestige_before as helper_state
        on helper_state.game_id = tracked_rounds.game_id
       and helper_state.round_index = tracked_rounds.round_index
       and helper_state.profile_id = helper_profiles.profile_id
      join lateral generate_series(1, greatest(assist_edge.value::int, 0)) as assist_copy(idx)
        on true
      where btrim(assist_edge.key) <> ''
        and assist_edge.value::int > 0
    ),
    assist_context_samples as (
      select
        game_profiles.game_id,
        game_profiles.profile_id,
        case
          when count(assist_events.helper_id) > 0
            then avg(assist_events.gap_to_target)::numeric
          else null
        end as avg_gap_to_target,
        case
          when count(assist_events.helper_id) > 0
            then avg(assist_events.gap_to_leader)::numeric
          else null
        end as avg_gap_to_leader,
        coalesce(sum(assist_events.assist_at_six_plus), 0)::int as assists_at_six_plus,
        coalesce(sum(assist_events.assist_over_five_behind), 0)::int as assists_over_five_behind,
        coalesce(sum(assist_events.assist_prestige_gained), 0)::numeric as assist_prestige_gained,
        case
          when winner_gp.profile_id = game_profiles.profile_id then 1::double precision
          else 0::double precision
        end as victory
      from game_profiles
      left join assist_events
        on assist_events.game_id = game_profiles.game_id
       and assist_events.helper_id = game_profiles.profile_id
      left join public.game_participants as winner_gp
        on winner_gp.game_id = game_profiles.game_id
       and winner_gp.is_winner
      group by game_profiles.game_id, game_profiles.profile_id, winner_gp.profile_id
    )
    select
      coalesce(
        (
          select corr(player_game_samples.base_rate::double precision, player_game_samples.win_flag::double precision)
          from player_game_samples
          where player_game_samples.profile_id = target_profile_id
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(player_game_samples.base_rate::double precision, player_game_samples.objective_points::double precision)
          from player_game_samples
          where player_game_samples.profile_id = target_profile_id
        )::numeric,
        0
      ),
      coalesce(
        (
          select public.seat_advantage_spread(
            array_agg(player_game_samples.start_seat),
            array_agg(player_game_samples.win_flag)
          )
          from player_game_samples
          where player_game_samples.profile_id = target_profile_id
            and player_game_samples.start_seat is not null
        ),
        0
      ),
      coalesce(
        (
          select corr(player_game_samples.late_lead::double precision, player_game_samples.win_flag::double precision)
          from player_game_samples
          where player_game_samples.profile_id = target_profile_id
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.avg_gap_to_leader::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.profile_id = target_profile_id
            and assist_context_samples.avg_gap_to_leader is not null
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.assists_at_six_plus::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.profile_id = target_profile_id
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.avg_gap_to_target::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.avg_gap_to_target is not null
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.avg_gap_to_leader::double precision, assist_context_samples.victory)
          from assist_context_samples
          where assist_context_samples.avg_gap_to_leader is not null
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.assists_at_six_plus::double precision, assist_context_samples.victory)
          from assist_context_samples
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.assists_over_five_behind::double precision, assist_context_samples.victory)
          from assist_context_samples
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(assist_context_samples.assist_prestige_gained::double precision, assist_context_samples.victory)
          from assist_context_samples
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(player_game_samples.late_lead::double precision, player_game_samples.win_flag::double precision)
          from player_game_samples
        )::numeric,
        0
      ),
      coalesce(
        (
          select corr(player_game_samples.tempo_control::double precision, player_game_samples.win_flag::double precision)
          from player_game_samples
        )::numeric,
        0
      ),
      coalesce(
        (
          select public.seat_advantage_spread(
            array_agg(player_game_samples.start_seat),
            array_agg(player_game_samples.win_flag)
          )
          from player_game_samples
          where player_game_samples.start_seat is not null
        ),
        0
      ),
      coalesce(
        (
          select corr(player_game_samples.interaction_index::double precision, player_game_samples.win_flag::double precision)
          from player_game_samples
        )::numeric,
        0
      )
    into
      personal_base_rate_win,
      personal_base_rate_objectives,
      personal_seat_to_win,
      personal_late_lead_conversion,
      personal_assist_leader_gap,
      personal_assists_at_six_plus,
      macro_assist_target_gap,
      macro_assist_leader_gap,
      macro_assists_at_six_plus,
      macro_assists_over5_behind,
      macro_assist_prestige_gained,
      macro_late_lead_conversion,
      macro_tempo_control,
      macro_seat_to_win,
      macro_interaction_index;

    personal_payload := jsonb_build_array(
      jsonb_build_object(
        'key', 'baseRate',
        'metricKey', 'baseRate',
        'label', 'Stay at Base Rate vs Victory',
        'value', round(personal_base_rate_win, 2),
        'strength', case
          when abs(personal_base_rate_win) >= 0.5 then 'Strong'
          when abs(personal_base_rate_win) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'baseRateObjective',
        'metricKey', 'baseRate',
        'label', 'Stay at Base Rate vs Objective Points',
        'value', round(personal_base_rate_objectives, 2),
        'strength', case
          when abs(personal_base_rate_objectives) >= 0.5 then 'Strong'
          when abs(personal_base_rate_objectives) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'turnOrderWinCorrelation',
        'metricKey', 'turnOrderWinCorrelation',
        'label', 'Seat Advantage Spread',
        'value', round(personal_seat_to_win, 2),
        'strength', case
          when abs(personal_seat_to_win) >= 0.5 then 'Strong'
          when abs(personal_seat_to_win) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'lateLeadConversion',
        'metricKey', 'lateLeadConversion',
        'label', 'Late Lead Conversion',
        'value', round(personal_late_lead_conversion, 2),
        'strength', case
          when abs(personal_late_lead_conversion) >= 0.5 then 'Strong'
          when abs(personal_late_lead_conversion) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistGapToLeader',
        'metricKey', 'assistGapToLeader',
        'label', 'Assist Leader Prestige Gap vs Victory',
        'value', round(personal_assist_leader_gap, 2),
        'strength', case
          when abs(personal_assist_leader_gap) >= 0.5 then 'Strong'
          when abs(personal_assist_leader_gap) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistsAtSixPlus',
        'metricKey', 'assistsAtSixPlus',
        'label', 'Assists at 6+ Prestige vs Victory',
        'value', round(personal_assists_at_six_plus, 2),
        'strength', case
          when abs(personal_assists_at_six_plus) >= 0.5 then 'Strong'
          when abs(personal_assists_at_six_plus) >= 0.25 then 'Moderate'
          else 'Light'
        end
      )
    );

    macro_payload := jsonb_build_array(
      jsonb_build_object(
        'key', 'contractFailureRatio',
        'metricKey', 'contractFailureRatio',
        'label', 'Contracts / Failures Ratio vs Win Rate',
        'value', round(macro_contract_ratio, 2),
        'strength', case
          when abs(macro_contract_ratio) >= 0.5 then 'Strong'
          when abs(macro_contract_ratio) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistsGiven',
        'metricKey', 'assistsGiven',
        'label', 'Assists Given vs Win Rate',
        'value', round(macro_assists_given, 2),
        'strength', case
          when abs(macro_assists_given) >= 0.5 then 'Strong'
          when abs(macro_assists_given) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistPrestigeReceived',
        'metricKey', 'assistPrestigeReceived',
        'label', 'Assists Received vs Win Rate',
        'value', round(macro_assists_received, 2),
        'strength', case
          when abs(macro_assists_received) >= 0.5 then 'Strong'
          when abs(macro_assists_received) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'earlyLeadRate',
        'metricKey', 'earlyLeadRate',
        'label', 'Early Lead vs Final Win',
        'value', round(macro_early_lead, 2),
        'strength', case
          when abs(macro_early_lead) >= 0.5 then 'Strong'
          when abs(macro_early_lead) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistGapToTarget',
        'metricKey', 'assistGapToTarget',
        'label', 'Assist Target Prestige Gap vs Victory',
        'value', round(macro_assist_target_gap, 2),
        'strength', case
          when abs(macro_assist_target_gap) >= 0.5 then 'Strong'
          when abs(macro_assist_target_gap) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistGapToLeader',
        'metricKey', 'assistGapToLeader',
        'label', 'Assist Leader Prestige Gap vs Victory',
        'value', round(macro_assist_leader_gap, 2),
        'strength', case
          when abs(macro_assist_leader_gap) >= 0.5 then 'Strong'
          when abs(macro_assist_leader_gap) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistsAtSixPlus',
        'metricKey', 'assistsAtSixPlus',
        'label', 'Assists at 6+ Prestige vs Victory',
        'value', round(macro_assists_at_six_plus, 2),
        'strength', case
          when abs(macro_assists_at_six_plus) >= 0.5 then 'Strong'
          when abs(macro_assists_at_six_plus) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistsOverFiveBehindLeader',
        'metricKey', 'assistsOverFiveBehindLeader',
        'label', 'Assists Over 5 Behind Leader vs Victory',
        'value', round(macro_assists_over5_behind, 2),
        'strength', case
          when abs(macro_assists_over5_behind) >= 0.5 then 'Strong'
          when abs(macro_assists_over5_behind) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'assistPrestigeGained',
        'metricKey', 'assistPrestigeGained',
        'label', 'Assist Prestige Gained vs Victory',
        'value', round(macro_assist_prestige_gained, 2),
        'strength', case
          when abs(macro_assist_prestige_gained) >= 0.5 then 'Strong'
          when abs(macro_assist_prestige_gained) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'lateLeadConversion',
        'metricKey', 'lateLeadConversion',
        'label', 'Late Lead Conversion',
        'value', round(macro_late_lead_conversion, 2),
        'strength', case
          when abs(macro_late_lead_conversion) >= 0.5 then 'Strong'
          when abs(macro_late_lead_conversion) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'tempoControl',
        'metricKey', 'tempoControl',
        'label', 'Tempo Control',
        'value', round(macro_tempo_control, 2),
        'strength', case
          when abs(macro_tempo_control) >= 0.5 then 'Strong'
          when abs(macro_tempo_control) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'turnOrderWinCorrelation',
        'metricKey', 'turnOrderWinCorrelation',
        'label', 'Seat Advantage Spread',
        'value', round(macro_seat_to_win, 2),
        'strength', case
          when abs(macro_seat_to_win) >= 0.5 then 'Strong'
          when abs(macro_seat_to_win) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'key', 'interactionIndex',
        'metricKey', 'interactionIndex',
        'label', 'Interaction Index',
        'value', round(macro_interaction_index, 2),
        'strength', case
          when abs(macro_interaction_index) >= 0.5 then 'Strong'
          when abs(macro_interaction_index) >= 0.25 then 'Moderate'
          else 'Light'
        end
      )
    );

    with pair_games as (
      select
        case
          when left_gp.profile_id::text < right_gp.profile_id::text
            then left_gp.profile_id::text
          else right_gp.profile_id::text
        end as a,
        case
          when left_gp.profile_id::text < right_gp.profile_id::text
            then right_gp.profile_id::text
          else left_gp.profile_id::text
        end as b,
        left_gp.game_id,
        case
          when winner_gp.profile_id in (left_gp.profile_id, right_gp.profile_id) then 1
          else 0
        end as pair_won
      from public.game_participants as left_gp
      join public.game_participants as right_gp
        on right_gp.game_id = left_gp.game_id
       and left_gp.profile_id is not null
       and right_gp.profile_id is not null
       and left_gp.profile_id::text < right_gp.profile_id::text
      left join public.game_participants as winner_gp
        on winner_gp.game_id = left_gp.game_id
       and winner_gp.is_winner
      where left_gp.game_id = any(target_game_ids)
    ),
    pair_rollup as (
      select
        pair_games.a,
        pair_games.b,
        count(*)::int as games_together,
        coalesce(sum(pair_games.pair_won), 0)::int as wins_together
      from pair_games
      group by pair_games.a, pair_games.b
    ),
    assist_edges as (
      select
        case
          when source.profile_id::text < recipient.profile_id::text
            then source.profile_id::text
          else recipient.profile_id::text
        end as a,
        case
          when source.profile_id::text < recipient.profile_id::text
            then recipient.profile_id::text
          else source.profile_id::text
        end as b,
        sum(
          case
            when source.profile_id::text < recipient.profile_id::text
              then coalesce((edge.value)::numeric, 0)
            else 0
          end
        ) as assist_ab,
        sum(
          case
            when source.profile_id::text < recipient.profile_id::text
              then 0
            else coalesce((edge.value)::numeric, 0)
          end
        ) as assist_ba
      from public.game_rounds as gr
      join public.game_participants as source
        on source.id = gr.participant_id
      join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key, value)
        on true
      join public.game_participants as recipient
        on recipient.game_id = gr.game_id
       and recipient.profile_id = nullif(edge.key, '')::uuid
      where gr.game_id = any(target_game_ids)
        and source.profile_id is not null
        and recipient.profile_id is not null
        and source.profile_id <> recipient.profile_id
      group by 1, 2
    ),
    synergy_metrics as (
      select
        pair_rollup.a,
        pair_rollup.b,
        pair_rollup.games_together,
        pair_rollup.wins_together,
        coalesce(assist_edges.assist_ab, 0) as assist_ab,
        coalesce(assist_edges.assist_ba, 0) as assist_ba,
        coalesce(assist_edges.assist_ab, 0) + coalesce(assist_edges.assist_ba, 0) as total_assist,
        case
          when pair_rollup.games_together > 0
            then pair_rollup.wins_together::numeric / pair_rollup.games_together
          else 0
        end as win_rate
      from pair_rollup
      left join assist_edges
        on assist_edges.a = pair_rollup.a
       and assist_edges.b = pair_rollup.b
      where pair_rollup.games_together >= 2
    ),
    ranked_synergy as (
      select
        synergy_metrics.a,
        synergy_metrics.b,
        round(
          (
            synergy_metrics.total_assist * 0.6
            + synergy_metrics.win_rate * 20
            + case
                when synergy_metrics.total_assist > 0 then
                  (
                    1
                    - abs(synergy_metrics.assist_ab - synergy_metrics.assist_ba)
                      / synergy_metrics.total_assist
                  ) * 10
                else 0
              end
            + synergy_metrics.games_together * 0.5
          ),
          2
        ) as synergy_score,
        synergy_metrics.games_together
      from synergy_metrics
      order by synergy_score desc, synergy_metrics.games_together desc, synergy_metrics.a, synergy_metrics.b
      limit 5
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'a', ranked_synergy.a,
          'b', ranked_synergy.b,
          'score', ranked_synergy.synergy_score
        )
        order by ranked_synergy.synergy_score desc, ranked_synergy.games_together desc, ranked_synergy.a, ranked_synergy.b
      ),
      '[]'::jsonb
    )
    into synergy_payload
    from ranked_synergy;
  end if;

  personal_payload := case when jsonb_array_length(personal_payload) > 0 then personal_payload else existing_personal end;
  pairing_payload := case when jsonb_array_length(existing_pairing) > 0 then existing_pairing else pairing_payload end;
  macro_payload := case when jsonb_array_length(macro_payload) > 0 then macro_payload else existing_macro end;
  synergy_payload := case when jsonb_array_length(existing_synergy) > 0 then existing_synergy else synergy_payload end;

  insights_payload := insights_payload
    || jsonb_build_object(
      'meta',
      jsonb_build_object('games', finished_game_count, 'playerRows', player_row_count)
    );

  insights_payload := jsonb_set(
    insights_payload,
    '{correlations}',
    jsonb_build_object(
      'summary', case
        when finished_game_count < 2 then 'Need at least 2 games for insights.'
        when target_profile_id = viewer_profile_id then 'Outcome signals derived from your finished Supabase games.'
        else 'Outcome signals derived from finished shared Supabase games.'
      end,
      'personal', personal_payload,
      'pairing', pairing_payload,
      'macro', macro_payload,
      'synergyPairs', synergy_payload,
      'players', player_options,
      'items', existing_items,
      'selectedKey', target_profile_id::text,
      'winLoseSplit', existing_win_lose_split
    ),
    true
  );

  return insights_payload;
end;
$$;

-- Stats-screen turn-order summary reuses the same seat metric so the number on
-- Stats and the card on Insights cannot drift apart. start_order is 0-based here,
-- so shift into 1-based seats before handing it to the helper.
create or replace function private.phase1_turn_order_summary(
  target_profile_id uuid,
  overview_rows jsonb
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with seat_source as (
    select
      (gp.start_order + 1)::numeric as seat_value,
      case
        when gp.is_winner then 1::numeric
        else 0::numeric
      end as win_value
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
      and gp.start_order is not null
  ),
  spread_value as (
    select coalesce(
      public.seat_advantage_spread(
        array_agg(seat_source.seat_value),
        array_agg(seat_source.win_value)
      ),
      0
    ) as turn_order_win_correlation
    from seat_source
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
    'turnOrderWinCorrelation', round(spread_value.turn_order_win_correlation, 3),
    'bestSeat', (select row_value from best_row),
    'worstSeat', (select row_value from worst_row),
    'summary', case
      when totals.total_games = 0 then 'No finished games yet for turn-order analysis.'
      else format(
        'Seat advantage spread across %s finished game%s.',
        totals.total_games,
        case when totals.total_games = 1 then '' else 's' end
      )
    end
  )
  from totals
  cross join spread_value;
$$;

-- Pure helper: no table access, so anon has no reason to reach it either.
revoke all on function public.seat_advantage_spread(numeric[], numeric[], int) from public;
grant execute on function public.seat_advantage_spread(numeric[], numeric[], int) to authenticated;

-- Retire the unreachable private copy from 20260813120000.
drop function if exists private.seat_advantage_spread(numeric[], numeric[], int);
