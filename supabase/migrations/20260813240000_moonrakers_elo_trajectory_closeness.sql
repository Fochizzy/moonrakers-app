
-- Read closeness from how long the game was in doubt, and stop trusting round
-- detail that cannot reconstruct its own totals.
--
-- Closeness so far came only from where the field finished. That could not tell
-- a procession from a scramble: a game strung out at the end reads as decisive
-- even if the lead changed hands on the final turn. Closeness now blends the
-- final spread with how far through the game the lead last changed - zero means
-- the eventual leader was never headed, near one means it was still being
-- decided on the closing turns. Decisive is now both strung out and settled
-- early; close is bunched up, or still moving at the end.
--
-- That needs a trajectory worth reading, and eight of the 23 finished games do
-- not have one. Every game recorded on 2026-04-01 and 2026-04-03 kept its turn
-- rows but carries prestige 0 on all of them - 199 points of direct prestige
-- and 23 of assist prestige exist only in the participant totals. It is total
-- loss, not partial: those games replay 0% of their prestige, while every game
-- from 2026-04-09 onward replays 100%. The per-turn detail was never captured
-- and cannot be recovered from a total, so there is nothing to repair.
--
-- The fix is therefore a gate rather than a backfill. A game's rounds are used
-- only when replaying them reproduces the stored prestige; otherwise the game
-- falls back to its final standings for flow and to spread alone for closeness.
-- Left ungated these games were actively harmful rather than merely noisy - in
-- several the apparent leader is never the recorded winner, which is impossible
-- from authoritative totals.
--
-- On the 15 trustworthy games the timing measure spans 0.00 to 0.96 with a
-- median of 0.60, four wire-to-wire games and four decided in the closing fifth.
--
-- The multiplier stays a single number per game on purpose. Giving players
-- different multipliers would stop their deltas cancelling and reintroduce the
-- rating leak the finishing-position result base exists to prevent.

create or replace function private.elo_field_standing(
  input_value numeric,
  field_mean numeric,
  field_size int
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when field_size is null or field_size < 2
      or field_mean is null or field_mean <= 0 then 0.5::numeric
    else greatest(
      0::numeric,
      least(
        1::numeric,
        0.5::numeric
          + 0.5::numeric
            * (field_size::numeric / (field_size - 1)::numeric)
            * (coalesce(input_value, 0::numeric) / field_mean - 1::numeric)
      )
    )
  end;
$$;

revoke all on function private.elo_field_standing(numeric, numeric, int) from public;
revoke all on function private.elo_field_standing(numeric, numeric, int) from anon;
revoke all on function private.elo_field_standing(numeric, numeric, int) from authenticated;

create or replace function private.refresh_all_elo_snapshots()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  game_rec   record;
  part_rec   record;
  pid        text;
  opp_pid    text;
  my_rating  numeric;
  total_exp  numeric;
  opp_count  int;
  expected   numeric;
  actual_s   numeric;
  base_actual numeric;
  result_bases numeric[];
  delta_val  int;
  new_rating numeric;
  prestige_mean numeric;
  end_mean      numeric;
  prestige_spread    numeric;
  spread_decisive    numeric;
  decisiveness  numeric;
  effective_k   numeric;
  flow_norm     numeric;
  prestige_norm numeric;
  end_norm      numeric;
  performance_signal numeric;
  k          constant numeric := 32;
  s_elo      constant int     := 1000;
  conf_cap   constant int     := 12;
  elo_result_weight constant numeric := 0.6;
  elo_performance_weight constant numeric := 0.4;
  elo_min_swing constant numeric := 0.75;
  elo_max_swing constant numeric := 1.25;
  elo_decisive_spread_ratio constant numeric := 0.5;
  rating_map jsonb := '{}'::jsonb;
  peak_map   jsonb := '{}'::jsonb;
  stats_map  jsonb := '{}'::jsonb;
  before_map jsonb;
  game_parts uuid[];
  winner_id  uuid;
  n int; i int; j int;
  st jsonb;
  new_g int; new_w int; new_l int;
  new_ds numeric; new_dc int;
  new_bst int; new_wst int; new_fm text;
  g_count int; form_str text; recent_6 text;
  leaderboard_rows jsonb := '[]'::jsonb;
  lrow jsonb;
begin
  for part_rec in select id from public.profiles where deleted_at is null loop
    pid := part_rec.id::text;
    rating_map := rating_map || jsonb_build_object(pid, s_elo);
    peak_map   := peak_map   || jsonb_build_object(pid, s_elo);
    stats_map  := stats_map  || jsonb_build_object(
      pid,
      jsonb_build_object('g', 0, 'w', 0, 'l', 0, 'ds', 0.0, 'dc', 0, 'bst', 0, 'wst', 0, 'fm', '')
    );
  end loop;

  for game_rec in
    with round_deltas as (
      -- The player taking the turn banks their own prestige and objectives, plus
      -- the score-only components: contracts (+5), assists given (+3), failures (-4).
      select
        gr.game_id,
        gr.participant_id,
        gr.round_index,
        coalesce(gr.prestige, 0)::numeric
          + coalesce(gr.objective_prestige, 0)::numeric as prestige_delta,
        coalesce(gr.contracts, 0)::numeric * 5
          - coalesce(gr.failures, 0)::numeric * 4
          + coalesce((
              select count(*)
              from jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb))
                as assists_given(assist_key, assist_value)
              where coalesce(nullif(assists_given.assist_value, '')::numeric, 0) > 0
            ), 0)::numeric * 3 as bonus_delta
      from public.game_rounds as gr
      union all
      -- Assist prestige lands on the recipient in the round it was given.
      select
        gr.game_id,
        recipient.id as participant_id,
        gr.round_index,
        coalesce(nullif(assists_received.assist_value, '')::numeric, 0) as prestige_delta,
        0::numeric as bonus_delta
      from public.game_rounds as gr
      cross join lateral jsonb_each_text(
        coalesce(gr.assist_prestige_recipients, '{}'::jsonb)
      ) as assists_received(assist_key, assist_value)
      join public.game_participants as recipient
        on recipient.game_id = gr.game_id
       and recipient.profile_id::text = assists_received.assist_key
    ),
    round_totals as (
      select
        game_id,
        participant_id,
        round_index,
        sum(prestige_delta) as prestige_delta,
        sum(bonus_delta) as bonus_delta
      from round_deltas
      group by game_id, participant_id, round_index
    ),
    -- Does a game's round detail actually reconstruct its stored totals?
    --
    -- Games recorded before 2026-04-09 kept their turn rows but lost the
    -- prestige on them, so replaying those yields a trajectory that is not
    -- merely imprecise but wrong - in several the apparent leader is never the
    -- recorded winner. That information was never captured and cannot be
    -- recovered from the totals, so those games are excluded from every
    -- trajectory read below and fall back to their final standings instead.
    --
    -- Prestige is the right thing to reconcile against: it is fully
    -- reconstructible in principle, whereas score legitimately carries
    -- head-to-head mission bonuses the rounds table has no column for.
    participant_prestige as (
      select game_id, participant_id, sum(prestige_delta) as replayed_prestige
      from round_totals
      group by game_id, participant_id
    ),
    game_trust as (
      select
        gp.game_id,
        sum(abs(
          coalesce(gp.total_prestige, 0)::numeric
          - coalesce(pp.replayed_prestige, 0)
        )) < 0.5 as trustworthy
      from public.game_participants as gp
      join public.games as g
        on g.id = gp.game_id
       and g.status = 'finished'
      left join participant_prestige as pp
        on pp.game_id = gp.game_id
       and pp.participant_id = gp.id
      where gp.profile_id is not null
      group by gp.game_id
    ),
    -- Every scored player gets a row at every turn of their game, so players who
    -- did not act on a turn carry their previous total forward and the whole
    -- field can be compared at any point.
    turn_grid as (
      select
        gp.game_id,
        gp.id as participant_id,
        turns.round_index
      from public.game_participants as gp
      join public.games as g
        on g.id = gp.game_id
       and g.status = 'finished'
      join game_trust as gt
        on gt.game_id = gp.game_id
       and gt.trustworthy
      join (
        select game_id, round_index
        from public.game_rounds
        group by game_id, round_index
      ) as turns on turns.game_id = gp.game_id
      where gp.profile_id is not null
    ),
    running_totals as (
      select
        tg.game_id,
        tg.participant_id,
        tg.round_index,
        greatest(
          0::numeric,
          sum(coalesce(rt.prestige_delta, 0)) over turn_window
        ) + sum(coalesce(rt.bonus_delta, 0)) over turn_window as running_score
      from turn_grid as tg
      left join round_totals as rt
        on rt.game_id = tg.game_id
       and rt.participant_id = tg.participant_id
       and rt.round_index = tg.round_index
      window turn_window as (
        partition by tg.game_id, tg.participant_id
        order by tg.round_index
        rows between unbounded preceding and current row
      )
    ),
    turn_standings as (
      select
        game_id,
        participant_id,
        round_index,
        private.elo_field_standing(
          running_score,
          avg(running_score) over (partition by game_id, round_index),
          count(*) over (partition by game_id, round_index)::int
        ) as standing,
        row_number() over (
          partition by game_id, participant_id order by round_index
        )::numeric as turn_weight
      from running_totals
    ),
    participant_flow as (
      select
        game_id,
        participant_id,
        sum(standing * turn_weight) / nullif(sum(turn_weight), 0) as flow_score
      from turn_standings
      group by game_id, participant_id
    ),
    -- Who was actually ahead at each turn, by running prestige - the win
    -- condition, not the broader score.
    running_prestige as (
      select
        tg.game_id,
        tg.participant_id,
        tg.round_index,
        greatest(
          0::numeric,
          sum(coalesce(rt.prestige_delta, 0)) over (
            partition by tg.game_id, tg.participant_id
            order by tg.round_index
            rows between unbounded preceding and current row
          )
        ) as running_prestige
      from turn_grid as tg
      left join round_totals as rt
        on rt.game_id = tg.game_id
       and rt.participant_id = tg.participant_id
       and rt.round_index = tg.round_index
    ),
    turn_leaders as (
      -- Strict leads only. Turns where the top is shared contribute no leader,
      -- so the opening turns where nobody has scored cannot manufacture a lead
      -- change.
      select
        game_id,
        round_index,
        case
          when count(*) filter (where running_prestige = leading_prestige) = 1
            then (array_agg(participant_id) filter (where running_prestige = leading_prestige))[1]
        end as leader
      from (
        select
          rp.*,
          max(running_prestige) over (partition by game_id, round_index) as leading_prestige
        from running_prestige as rp
      ) as ranked_turns
      group by game_id, round_index
    ),
    leader_sequence as (
      select
        game_id,
        leader,
        row_number() over (partition by game_id order by round_index) as turn_no,
        count(*) over (partition by game_id) as turns_total,
        last_value(leader) over (
          partition by game_id
          order by (leader is not null), round_index
          rows between unbounded preceding and unbounded following
        ) as final_leader
      from turn_leaders
    ),
    -- How far through the game the lead changed hands for the last time. Zero
    -- means the eventual leader was never headed; near one means it was still
    -- being decided on the closing turns.
    game_settled as (
      select
        game_id,
        max(case
          when leader is not null and leader <> final_leader
            then turn_no::numeric / turns_total
          else 0
        end) as settled_at
      from leader_sequence
      where final_leader is not null
      group by game_id
    )
    select
      g.id,
      g.winner_profile_id,
      array_agg(gp.profile_id order by gp.start_order asc, gp.profile_id asc)
        filter (where gp.profile_id is not null) as pids,
      -- Null for games saved without round rows (legacy imports); the caller
      -- falls back to the standing implied by the final scores.
      array_agg(
        pf.flow_score
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as flow_scores,
      array_agg(
        coalesce(gp.total_prestige, 0)::numeric
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as total_prestiges,
      array_agg(
        coalesce(gp.score, 0)::numeric
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as end_scores,
      -- Constant per game; null when the trajectory is not trustworthy.
      max(gs.settled_at) as settled_at
    from public.games as g
    join public.game_participants as gp on gp.game_id = g.id
    left join participant_flow as pf
      on pf.game_id = g.id
     and pf.participant_id = gp.id
    left join game_settled as gs on gs.game_id = g.id
    where g.status = 'finished'
    group by g.id, g.winner_profile_id
    order by coalesce(g.finished_at, g.created_at), g.id
  loop
    game_parts := game_rec.pids;
    winner_id  := game_rec.winner_profile_id;
    n          := coalesce(array_length(game_parts, 1), 0);
    if n < 2 then
      continue;
    end if;

    select avg(value) into prestige_mean
    from unnest(game_rec.total_prestiges) as value;

    select avg(value) into end_mean
    from unnest(game_rec.end_scores) as value;

    -- Finishing position, 1 for first down to 0 for last, averaged across any
    -- players level on both prestige and end score. Sums to n/2 across the
    -- field, which is what makes the game zero-sum against the expected scores.
    select array_agg((n - tied.position) / (n - 1)::numeric order by tied.ord)
    into result_bases
    from (
      select
        ranked.ord,
        avg(ranked.pos) over (
          partition by ranked.is_winner, ranked.prestige, ranked.end_score
        ) as position
      from (
        select
          t.ord,
          t.prestige,
          t.end_score,
          (winner_id is not null and t.pid = winner_id) as is_winner,
          row_number() over (
            order by
              (winner_id is not null and t.pid = winner_id) desc,
              t.prestige desc,
              t.end_score desc,
              t.ord asc
          ) as pos
        from unnest(
          game_parts,
          game_rec.total_prestiges,
          game_rec.end_scores
        ) with ordinality as t(pid, prestige, end_score, ord)
      ) as ranked
    ) as tied;

    -- How close the game was, blending where the field finished with how long
    -- the result was in doubt. Decisive means both strung out and settled early;
    -- close means bunched up, or still changing hands at the end.
    select avg(abs(value - prestige_mean)) into prestige_spread
    from unnest(game_rec.total_prestiges) as value;

    spread_decisive := case
      when prestige_mean is null or prestige_mean <= 0 then 0::numeric
      else least(
        1::numeric,
        greatest(
          0::numeric,
          (coalesce(prestige_spread, 0) / prestige_mean) / elo_decisive_spread_ratio
        )
      )
    end;

    -- Games without a trustworthy trajectory fall back to the spread alone.
    decisiveness := case
      when game_rec.settled_at is null then spread_decisive
      else greatest(
        0::numeric,
        least(1::numeric, (spread_decisive + (1::numeric - game_rec.settled_at)) / 2)
      )
    end;
    effective_k := k * (elo_min_swing + (elo_max_swing - elo_min_swing) * decisiveness);

    before_map := '{}'::jsonb;
    for i in 1..n loop
      pid := game_parts[i]::text;
      before_map := before_map || jsonb_build_object(
        pid,
        coalesce((rating_map->>pid)::numeric, s_elo::numeric)
      );
    end loop;

    for i in 1..n loop
      pid       := game_parts[i]::text;
      my_rating := (before_map->>pid)::numeric;
      total_exp := 0;
      opp_count := 0;

      for j in 1..n loop
        if j <> i then
          opp_pid   := game_parts[j]::text;
          total_exp := total_exp + 1.0 / (1.0 + pow(10.0, ((before_map->>opp_pid)::numeric - my_rating) / 400.0));
          opp_count := opp_count + 1;
        end if;
      end loop;

      expected := case when opp_count > 0 then total_exp / opp_count else 0.5 end;

      prestige_norm := private.elo_field_standing(game_rec.total_prestiges[i], prestige_mean, n);
      end_norm      := private.elo_field_standing(game_rec.end_scores[i], end_mean, n);
      flow_norm     := coalesce(game_rec.flow_scores[i], end_norm);
      performance_signal := (flow_norm + prestige_norm + end_norm) / 3.0;

      base_actual := coalesce(result_bases[i], 0.5);
      actual_s := greatest(
        0::numeric,
        least(
          1::numeric,
          base_actual * elo_result_weight + performance_signal * elo_performance_weight
        )
      );

      delta_val := round(effective_k * (actual_s - expected))::int;
      new_rating := my_rating + delta_val;

      rating_map := jsonb_set(rating_map, array[pid], to_jsonb(new_rating));
      if new_rating > (peak_map->>pid)::numeric then
        peak_map := jsonb_set(peak_map, array[pid], to_jsonb(new_rating));
      end if;

      st      := stats_map->pid;
      new_g   := (st->>'g')::int + 1;
      new_w   := (st->>'w')::int + case when winner_id is not null and winner_id::text = pid then 1 else 0 end;
      new_l   := (st->>'l')::int + case when winner_id is not null and winner_id::text = pid then 0 else 1 end;
      new_ds  := (st->>'ds')::numeric + delta_val;
      new_dc  := (st->>'dc')::int + 1;
      new_bst := greatest((st->>'bst')::int, delta_val);
      new_wst := least((st->>'wst')::int, delta_val);
      new_fm  := (st->>'fm') || case when winner_id is not null and winner_id::text = pid then 'W' else 'L' end;
      stats_map := jsonb_set(
        stats_map,
        array[pid],
        jsonb_build_object(
          'g', new_g,
          'w', new_w,
          'l', new_l,
          'ds', new_ds,
          'dc', new_dc,
          'bst', new_bst,
          'wst', new_wst,
          'fm', new_fm
        )
      );
    end loop;
  end loop;

  for part_rec in
    select
      p.id,
      coalesce(nullif(p.display_name, ''), p.player_name, 'Player') as dname,
      p.favorite_color,
      p.assigned_card_art_index,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalScore')::numeric, 0) as tot_score,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalPrestige')::numeric, 0) as tot_prestige,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'avgPrestige')::numeric, 0) as avg_prestige
    from public.profiles as p
    left join public.personal_stats_rollups as psr on psr.profile_id = p.id
    where p.deleted_at is null
  loop
    pid      := part_rec.id::text;
    st       := coalesce(stats_map->pid, jsonb_build_object('g', 0, 'w', 0, 'l', 0, 'ds', 0.0, 'dc', 0, 'bst', 0, 'wst', 0, 'fm', ''));
    g_count  := coalesce((st->>'g')::int, 0);
    form_str := coalesce(st->>'fm', '');
    recent_6 := right(form_str, 6);

    lrow := jsonb_build_object(
      'playerId',             part_rec.id,
      'name',                 part_rec.dname,
      'color',                part_rec.favorite_color,
      'assignedCardArtIndex', part_rec.assigned_card_art_index,
      'currentElo',           round((rating_map->>pid)::numeric)::int,
      'peakElo',              round((peak_map->>pid)::numeric)::int,
      'gamesPlayed',          g_count,
      'wins',                 coalesce((st->>'w')::int, 0),
      'losses',               coalesce((st->>'l')::int, 0),
      'confidence',           round(least(g_count::numeric / conf_cap, 1.0), 4),
      'avgDelta',             round(case when (st->>'dc')::int > 0 then (st->>'ds')::numeric / (st->>'dc')::int else 0 end, 1),
      'bestDelta',            coalesce((st->>'bst')::int, 0),
      'worstDelta',           coalesce((st->>'wst')::int, 0),
      'recentForm',           recent_6,
      'score',                part_rec.tot_score,
      'prestige',             part_rec.tot_prestige,
      'avgPrestige',          part_rec.avg_prestige,
      'efficiency',           part_rec.avg_prestige
    );
    leaderboard_rows := leaderboard_rows || jsonb_build_array(lrow);

    update public.personal_stats_rollups
    set
      payload = jsonb_set(
        payload,
        array['eloProfile'],
        jsonb_build_object(
          'currentElo', round((rating_map->>pid)::numeric)::int,
          'peakElo', round((peak_map->>pid)::numeric)::int,
          'gamesPlayed', g_count,
          'wins', coalesce((st->>'w')::int, 0),
          'losses', coalesce((st->>'l')::int, 0),
          'confidence', round(least(g_count::numeric / conf_cap, 1.0), 4),
          'avgDelta', round(case when (st->>'dc')::int > 0 then (st->>'ds')::numeric / (st->>'dc')::int else 0 end, 1),
          'bestDelta', coalesce((st->>'bst')::int, 0),
          'worstDelta', coalesce((st->>'wst')::int, 0),
          'recentForm', recent_6
        )
      ),
      updated_at = now()
    where profile_id = part_rec.id;
  end loop;

  insert into public.global_stats_rollups (key, payload, updated_at)
  values (
    'elo_leaderboard',
    jsonb_build_object('generatedAt', now(), 'rows', leaderboard_rows),
    now()
  )
  on conflict (key) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;
end;
$$;

select private.refresh_all_elo_snapshots();
