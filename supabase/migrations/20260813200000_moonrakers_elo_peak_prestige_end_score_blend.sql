
-- Rebalance ELO so a game's rating swing reflects how a player actually played,
-- not only who finished first.
--
-- Each finished game now contributes three per-player performance signals:
--   * peak score      - the highest the player's running score ever reached in
--                       that game, replayed turn by turn from game_rounds
--   * total prestige  - the win-condition tally for that game
--   * end score       - the final score the player finished on
--
-- Each signal is normalised against the field it was played against as a share
-- of that game's mean, so margins matter: doubling the table average scores a
-- full 1.0, matching the average scores 0.5, and scoring nothing scores 0.
-- Min/max normalisation was deliberately dropped here because it pins the best
-- player at 1.0 and the worst at 0.0 no matter how close the game was, which is
-- far too blunt now that performance carries 40% of the result.
create or replace function private.elo_field_share(input_value numeric, field_mean numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when field_mean is null or field_mean <= 0 then 0.5::numeric
    else greatest(
      0::numeric,
      least(1::numeric, 0.5::numeric * coalesce(input_value, 0::numeric) / field_mean)
    )
  end;
$$;

revoke all on function private.elo_field_share(numeric, numeric) from public;
revoke all on function private.elo_field_share(numeric, numeric) from anon;
revoke all on function private.elo_field_share(numeric, numeric) from authenticated;

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
  delta_val  int;
  new_rating numeric;
  peak_mean     numeric;
  prestige_mean numeric;
  end_mean      numeric;
  peak_norm     numeric;
  prestige_norm numeric;
  end_norm      numeric;
  performance_signal numeric;
  k          constant numeric := 32;
  s_elo      constant int     := 1000;
  conf_cap   constant int     := 12;
  elo_result_weight constant numeric := 0.6;
  elo_performance_weight constant numeric := 0.4;
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
    running_totals as (
      select
        game_id,
        participant_id,
        greatest(
          0::numeric,
          sum(prestige_delta) over turn_window
        ) + sum(bonus_delta) over turn_window as running_score
      from round_totals
      window turn_window as (
        partition by game_id, participant_id
        order by round_index
        rows between unbounded preceding and current row
      )
    ),
    participant_peaks as (
      select game_id, participant_id, max(running_score) as peak_score
      from running_totals
      group by game_id, participant_id
    )
    select
      g.id,
      g.winner_profile_id,
      array_agg(gp.profile_id order by gp.start_order asc, gp.profile_id asc)
        filter (where gp.profile_id is not null) as pids,
      -- Games saved without round rows (legacy imports) fall back to the end
      -- score, and the peak can never sit below where the player finished.
      array_agg(
        greatest(
          coalesce(pp.peak_score, coalesce(gp.score, 0)::numeric),
          coalesce(gp.score, 0)::numeric
        )
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as peak_scores,
      array_agg(
        coalesce(gp.total_prestige, 0)::numeric
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as total_prestiges,
      array_agg(
        coalesce(gp.score, 0)::numeric
        order by gp.start_order asc, gp.profile_id asc
      ) filter (where gp.profile_id is not null) as end_scores
    from public.games as g
    join public.game_participants as gp on gp.game_id = g.id
    left join participant_peaks as pp
      on pp.game_id = g.id
     and pp.participant_id = gp.id
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

    select avg(value) into peak_mean
    from unnest(game_rec.peak_scores) as value;

    select avg(value) into prestige_mean
    from unnest(game_rec.total_prestiges) as value;

    select avg(value) into end_mean
    from unnest(game_rec.end_scores) as value;

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

      peak_norm     := private.elo_field_share(game_rec.peak_scores[i], peak_mean);
      prestige_norm := private.elo_field_share(game_rec.total_prestiges[i], prestige_mean);
      end_norm      := private.elo_field_share(game_rec.end_scores[i], end_mean);
      performance_signal := (peak_norm + prestige_norm + end_norm) / 3.0;

      base_actual := case
        when winner_id is null then 0.5
        when winner_id::text = pid then 1.0
        else 0.0
      end;
      actual_s := greatest(
        0::numeric,
        least(
          1::numeric,
          base_actual * elo_result_weight + performance_signal * elo_performance_weight
        )
      );

      delta_val := round(k * (actual_s - expected))::int;
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
