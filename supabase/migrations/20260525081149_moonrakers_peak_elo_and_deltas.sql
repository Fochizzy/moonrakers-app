
-- Fix #1: real peak ELO tracked across every game replay.
-- Fix #4: avgDelta / bestDelta / worstDelta computed from the same replay loop.
-- Bonus: Projection cards now show actual next-win / next-loss ELO vs the current field.

create or replace function public.get_elo_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null,
  sort_key text default 'elo'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  normalized_sort_key text := lower(coalesce(sort_key, 'elo'));
  rating_map jsonb := '{}'::jsonb;
  peak_rating_map jsonb := '{}'::jsonb;
  next_rating_map jsonb := '{}'::jsonb;
  game_row record;
  participant_row record;
  current_rating numeric;
  opponent_ratings numeric[];
  actual_score numeric;
  next_rating integer;
  elo_delta integer := 0;
  delta_sum numeric := 0;
  delta_count integer := 0;
  summary_avg_delta integer := 0;
  summary_best_delta integer := 0;
  summary_worst_delta integer := 0;
  other_player_elos numeric[];
  expected_score_vs_field numeric := 0.5;
  next_win_elo integer := 1000;
  next_loss_elo integer := 1000;
  player_options jsonb := '[]'::jsonb;
  leaderboard_rows jsonb := '[]'::jsonb;
  selected_summary jsonb := null;
  top_cards jsonb := '[]'::jsonb;
  sections jsonb := '{}'::jsonb;
  insights jsonb := '{}'::jsonb;
  empty_state jsonb := null;
  all_profiles_count integer := 0;
  effective_selected_player_id uuid := null;
  effective_selected_opponent_id uuid := null;
  summary_name text := 'Unknown';
  summary_current_elo integer := 1000;
  summary_peak_elo integer := 1000;
  summary_games integer := 0;
  summary_wins integer := 0;
  summary_losses integer := 0;
  summary_confidence numeric := 0;
  summary_recent_form text := '';
  summary_score numeric := 0;
  summary_prestige numeric := 0;
  summary_efficiency numeric := 0;
  summary_avg_prestige numeric := 0;
  win_rate numeric := 0;
  context_games integer := 0;
  context_wins integer := 0;
  context_win_rate numeric := 0;
  opponent_name text := null;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select count(*) into all_profiles_count from public.profiles;

  select coalesce(
    (select p.id from public.profiles as p where p.id = focus_player_id limit 1),
    (select p.id from public.profiles as p where p.id = profile_id limit 1),
    (select p.id from public.profiles as p order by lower(coalesce(nullif(p.display_name, ''), p.player_name, 'Player')), p.id limit 1)
  ) into effective_selected_player_id;

  if opponent_id is not null and opponent_id <> effective_selected_player_id then
    select p.id into effective_selected_opponent_id
    from public.profiles as p where p.id = opponent_id limit 1;
  end if;

  -- Replay all finished games chronologically.
  -- Two maps are maintained in parallel:
  --   rating_map      → current ELO after each game
  --   peak_rating_map → highest ELO ever reached
  -- Per-game deltas for the focused player are accumulated in the same pass.
  for game_row in
    select g.id, g.created_at, g.winner_profile_id
    from public.games as g
    where g.status = 'finished'
      and exists (select 1 from public.game_participants as gp where gp.game_id = g.id and gp.profile_id is not null)
    order by g.created_at asc, g.id asc
  loop
    next_rating_map := rating_map;

    for participant_row in
      select gp.profile_id, gp.start_order
      from public.game_participants as gp
      where gp.game_id = game_row.id and gp.profile_id is not null
      order by gp.start_order asc, gp.profile_id asc
    loop
      current_rating := coalesce((rating_map->>participant_row.profile_id::text)::numeric, 1000::numeric);

      select coalesce(
        array_agg(coalesce((rating_map->>gp.profile_id::text)::numeric, 1000::numeric) order by gp.start_order asc, gp.profile_id asc),
        array[]::numeric[]
      )
      into opponent_ratings
      from public.game_participants as gp
      where gp.game_id = game_row.id
        and gp.profile_id is not null
        and gp.profile_id <> participant_row.profile_id;

      actual_score := case
        when game_row.winner_profile_id is null then 0.5::numeric
        when game_row.winner_profile_id = participant_row.profile_id then 1::numeric
        else 0::numeric
      end;

      next_rating := round(
        current_rating + 32::numeric * (actual_score - private.elo_expected_score_multi(current_rating, opponent_ratings))
      );

      next_rating_map := jsonb_set(next_rating_map, array[participant_row.profile_id::text], to_jsonb(next_rating), true);

      -- Peak ELO: update whenever the new rating exceeds the stored peak.
      peak_rating_map := jsonb_set(
        peak_rating_map,
        array[participant_row.profile_id::text],
        to_jsonb(greatest(coalesce((peak_rating_map->>participant_row.profile_id::text)::int, 1000), next_rating)),
        true
      );

      -- Accumulate per-game ELO deltas for the focused player only.
      if effective_selected_player_id is not null and participant_row.profile_id = effective_selected_player_id then
        elo_delta := next_rating - current_rating::integer;
        delta_count := delta_count + 1;
        delta_sum := delta_sum + elo_delta;
        if delta_count = 1 then
          summary_best_delta := elo_delta;
          summary_worst_delta := elo_delta;
        else
          summary_best_delta := greatest(summary_best_delta, elo_delta);
          summary_worst_delta := least(summary_worst_delta, elo_delta);
        end if;
      end if;
    end loop;

    rating_map := next_rating_map;
  end loop;

  if delta_count > 0 then
    summary_avg_delta := round(delta_sum / delta_count);
  end if;

  -- Pre-populate current/peak from the maps so the projection block can use them.
  -- These values are also set later via the base CTE (same source, same result).
  if effective_selected_player_id is not null then
    summary_current_elo := coalesce((rating_map->>effective_selected_player_id::text)::int, 1000);
    summary_peak_elo    := coalesce((peak_rating_map->>effective_selected_player_id::text)::int, 1000);
  end if;

  -- Projection: expected ELO outcome vs the current field of active players.
  select array_agg(coalesce((rating_map->>p.id::text)::numeric, 1000::numeric))
  into other_player_elos
  from public.profiles as p
  where p.deleted_at is null and p.id <> effective_selected_player_id;

  if other_player_elos is not null and array_length(other_player_elos, 1) > 0 then
    expected_score_vs_field := private.elo_expected_score_multi(summary_current_elo::numeric, other_player_elos);
  end if;

  next_win_elo  := summary_current_elo + round(32::numeric * (1::numeric - expected_score_vs_field));
  next_loss_elo := summary_current_elo + round(32::numeric * (0::numeric - expected_score_vs_field));

  -- Player picker options
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', coalesce(nullif(p.display_name, ''), p.player_name, 'Player'),
        'label', coalesce(nullif(p.display_name, ''), p.player_name, 'Player'),
        'displayName', nullif(p.display_name, ''),
        'playerName', p.player_name,
        'color', p.favorite_color,
        'assignedCardArtIndex', p.assigned_card_art_index,
        'gamesPlayed', coalesce(stats.games_played, 0),
        'currentElo', coalesce((rating_map->>p.id::text)::int, 1000)
      )
      order by lower(coalesce(nullif(p.display_name, ''), p.player_name, 'Player')), p.id
    ),
    '[]'::jsonb
  )
  into player_options
  from public.profiles as p
  left join (
    select gp.profile_id, count(g.id)::int as games_played
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id
    where g.status = 'finished' and gp.profile_id is not null
    group by gp.profile_id
  ) as stats on stats.profile_id = p.id;

  -- Leaderboard rows: peakElo now comes from peak_rating_map, not current ELO.
  with base as (
    select
      p.id as player_id,
      coalesce(nullif(p.display_name, ''), p.player_name, 'Player') as name,
      p.favorite_color as color,
      p.assigned_card_art_index as assigned_card_art_index,
      coalesce((rating_map->>p.id::text)::int, 1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int, 1000) as peak_elo,
      coalesce(stats.games_played, 0) as games_played,
      coalesce(stats.wins, 0) as wins,
      greatest(coalesce(stats.games_played, 0) - coalesce(stats.wins, 0), 0) as losses,
      coalesce(stats.score, 0)::numeric as score,
      coalesce(stats.prestige, 0)::numeric as prestige,
      case when coalesce(stats.games_played, 0) > 0
        then coalesce(stats.wins, 0)::numeric / stats.games_played::numeric else 0::numeric end as efficiency,
      case when coalesce(stats.games_played, 0) > 0
        then coalesce(stats.prestige, 0)::numeric / stats.games_played::numeric else 0::numeric end as avg_prestige,
      least(1::numeric, case when coalesce(stats.games_played, 0) > 0
        then stats.games_played::numeric / 12::numeric else 0::numeric end) as confidence
    from public.profiles as p
    left join (
      select gp.profile_id,
        count(g.id)::int as games_played,
        count(g.id) filter (where gp.is_winner)::int as wins,
        coalesce(sum(gp.score), 0)::numeric as score,
        coalesce(sum(gp.total_prestige), 0)::numeric as prestige
      from public.game_participants as gp
      join public.games as g on g.id = gp.game_id
      where g.status = 'finished' and gp.profile_id is not null
      group by gp.profile_id
    ) as stats on stats.profile_id = p.id
  ),
  ordered as (
    select base.*, row_number() over (
      order by case
        when normalized_sort_key = 'wins' then wins::numeric
        when normalized_sort_key = 'games' then games_played::numeric
        when normalized_sort_key = 'score' then score
        when normalized_sort_key = 'prestige' then prestige
        when normalized_sort_key = 'efficiency' then efficiency
        when normalized_sort_key = 'avgprestige' then avg_prestige
        else current_elo::numeric
      end desc, lower(name) asc, player_id asc
    ) as rank
    from base
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rank', rank, 'playerId', player_id, 'name', name, 'color', color,
      'assignedCardArtIndex', assigned_card_art_index,
      'currentElo', current_elo, 'peakElo', peak_elo, 'confidence', confidence,
      'gamesPlayed', games_played, 'wins', wins, 'losses', losses,
      'score', score, 'prestige', prestige, 'efficiency', efficiency, 'avgPrestige', avg_prestige
    ) order by rank
  ), '[]'::jsonb)
  into leaderboard_rows from ordered;

  -- Summary for selected player: peak_elo from peak_rating_map.
  with base as (
    select
      p.id as player_id,
      coalesce(nullif(p.display_name, ''), p.player_name, 'Player') as name,
      coalesce((rating_map->>p.id::text)::int, 1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int, 1000) as peak_elo,
      coalesce(stats.games_played, 0) as games_played,
      coalesce(stats.wins, 0) as wins,
      greatest(coalesce(stats.games_played, 0) - coalesce(stats.wins, 0), 0) as losses,
      coalesce(stats.score, 0)::numeric as score,
      coalesce(stats.prestige, 0)::numeric as prestige,
      case when coalesce(stats.games_played, 0) > 0
        then coalesce(stats.wins, 0)::numeric / stats.games_played::numeric else 0::numeric end as efficiency,
      case when coalesce(stats.games_played, 0) > 0
        then coalesce(stats.prestige, 0)::numeric / stats.games_played::numeric else 0::numeric end as avg_prestige,
      least(1::numeric, case when coalesce(stats.games_played, 0) > 0
        then stats.games_played::numeric / 12::numeric else 0::numeric end) as confidence
    from public.profiles as p
    left join (
      select gp.profile_id,
        count(g.id)::int as games_played,
        count(g.id) filter (where gp.is_winner)::int as wins,
        coalesce(sum(gp.score), 0)::numeric as score,
        coalesce(sum(gp.total_prestige), 0)::numeric as prestige
      from public.game_participants as gp
      join public.games as g on g.id = gp.game_id
      where g.status = 'finished' and gp.profile_id is not null
      group by gp.profile_id
    ) as stats on stats.profile_id = p.id
  )
  select base.name, base.current_elo, base.peak_elo, base.games_played, base.wins, base.losses,
    base.confidence, base.score, base.prestige, base.efficiency, base.avg_prestige
  into summary_name, summary_current_elo, summary_peak_elo, summary_games, summary_wins, summary_losses,
    summary_confidence, summary_score, summary_prestige, summary_efficiency, summary_avg_prestige
  from base where base.player_id = effective_selected_player_id;

  select coalesce(string_agg(last_five.result, '' order by last_five.created_at asc, last_five.game_id asc), '')
  into summary_recent_form
  from (
    select g.id as game_id, g.created_at,
      case when gp.is_winner then 'W' else 'L' end as result
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id
    where g.status = 'finished' and gp.profile_id = effective_selected_player_id
    order by g.created_at desc, g.id desc
    limit 5
  ) as last_five;

  if effective_selected_opponent_id is not null then
    select coalesce(nullif(p.display_name, ''), p.player_name, 'Player')
    into opponent_name from public.profiles as p
    where p.id = effective_selected_opponent_id;
  end if;

  select count(*)::int, count(*) filter (where gp.is_winner)::int
  into context_games, context_wins
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id
  where g.status = 'finished'
    and gp.profile_id = effective_selected_player_id
    and (effective_selected_opponent_id is null or exists (
      select 1 from public.game_participants as opp
      where opp.game_id = g.id and opp.profile_id = effective_selected_opponent_id
    ));

  win_rate         := case when summary_games > 0 then summary_wins::numeric / summary_games::numeric else 0::numeric end;
  context_win_rate := case when context_games > 0 then context_wins::numeric / context_games::numeric else 0::numeric end;

  selected_summary := jsonb_build_object(
    'playerId', effective_selected_player_id,
    'name', summary_name,
    'currentElo', summary_current_elo,
    'peakElo', summary_peak_elo,
    'confidence', summary_confidence,
    'gamesPlayed', summary_games,
    'wins', summary_wins,
    'losses', summary_losses,
    'avgDelta', summary_avg_delta,
    'bestDelta', summary_best_delta,
    'worstDelta', summary_worst_delta,
    'recentForm', case when length(summary_recent_form) > 0 then summary_recent_form else '-' end,
    'score', summary_score,
    'prestige', summary_prestige,
    'efficiency', summary_efficiency,
    'avgPrestige', summary_avg_prestige
  );

  top_cards := jsonb_build_array(
    jsonb_build_object('key', 'current-elo', 'label', 'Current ELO', 'value', summary_current_elo::text,
      'sub', concat(summary_games::text, ' rated game', case when summary_games = 1 then '' else 's' end), 'tone', 'accent'),
    jsonb_build_object('key', 'peak-elo', 'label', 'Peak ELO', 'value', summary_peak_elo::text,
      'sub', case when summary_peak_elo > summary_current_elo
        then concat('+', (summary_peak_elo - summary_current_elo)::text, ' above current')
        else 'Currently at peak' end, 'tone', 'blue'),
    jsonb_build_object('key', 'win-rate', 'label', 'Win Rate', 'value', concat(round(win_rate * 100), '%'),
      'sub', case when context_games > 0 then concat('H2H ', round(context_win_rate * 100), '%') else 'All rated games' end,
      'tone', 'green')
  );

  sections := jsonb_build_object(
    'Leaderboard', jsonb_build_object('title', 'Leaderboard Metrics', 'cards', jsonb_build_array(
      jsonb_build_object('key', 'leader-current', 'label', 'Current ELO', 'value', summary_current_elo::text, 'tone', 'accent'),
      jsonb_build_object('key', 'leader-peak', 'label', 'Peak ELO', 'value', summary_peak_elo::text, 'tone', 'blue'),
      jsonb_build_object('key', 'leader-games', 'label', 'Rated Games', 'value', summary_games::text, 'tone', 'default'),
      jsonb_build_object('key', 'leader-record', 'label', 'Record', 'value', concat(summary_wins::text, '-', summary_losses::text),
        'tone', case when summary_wins >= summary_losses then 'green' else 'danger' end),
      jsonb_build_object('key', 'leader-winrate', 'label', 'Win Rate', 'value', concat(round(win_rate * 100), '%'),
        'tone', case when win_rate >= 0.5 then 'green' else 'danger' end),
      jsonb_build_object('key', 'leader-confidence', 'label', 'Confidence', 'value', concat(round(summary_confidence * 100), '%'), 'tone', 'blue')
    )),
    'Momentum', jsonb_build_object('title', 'Momentum Snapshot', 'cards', jsonb_build_array(
      jsonb_build_object('key', 'recent-form', 'label', 'Recent Form',
        'value', case when length(summary_recent_form) > 0 then summary_recent_form else '-' end, 'tone', 'accent'),
      jsonb_build_object('key', 'games', 'label', 'Rated Games', 'value', summary_games::text, 'tone', 'default'),
      jsonb_build_object('key', 'wins', 'label', 'Wins', 'value', summary_wins::text, 'tone', 'green'),
      jsonb_build_object('key', 'losses', 'label', 'Losses', 'value', summary_losses::text, 'tone', 'danger'),
      jsonb_build_object('key', 'winrate', 'label', 'Win Rate', 'value', concat(round(win_rate * 100), '%'),
        'tone', case when win_rate >= 0.5 then 'green' else 'danger' end),
      jsonb_build_object('key', 'avg-delta', 'label', 'Avg ELO Δ',
        'value', case when summary_avg_delta >= 0 then concat('+', summary_avg_delta::text) else summary_avg_delta::text end,
        'tone', case when summary_avg_delta >= 0 then 'green' else 'danger' end)
    )),
    'Skills', jsonb_build_object('title', 'Rating Profile', 'cards', jsonb_build_array(
      jsonb_build_object('key', 'current', 'label', 'Current ELO', 'value', summary_current_elo::text, 'tone', 'accent'),
      jsonb_build_object('key', 'peak', 'label', 'Peak ELO', 'value', summary_peak_elo::text, 'tone', 'blue'),
      jsonb_build_object('key', 'best-delta', 'label', 'Best ELO Δ',
        'value', case when summary_best_delta >= 0 then concat('+', summary_best_delta::text) else summary_best_delta::text end, 'tone', 'green'),
      jsonb_build_object('key', 'worst-delta', 'label', 'Worst ELO Δ', 'value', summary_worst_delta::text, 'tone', 'danger'),
      jsonb_build_object('key', 'confidence', 'label', 'Confidence', 'value', concat(round(summary_confidence * 100), '%'), 'tone', 'blue'),
      jsonb_build_object('key', 'winrate', 'label', 'Win Rate', 'value', concat(round(win_rate * 100), '%'),
        'tone', case when win_rate >= 0.5 then 'green' else 'danger' end)
    )),
    'Context', jsonb_build_object('title', 'Context Split', 'cards', jsonb_build_array(
      jsonb_build_object('key', 'sample',
        'label', case when opponent_name is not null then concat('Games vs ', opponent_name) else 'Filtered Games' end,
        'value', context_games::text, 'tone', 'accent'),
      jsonb_build_object('key', 'context-winrate', 'label', 'Head-to-Head Win Rate',
        'value', concat(round(context_win_rate * 100), '%'),
        'tone', case when context_win_rate >= 0.5 then 'green' else 'danger' end),
      jsonb_build_object('key', 'context-wins', 'label', 'Filter Wins', 'value', context_wins::text, 'tone', 'green'),
      jsonb_build_object('key', 'context-losses', 'label', 'Filter Losses', 'value', greatest(context_games - context_wins, 0)::text, 'tone', 'danger'),
      jsonb_build_object('key', 'context-current', 'label', 'Current ELO', 'value', summary_current_elo::text, 'tone', 'blue'),
      jsonb_build_object('key', 'context-confidence', 'label', 'Confidence', 'value', concat(round(summary_confidence * 100), '%'), 'tone', 'default')
    )),
    'Projection', jsonb_build_object('title', 'Projection Window', 'cards', jsonb_build_array(
      jsonb_build_object('key', 'current-proj', 'label', 'Current ELO', 'value', summary_current_elo::text, 'tone', 'accent'),
      jsonb_build_object('key', 'next-win', 'label', 'Next Win ELO', 'value', next_win_elo::text, 'tone', 'green'),
      jsonb_build_object('key', 'next-loss', 'label', 'Next Loss ELO', 'value', next_loss_elo::text, 'tone', 'danger'),
      jsonb_build_object('key', 'avg-delta', 'label', 'Avg ELO Δ / game',
        'value', case when summary_avg_delta >= 0 then concat('+', summary_avg_delta::text) else summary_avg_delta::text end,
        'tone', case when summary_avg_delta >= 0 then 'green' else 'danger' end),
      jsonb_build_object('key', 'best-delta', 'label', 'Best single game',
        'value', case when summary_best_delta >= 0 then concat('+', summary_best_delta::text) else summary_best_delta::text end, 'tone', 'green'),
      jsonb_build_object('key', 'worst-delta', 'label', 'Worst single game', 'value', summary_worst_delta::text, 'tone', 'danger')
    ))
  );

  insights := jsonb_build_object(
    'Leaderboard', jsonb_build_object('title', 'Leaderboard Insight', 'body', case
      when summary_games = 0 then 'Leaderboard and ELO now share the same current-rating source.'
      else concat(summary_name, ' is ranked using the same current ELO value as the leaderboard view.')
    end),
    'Momentum', jsonb_build_object('title', 'Momentum Insight', 'body', case
      when summary_games = 0 then 'No rated games yet. Finish a saved game to start real leaderboard-backed ELO tracking.'
      else concat(
        summary_name, ' has played ', summary_games::text, ' rated game',
        case when summary_games = 1 then '' else 's' end,
        ' with recent form ', case when length(summary_recent_form) > 0 then summary_recent_form else '-' end,
        '. Avg ELO Δ per game: ',
        case when summary_avg_delta >= 0 then concat('+', summary_avg_delta::text) else summary_avg_delta::text end, '.'
      )
    end),
    'Skills', jsonb_build_object('title', 'Rating Insight', 'body', case
      when summary_games = 0 then 'This screen now uses the same ELO source as the leaderboard.'
      else concat(
        summary_name, ' currently sits at ', summary_current_elo::text, ' (peak: ', summary_peak_elo::text, ').',
        case when summary_peak_elo > summary_current_elo
          then concat(' Down ', (summary_peak_elo - summary_current_elo)::text, ' from peak.')
          else ' Currently at peak rating.' end
      )
    end),
    'Context', jsonb_build_object('title', 'Context Insight', 'body', case
      when opponent_name is not null and context_games > 0 then concat(
        summary_name, ' has ', context_wins::text, ' win', case when context_wins = 1 then '' else 's' end,
        ' in ', context_games::text, ' rated game', case when context_games = 1 then '' else 's' end,
        ' against ', opponent_name, '.'
      )
      else 'Select an opponent to isolate head-to-head results from saved game history.'
    end),
    'Projection', jsonb_build_object('title', 'Projection Insight', 'body', case
      when summary_games = 0 then 'Projection is limited until saved games exist.'
      else concat(
        'At ', summary_current_elo::text, ' ELO, a win vs the current field projects to ~',
        next_win_elo::text, ' and a loss to ~', next_loss_elo::text, '.'
      )
    end)
  );

  if all_profiles_count = 0 then
    empty_state := jsonb_build_object(
      'title', 'No ELO roster yet',
      'description', 'Create at least one profile to unlock the server-authored leaderboard.'
    );
  elsif summary_games = 0 then
    empty_state := jsonb_build_object(
      'title', 'No rated games yet',
      'description', 'Finish a saved game to populate the server-authored ELO surfaces.'
    );
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

revoke all on function public.get_elo_screen(uuid, uuid, uuid, text) from public;
revoke all on function public.get_elo_screen(uuid, uuid, uuid, text) from anon;
grant execute on function public.get_elo_screen(uuid, uuid, uuid, text) to authenticated;
;
