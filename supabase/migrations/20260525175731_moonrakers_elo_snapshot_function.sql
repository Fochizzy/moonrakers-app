
-- ELO replay stored in rollup: per-player eloProfile + global elo_leaderboard
-- K=32, start=1000, confidence cap at 12 games, multi-player expected score averaged over opponents
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
  delta_val  int;
  new_rating numeric;
  k          constant numeric := 32;
  s_elo      constant int     := 1000;
  conf_cap   constant int     := 12;
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
  -- Initialise all active profiles at starting ELO
  for part_rec in select id from public.profiles where deleted_at is null loop
    pid := part_rec.id::text;
    rating_map := rating_map || jsonb_build_object(pid, s_elo);
    peak_map   := peak_map   || jsonb_build_object(pid, s_elo);
    stats_map  := stats_map  || jsonb_build_object(pid,
      jsonb_build_object('g',0,'w',0,'l',0,'ds',0.0,'dc',0,'bst',0,'wst',0,'fm',''));
  end loop;

  -- Chronological game replay
  for game_rec in
    select g.id, g.winner_profile_id,
      array_agg(gp.profile_id) filter (where gp.profile_id is not null) as pids
    from public.games as g
    join public.game_participants as gp on gp.game_id=g.id
    where g.status='finished'
    group by g.id, g.winner_profile_id
    order by coalesce(g.finished_at, g.created_at), g.id
  loop
    game_parts := game_rec.pids;
    winner_id  := game_rec.winner_profile_id;
    n          := coalesce(array_length(game_parts,1), 0);
    if n < 2 then continue; end if;

    -- Snapshot pre-game ratings so all deltas use before-game values
    before_map := '{}'::jsonb;
    for i in 1..n loop
      pid := game_parts[i]::text;
      before_map := before_map || jsonb_build_object(pid,
        coalesce((rating_map->>pid)::numeric, s_elo::numeric));
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
      expected  := case when opp_count > 0 then total_exp / opp_count else 0.5 end;
      actual_s  := case when winner_id is not null and winner_id::text = pid then 1.0 else 0.0 end;
      delta_val := round(k * (actual_s - expected))::int;
      new_rating := my_rating + delta_val;

      rating_map := jsonb_set(rating_map, array[pid], to_jsonb(new_rating));
      if new_rating > (peak_map->>pid)::numeric then
        peak_map := jsonb_set(peak_map, array[pid], to_jsonb(new_rating));
      end if;

      st      := stats_map->pid;
      new_g   := (st->>'g')::int + 1;
      new_w   := (st->>'w')::int + case when winner_id is not null and winner_id::text=pid then 1 else 0 end;
      new_l   := (st->>'l')::int + case when winner_id is not null and winner_id::text=pid then 0 else 1 end;
      new_ds  := (st->>'ds')::numeric + delta_val;
      new_dc  := (st->>'dc')::int + 1;
      new_bst := greatest((st->>'bst')::int, delta_val);
      new_wst := least((st->>'wst')::int, delta_val);
      new_fm  := (st->>'fm') || case when winner_id is not null and winner_id::text=pid then 'W' else 'L' end;
      stats_map := jsonb_set(stats_map, array[pid], jsonb_build_object(
        'g',new_g,'w',new_w,'l',new_l,'ds',new_ds,'dc',new_dc,'bst',new_bst,'wst',new_wst,'fm',new_fm));
    end loop;
  end loop;

  -- Build leaderboard rows and write eloProfile into each player's rollup
  for part_rec in
    select p.id,
      coalesce(nullif(p.display_name,''), p.player_name, 'Player') as dname,
      p.favorite_color, p.assigned_card_art_index,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalScore')::numeric,    0) as tot_score,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalPrestige')::numeric, 0) as tot_prestige,
      coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'avgPrestige')::numeric,   0) as avg_prestige
    from public.profiles as p
    left join public.personal_stats_rollups as psr on psr.profile_id = p.id
    where p.deleted_at is null
  loop
    pid      := part_rec.id::text;
    st       := coalesce(stats_map->pid, jsonb_build_object('g',0,'w',0,'l',0,'ds',0.0,'dc',0,'bst',0,'wst',0,'fm',''));
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
      'avgDelta',             round(case when (st->>'dc')::int > 0
                                then (st->>'ds')::numeric / (st->>'dc')::int else 0 end, 1),
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
      payload    = jsonb_set(payload, array['eloProfile'], jsonb_build_object(
        'currentElo',  round((rating_map->>pid)::numeric)::int,
        'peakElo',     round((peak_map->>pid)::numeric)::int,
        'gamesPlayed', g_count,
        'wins',        coalesce((st->>'w')::int, 0),
        'losses',      coalesce((st->>'l')::int, 0),
        'confidence',  round(least(g_count::numeric / conf_cap, 1.0), 4),
        'avgDelta',    round(case when (st->>'dc')::int > 0
                          then (st->>'ds')::numeric / (st->>'dc')::int else 0 end, 1),
        'bestDelta',   coalesce((st->>'bst')::int, 0),
        'worstDelta',  coalesce((st->>'wst')::int, 0),
        'recentForm',  recent_6
      )),
      updated_at = now()
    where profile_id = part_rec.id;
  end loop;

  -- Store global leaderboard snapshot
  insert into public.global_stats_rollups (key, payload, updated_at)
  values ('elo_leaderboard',
    jsonb_build_object('generatedAt', now(), 'rows', leaderboard_rows),
    now())
  on conflict (key) do update
    set payload = excluded.payload, updated_at = excluded.updated_at;
end;
$$;

-- Run immediately to populate ELO data
select private.refresh_all_elo_snapshots();
;
