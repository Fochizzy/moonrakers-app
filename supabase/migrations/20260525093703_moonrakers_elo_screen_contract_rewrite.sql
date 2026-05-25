-- Recovered from live supabase_migrations.schema_migrations on 2026-05-25 to reconcile local migration history.

-- Rewrites get_elo_screen with:
-- #1: Pre-fetch all participant data upfront (one query instead of 82 inner SELECTs)
-- #2: peak_rating_map tracked during replay; delta_map accumulates avg/best/worst delta
--     Projection section shows real next-win/next-loss ELOs vs current field
-- #5: WHERE deleted_at IS NULL on all profile scans

create or replace function public.get_elo_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null,
  sort_key text default 'elo'
)
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  normalized_sort_key text := lower(coalesce(sort_key, 'elo'));
  -- In-memory ELO state (profile_id::text -> numeric/jsonb value)
  rating_map      jsonb := '{}'::jsonb;
  next_rating_map jsonb := '{}'::jsonb;
  peak_rating_map jsonb := '{}'::jsonb;   -- #2: tracks career-high ELO per player
  delta_map       jsonb := '{}'::jsonb;   -- #2: {sum, cnt, best, worst} per player
  -- #1: pre-fetched participant lists per game (eliminates per-participant DB queries)
  all_game_participants jsonb := '{}'::jsonb;
  -- loop vars
  game_row      record;
  part_text     text;
  p_id          uuid;
  current_rating  numeric;
  opponent_ratings numeric[];
  actual_score    numeric;
  next_rating     integer;
  current_delta   integer;
  old_d           jsonb;
  -- player resolution
  player_options             jsonb := '[]'::jsonb;
  leaderboard_rows           jsonb := '[]'::jsonb;
  selected_summary           jsonb := null;
  top_cards                  jsonb := '[]'::jsonb;
  sections                   jsonb := '{}'::jsonb;
  insights                   jsonb := '{}'::jsonb;
  empty_state                jsonb := null;
  all_profiles_count         integer := 0;
  effective_selected_player_id  uuid := null;
  effective_selected_opponent_id uuid := null;
  -- summary scalars
  summary_name         text    := 'Unknown';
  summary_current_elo  integer := 1000;
  summary_peak_elo     integer := 1000;
  summary_games        integer := 0;
  summary_wins         integer := 0;
  summary_losses       integer := 0;
  summary_confidence   numeric := 0;
  summary_recent_form  text    := '';
  summary_score        numeric := 0;
  summary_prestige     numeric := 0;
  summary_efficiency   numeric := 0;
  summary_avg_prestige numeric := 0;
  summary_avg_delta    numeric := 0;  -- #2
  summary_best_delta   integer := 0;  -- #2
  summary_worst_delta  integer := 0;  -- #2
  win_rate             numeric := 0;
  context_games        integer := 0;
  context_wins         integer := 0;
  context_win_rate     numeric := 0;
  opponent_name        text    := null;
  -- projection (#2)
  projection_opponent_ratings numeric[] := array[]::numeric[];
  projection_expected         numeric   := 0;
  next_win_elo                integer   := 1000;
  next_loss_elo               integer   := 1000;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  -- #5: count only non-deleted profiles
  select count(*) into all_profiles_count from public.profiles where deleted_at is null;

  -- Resolve focus player (#5: skip deleted)
  select coalesce(
    (select p.id from public.profiles as p where p.id = focus_player_id  and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.id = profile_id        and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.deleted_at is null
     order by lower(coalesce(nullif(p.display_name,''), p.player_name, 'Player')), p.id limit 1)
  ) into effective_selected_player_id;

  if opponent_id is not null and opponent_id <> effective_selected_player_id then
    select p.id into effective_selected_opponent_id
    from public.profiles as p
    where p.id = opponent_id and p.deleted_at is null limit 1;
  end if;

  -- #1: Pre-fetch all registered participant IDs per game in one query.
  -- Stores profile_id::text values in a per-game JSONB array keyed by game_id::text.
  -- This eliminates the 82+ individual SELECT queries that the original nested loop issued.
  select coalesce(jsonb_object_agg(gd.game_id::text, gd.parts), '{}'::jsonb)
  into all_game_participants
  from (
    select gp.game_id,
      jsonb_agg(to_jsonb(gp.profile_id::text) order by gp.start_order asc, gp.profile_id asc) as parts
    from public.game_participants as gp
    where gp.profile_id is not null
    group by gp.game_id
  ) as gd;

  -- ELO replay loop ? reads from all_game_participants (in-memory); no DB queries inside.
  for game_row in
    select g.id, g.winner_profile_id
    from public.games as g
    where g.status = 'finished'
      and exists (select 1 from public.game_participants as gp where gp.game_id = g.id and gp.profile_id is not null)
    order by g.created_at asc, g.id asc
  loop
    next_rating_map := rating_map;

    for part_text in
      select v from jsonb_array_elements_text(all_game_participants->(game_row.id::text)) as v
    loop
      p_id := part_text::uuid;
      current_rating := coalesce((rating_map->>part_text)::numeric, 1000::numeric);

      -- Opponent ratings from in-memory JSONB ? no DB query
      select coalesce(
        array_agg(coalesce((rating_map->>v2)::numeric, 1000::numeric) order by v2)
        filter (where v2 <> part_text),
        array[]::numeric[]
      )
      into opponent_ratings
      from jsonb_array_elements_text(all_game_participants->(game_row.id::text)) as v2;

      actual_score := case
        when game_row.winner_profile_id is null  then 0.5::numeric
        when game_row.winner_profile_id = p_id   then 1::numeric
        else 0::numeric
      end;

      next_rating := round(
        current_rating + 32::numeric * (actual_score - private.elo_expected_score_multi(current_rating, opponent_ratings))
      );

      -- #2: Track career peak ELO
      peak_rating_map := jsonb_set(peak_rating_map, array[part_text],
        to_jsonb(greatest(coalesce((peak_rating_map->>part_text)::int, 1000), next_rating)), true);

      -- #2: Accumulate per-game delta stats
      current_delta := next_rating - current_rating::int;
      old_d := coalesce(delta_map->part_text, '{}'::jsonb);
      delta_map := jsonb_set(delta_map, array[part_text], jsonb_build_object(
        'sum',   coalesce((old_d->>'sum')::numeric, 0) + current_delta,
        'cnt',   coalesce((old_d->>'cnt')::int, 0) + 1,
        'best',  greatest(coalesce((old_d->>'best')::int, current_delta), current_delta),
        'worst', least(coalesce((old_d->>'worst')::int, current_delta), current_delta)
      ), true);

      next_rating_map := jsonb_set(next_rating_map, array[part_text], to_jsonb(next_rating), true);
    end loop;

    rating_map := next_rating_map;
  end loop;

  -- Player options (#5: deleted_at filter)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(p.display_name,''), p.player_name, 'Player'),
    'label', coalesce(nullif(p.display_name,''), p.player_name, 'Player'),
    'displayName', nullif(p.display_name,''), 'playerName', p.player_name,
    'color', p.favorite_color, 'assignedCardArtIndex', p.assigned_card_art_index,
    'gamesPlayed', coalesce(stats.games_played, 0),
    'currentElo', coalesce((rating_map->>p.id::text)::int, 1000)
  ) order by lower(coalesce(nullif(p.display_name,''), p.player_name, 'Player')), p.id), '[]'::jsonb)
  into player_options
  from public.profiles as p
  left join (
    select gp.profile_id, count(g.id)::int as games_played
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    where gp.profile_id is not null group by gp.profile_id
  ) as stats on stats.profile_id = p.id
  where p.deleted_at is null;  -- #5

  -- Leaderboard rows (#2: peak_elo, avg/best/worst delta; #5: deleted_at)
  with base as (
    select
      p.id as player_id,
      coalesce(nullif(p.display_name,''), p.player_name, 'Player') as name,
      p.favorite_color as color, p.assigned_card_art_index,
      coalesce((rating_map->>p.id::text)::int, 1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int, 1000) as peak_elo,
      coalesce((delta_map->p.id::text->>'sum')::numeric
        / nullif((delta_map->p.id::text->>'cnt')::int, 0), 0)::numeric as avg_delta,
      coalesce((delta_map->p.id::text->>'best')::int, 0)  as best_delta,
      coalesce((delta_map->p.id::text->>'worst')::int, 0) as worst_delta,
      coalesce(stats.games_played, 0) as games_played,
      coalesce(stats.wins, 0) as wins,
      greatest(coalesce(stats.games_played, 0) - coalesce(stats.wins, 0), 0) as losses,
      coalesce(stats.score, 0)::numeric    as score,
      coalesce(stats.prestige, 0)::numeric as prestige,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.wins,0)::numeric/stats.games_played else 0 end as efficiency,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.prestige,0)::numeric/stats.games_played else 0 end as avg_prestige,
      least(1::numeric, case when coalesce(stats.games_played,0)>0 then stats.games_played::numeric/12 else 0 end) as confidence
    from public.profiles as p
    left join (
      select gp.profile_id, count(g.id)::int as games_played,
        count(g.id) filter (where gp.is_winner)::int as wins,
        coalesce(sum(gp.score),0)::numeric as score,
        coalesce(sum(gp.total_prestige),0)::numeric as prestige
      from public.game_participants as gp
      join public.games as g on g.id=gp.game_id and g.status='finished'
      where gp.profile_id is not null group by gp.profile_id
    ) as stats on stats.profile_id = p.id
    where p.deleted_at is null  -- #5
  ),
  ordered as (
    select base.*, row_number() over (
      order by
        case when normalized_sort_key='wins'       then wins::numeric
             when normalized_sort_key='games'      then games_played::numeric
             when normalized_sort_key='score'      then score
             when normalized_sort_key='prestige'   then prestige
             when normalized_sort_key='efficiency' then efficiency
             when normalized_sort_key='avgprestige' then avg_prestige
             else current_elo::numeric end desc,
        lower(name) asc, player_id asc
    ) as rank
    from base
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', rank, 'playerId', player_id, 'name', name,
    'color', color, 'assignedCardArtIndex', assigned_card_art_index,
    'currentElo', current_elo, 'peakElo', peak_elo,
    'avgDelta', round(avg_delta,1), 'bestDelta', best_delta, 'worstDelta', worst_delta,
    'confidence', confidence, 'gamesPlayed', games_played, 'wins', wins, 'losses', losses,
    'score', score, 'prestige', prestige, 'efficiency', efficiency, 'avgPrestige', avg_prestige
  ) order by rank), '[]'::jsonb)
  into leaderboard_rows from ordered;

  -- Selected player summary (#2: peak + deltas; #5: deleted_at)
  with base as (
    select
      p.id as player_id,
      coalesce(nullif(p.display_name,''), p.player_name, 'Player') as name,
      coalesce((rating_map->>p.id::text)::int, 1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int, 1000) as peak_elo,
      coalesce((delta_map->p.id::text->>'sum')::numeric
        / nullif((delta_map->p.id::text->>'cnt')::int, 0), 0)::numeric as avg_delta,
      coalesce((delta_map->p.id::text->>'best')::int, 0)  as best_delta,
      coalesce((delta_map->p.id::text->>'worst')::int, 0) as worst_delta,
      coalesce(stats.games_played,0) as games_played,
      coalesce(stats.wins,0) as wins,
      greatest(coalesce(stats.games_played,0)-coalesce(stats.wins,0),0) as losses,
      coalesce(stats.score,0)::numeric    as score,
      coalesce(stats.prestige,0)::numeric as prestige,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.wins,0)::numeric/stats.games_played else 0 end as efficiency,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.prestige,0)::numeric/stats.games_played else 0 end as avg_prestige,
      least(1::numeric, case when coalesce(stats.games_played,0)>0 then stats.games_played::numeric/12 else 0 end) as confidence
    from public.profiles as p
    left join (
      select gp.profile_id, count(g.id)::int as games_played,
        count(g.id) filter (where gp.is_winner)::int as wins,
        coalesce(sum(gp.score),0)::numeric as score,
        coalesce(sum(gp.total_prestige),0)::numeric as prestige
      from public.game_participants as gp
      join public.games as g on g.id=gp.game_id and g.status='finished'
      where gp.profile_id is not null group by gp.profile_id
    ) as stats on stats.profile_id = p.id
    where p.deleted_at is null  -- #5
  )
  select
    base.name, base.current_elo, base.peak_elo, base.games_played,
    base.wins, base.losses, base.confidence, base.score, base.prestige,
    base.efficiency, base.avg_prestige,
    base.avg_delta, base.best_delta, base.worst_delta
  into
    summary_name, summary_current_elo, summary_peak_elo, summary_games,
    summary_wins, summary_losses, summary_confidence, summary_score, summary_prestige,
    summary_efficiency, summary_avg_prestige,
    summary_avg_delta, summary_best_delta, summary_worst_delta
  from base where base.player_id = effective_selected_player_id;

  -- Recent form (last 5 games)
  select coalesce(string_agg(lf.result, '' order by lf.created_at asc, lf.game_id asc), '')
  into summary_recent_form
  from (
    select g.id as game_id, g.created_at,
      case when gp.is_winner then 'W' else 'L' end as result
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    where gp.profile_id = effective_selected_player_id
    order by g.created_at desc, g.id desc limit 5
  ) as lf;

  -- Opponent name
  if effective_selected_opponent_id is not null then
    select coalesce(nullif(p.display_name,''), p.player_name, 'Player') into opponent_name
    from public.profiles as p where p.id = effective_selected_opponent_id;
  end if;

  -- Context / H2H games
  select count(*)::int, count(*) filter (where gp.is_winner)::int
  into context_games, context_wins
  from public.game_participants as gp
  join public.games as g on g.id=gp.game_id and g.status='finished'
  where gp.profile_id = effective_selected_player_id
    and (effective_selected_opponent_id is null or exists (
      select 1 from public.game_participants as opp
      where opp.game_id=g.id and opp.profile_id=effective_selected_opponent_id));

  win_rate         := case when summary_games   >0 then summary_wins::numeric/summary_games    else 0 end;
  context_win_rate := case when context_games   >0 then context_wins::numeric/context_games    else 0 end;

  -- #2: Projection ELOs vs current registered field
  select coalesce(
    array_agg(coalesce((rating_map->>p.id::text)::numeric, 1000)) filter (where p.id <> effective_selected_player_id),
    array[]::numeric[]
  )
  into projection_opponent_ratings
  from public.profiles as p where p.deleted_at is null;

  if array_length(projection_opponent_ratings, 1) > 0 and summary_current_elo is not null then
    projection_expected := private.elo_expected_score_multi(summary_current_elo::numeric, projection_opponent_ratings);
    next_win_elo  := round(summary_current_elo + 32 * (1 - projection_expected))::int;
    next_loss_elo := round(summary_current_elo + 32 * (0 - projection_expected))::int;
  else
    next_win_elo  := summary_current_elo;
    next_loss_elo := summary_current_elo;
  end if;

  selected_summary := jsonb_build_object(
    'playerId', effective_selected_player_id, 'name', summary_name,
    'currentElo', summary_current_elo, 'peakElo', summary_peak_elo,
    'confidence', summary_confidence, 'gamesPlayed', summary_games,
    'wins', summary_wins, 'losses', summary_losses,
    'avgDelta', round(summary_avg_delta, 1),
    'bestDelta', summary_best_delta, 'worstDelta', summary_worst_delta,
    'recentForm', case when length(summary_recent_form)>0 then summary_recent_form else '-' end,
    'score', summary_score, 'prestige', summary_prestige,
    'efficiency', summary_efficiency, 'avgPrestige', summary_avg_prestige,
    'nextWinElo', next_win_elo, 'nextLossElo', next_loss_elo
  );

  top_cards := jsonb_build_array(
    jsonb_build_object('key','current-elo','label','Current ELO','value',summary_current_elo::text,
      'sub',concat(summary_games::text,' rated game',case when summary_games=1 then '' else 's' end),'tone','accent'),
    jsonb_build_object('key','peak-elo','label','Peak ELO','value',summary_peak_elo::text,
      'sub',case when summary_peak_elo>summary_current_elo
        then concat('+',(summary_peak_elo-summary_current_elo)::text,' above current')
        else 'Currently at peak' end,'tone','blue'),
    jsonb_build_object('key','win-rate','label','Win Rate','value',concat(round(win_rate*100),'%'),
      'sub',case when context_games>0 then concat('H2H ',round(context_win_rate*100),'%') else 'All rated games' end,'tone','green'));

  sections := jsonb_build_object(
    'Leaderboard', jsonb_build_object('title','Leaderboard Metrics','cards',jsonb_build_array(
      jsonb_build_object('key','leader-current','label','Current ELO','value',summary_current_elo::text,'tone','accent'),
      jsonb_build_object('key','leader-peak','label','Peak ELO','value',summary_peak_elo::text,'tone','blue'),
      jsonb_build_object('key','leader-games','label','Rated Games','value',summary_games::text,'tone','default'),
      jsonb_build_object('key','leader-record','label','Record','value',concat(summary_wins::text,'-',summary_losses::text),'tone',case when summary_wins>=summary_losses then 'green' else 'danger' end),
      jsonb_build_object('key','leader-winrate','label','Win Rate','value',concat(round(win_rate*100),'%'),'tone',case when win_rate>=0.5 then 'green' else 'danger' end),
      jsonb_build_object('key','leader-confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Momentum', jsonb_build_object('title','Momentum Snapshot','cards',jsonb_build_array(
      jsonb_build_object('key','recent-form','label','Recent Form','value',case when length(summary_recent_form)>0 then summary_recent_form else '-' end,'tone','accent'),
      jsonb_build_object('key','avg-delta','label','Avg ELO Change','value',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,'tone',case when summary_avg_delta>=0 then 'green' else 'danger' end),
      jsonb_build_object('key','wins','label','Wins','value',summary_wins::text,'tone','green'),
      jsonb_build_object('key','losses','label','Losses','value',summary_losses::text,'tone','danger'),
      jsonb_build_object('key','winrate','label','Win Rate','value',concat(round(win_rate*100),'%'),'tone',case when win_rate>=0.5 then 'green' else 'danger' end),
      jsonb_build_object('key','confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Skills', jsonb_build_object('title','Rating Profile','cards',jsonb_build_array(
      jsonb_build_object('key','current','label','Current ELO','value',summary_current_elo::text,'tone','accent'),
      jsonb_build_object('key','peak','label','Peak ELO','value',summary_peak_elo::text,'tone','blue'),
      jsonb_build_object('key','best-delta','label','Best Single Game','value',case when summary_best_delta>=0 then concat('+',summary_best_delta::text) else summary_best_delta::text end,'tone','green'),
      jsonb_build_object('key','worst-delta','label','Worst Single Game','value',case when summary_worst_delta>=0 then concat('+',summary_worst_delta::text) else summary_worst_delta::text end,'tone','danger'),
      jsonb_build_object('key','record','label','Record','value',concat(summary_wins::text,'-',summary_losses::text),'tone',case when summary_wins>=summary_losses then 'green' else 'danger' end),
      jsonb_build_object('key','confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Context', jsonb_build_object('title','Context Split','cards',jsonb_build_array(
      jsonb_build_object('key','sample','label',case when opponent_name is not null then concat('Games vs ',opponent_name) else 'Filtered Games' end,'value',context_games::text,'tone','accent'),
      jsonb_build_object('key','context-winrate','label','H2H Win Rate','value',concat(round(context_win_rate*100),'%'),'tone',case when context_win_rate>=0.5 then 'green' else 'danger' end),
      jsonb_build_object('key','context-wins','label','Filter Wins','value',context_wins::text,'tone','green'),
      jsonb_build_object('key','context-losses','label','Filter Losses','value',greatest(context_games-context_wins,0)::text,'tone','danger'),
      jsonb_build_object('key','context-current','label','Current ELO','value',summary_current_elo::text,'tone','blue'),
      jsonb_build_object('key','context-confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','default'))),
    'Projection', jsonb_build_object('title','Projection Window','cards',jsonb_build_array(
      jsonb_build_object('key','current-proj','label','Current ELO','value',summary_current_elo::text,'tone','accent'),
      jsonb_build_object('key','next-win','label','Next Win ELO','value',next_win_elo::text,'tone','green'),
      jsonb_build_object('key','next-loss','label','Next Loss ELO','value',next_loss_elo::text,'tone','danger'),
      jsonb_build_object('key','avg-delta','label','Avg ELO Change','value',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,'tone','accent'),
      jsonb_build_object('key','best-delta','label','Best Single Game','value',case when summary_best_delta>=0 then concat('+',summary_best_delta::text) else summary_best_delta::text end,'tone','green'),
      jsonb_build_object('key','confidence-proj','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue')))
  );

  insights := jsonb_build_object(
    'Leaderboard', jsonb_build_object('title','Leaderboard Insight','body',
      case when summary_games=0 then 'No rated games yet. Finish a saved game to start ELO tracking.'
      else concat(summary_name,' sits at ELO ',summary_current_elo::text,' (peak: ',summary_peak_elo::text,').') end),
    'Momentum', jsonb_build_object('title','Momentum Insight','body',
      case when summary_games=0 then 'No rated games yet. Finish a saved game to start real ELO tracking.'
      else concat(summary_name,' recent form: ',case when length(summary_recent_form)>0 then summary_recent_form else '-' end,'. Avg ELO change: ',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,' per game.') end),
    'Skills', jsonb_build_object('title','Rating Insight','body',
      case when summary_games=0 then 'No rated games yet.'
      else concat(summary_name,' peaked at ',summary_peak_elo::text,'.',case when summary_peak_elo>summary_current_elo then concat(' Currently ',(summary_peak_elo-summary_current_elo)::text,' below career peak.') else ' Currently at career peak.' end) end),
    'Context', jsonb_build_object('title','Context Insight','body',
      case when opponent_name is not null and context_games>0
        then concat(summary_name,' ',context_wins::text,' win',case when context_wins=1 then '' else 's' end,' in ',context_games::text,' game',case when context_games=1 then '' else 's' end,' against ',opponent_name,'.')
        else 'Select an opponent to isolate head-to-head results.' end),
    'Projection', jsonb_build_object('title','Projection Insight','body',
      case when summary_games=0 then 'Projection requires at least one rated game.'
      else concat('Win vs current field: ',next_win_elo::text,' (',case when next_win_elo>=summary_current_elo then concat('+') else '' end,(next_win_elo-summary_current_elo)::text,'). Loss: ',next_loss_elo::text,' (',(next_loss_elo-summary_current_elo)::text,').') end)
  );

  if all_profiles_count = 0 then
    empty_state := jsonb_build_object('title','No ELO roster yet','description','Create at least one profile to unlock the server-authored leaderboard.');
  elsif summary_games = 0 then
    empty_state := jsonb_build_object('title','No rated games yet','description','Finish a saved game to populate the server-authored ELO surfaces.');
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'sortKey', coalesce(sort_key, 'elo'),
    'playerOptions', player_options,
    'selectedPlayerId', effective_selected_player_id,
    'selectedOpponentId', effective_selected_opponent_id,
    'leaderboardRows', leaderboard_rows,
    'summary', selected_summary,
    'topCards', top_cards,
    'sections', sections,
    'insights', insights,
    'emptyState', empty_state
  );
end;
$$;

