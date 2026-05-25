create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  viewer_profile_id uuid := auth.uid();
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  can_view_network_profile boolean := false;
  rollup_payload jsonb;
  response_payload jsonb;
  finished_game_count integer := 0;
  player_row_count integer := 0;
  player_options jsonb := '[]'::jsonb;
  pairing_payload jsonb := '[]'::jsonb;
  macro_payload jsonb := '[]'::jsonb;
  synergy_payload jsonb := '[]'::jsonb;
  macro_contract_ratio numeric := 0;
  macro_assists_given numeric := 0;
  macro_assists_received numeric := 0;
  macro_early_lead numeric := 0;
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
          from public.game_participants as viewer_gp
          where viewer_gp.game_id = g.id
            and viewer_gp.profile_id = viewer_profile_id
        )
    )
    into can_view_network_profile;

    if not can_view_network_profile then
      raise exception 'profile_id must match the authenticated profile or a shared network player';
    end if;
  end if;

  response_payload := jsonb_build_object(
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
      'pairing', '[]'::jsonb,
      'macro', '[]'::jsonb,
      'synergyPairs', '[]'::jsonb,
      'players', '[]'::jsonb,
      'items', '[]'::jsonb,
      'selectedKey', null
    )
  );

  if target_profile_id = viewer_profile_id then
    select rollup.payload
    into rollup_payload
    from public.personal_stats_rollups as rollup
    where rollup.profile_id = target_profile_id;

    if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
      response_payload := rollup_payload->'insightsScreen';
    end if;
  end if;

  with target_games as (
    select
      g.id as game_id,
      coalesce(g.finished_at, g.created_at) as event_at
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
  )
  select
    count(*)::int,
    coalesce((
      select count(*)
      from public.game_participants as gp
      join target_games
        on target_games.game_id = gp.game_id
      where gp.profile_id = target_profile_id
    ), 0)::int
  into finished_game_count, player_row_count
  from target_games;

  with target_games as (
    select
      g.id as game_id,
      coalesce(g.finished_at, g.created_at) as event_at
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
  network_players as (
    select distinct on (gp.profile_id)
      gp.profile_id,
      coalesce(
        nullif(gp.display_name_snapshot, ''),
        nullif(gp.player_name_snapshot, ''),
        'Unknown Player'
      ) as label,
      nullif(gp.display_name_snapshot, '') as display_name,
      nullif(gp.player_name_snapshot, '') as player_name
    from target_games
    join public.game_participants as gp
      on gp.game_id = target_games.game_id
    where gp.profile_id is not null
    order by gp.profile_id, target_games.event_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', network_players.profile_id,
        'label', network_players.label,
        'displayName', network_players.display_name,
        'playerName', network_players.player_name
      )
      order by network_players.label
    ),
    '[]'::jsonb
  )
  into player_options
  from network_players;

  if finished_game_count >= 2 then
    with target_games as (
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
    network_players as (
      select distinct on (gp.profile_id)
        gp.profile_id,
        coalesce(
          nullif(gp.display_name_snapshot, ''),
          nullif(gp.player_name_snapshot, ''),
          'Unknown Player'
        ) as label
      from public.game_participants as gp
      join target_games
        on target_games.game_id = gp.game_id
      where gp.profile_id is not null
        and gp.profile_id <> target_profile_id
      order by gp.profile_id, label
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
    round_one_leaders as (
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
      join target_games
        on target_games.game_id = gr.game_id
      where gr.round_index = 0
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
      join target_games
        on target_games.game_id = gp.game_id
      left join round_one_leaders
        on round_one_leaders.game_id = gp.game_id
       and round_one_leaders.profile_id = gp.profile_id
      where gp.profile_id is not null
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

    macro_payload := jsonb_build_array(
      jsonb_build_object(
        'label', 'Contracts / Failures Ratio vs Win Rate',
        'value', round(macro_contract_ratio, 2),
        'strength', case
          when abs(macro_contract_ratio) >= 0.5 then 'Strong'
          when abs(macro_contract_ratio) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'label', 'Assists Given vs Win Rate',
        'value', round(macro_assists_given, 2),
        'strength', case
          when abs(macro_assists_given) >= 0.5 then 'Strong'
          when abs(macro_assists_given) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'label', 'Assists Received vs Win Rate',
        'value', round(macro_assists_received, 2),
        'strength', case
          when abs(macro_assists_received) >= 0.5 then 'Strong'
          when abs(macro_assists_received) >= 0.25 then 'Moderate'
          else 'Light'
        end
      ),
      jsonb_build_object(
        'label', 'Early Lead vs Final Win',
        'value', round(macro_early_lead, 2),
        'strength', case
          when abs(macro_early_lead) >= 0.5 then 'Strong'
          when abs(macro_early_lead) >= 0.25 then 'Moderate'
          else 'Light'
        end
      )
    );

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
    pair_games as (
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
      join target_games
        on target_games.game_id = left_gp.game_id
      left join public.game_participants as winner_gp
        on winner_gp.game_id = left_gp.game_id
       and winner_gp.is_winner
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
      join target_games
        on target_games.game_id = gr.game_id
      join public.game_participants as source
        on source.id = gr.participant_id
      join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key, value)
        on true
      join public.game_participants as recipient
        on recipient.game_id = gr.game_id
       and recipient.profile_id = nullif(edge.key, '')::uuid
      where source.profile_id is not null
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

  response_payload := jsonb_set(
    response_payload,
    '{meta,games}',
    to_jsonb(finished_game_count),
    true
  );
  response_payload := jsonb_set(
    response_payload,
    '{meta,playerRows}',
    to_jsonb(player_row_count),
    true
  );
  response_payload := jsonb_set(
    response_payload,
    '{correlations}',
    jsonb_build_object(
      'summary', case
        when target_profile_id = viewer_profile_id then 'Outcome signals derived from your finished Supabase games.'
        else 'Outcome signals derived from finished shared Supabase games.'
      end,
      'pairing', pairing_payload,
      'macro', macro_payload,
      'synergyPairs', synergy_payload,
      'players', player_options,
      'items', macro_payload,
      'selectedKey', target_profile_id::text
    ),
    true
  );

  return response_payload;
end;
$$;
