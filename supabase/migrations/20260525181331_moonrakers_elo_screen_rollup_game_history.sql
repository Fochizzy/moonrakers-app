
-- #3: get_elo_screen — reads from global elo_leaderboard rollup (no game replay)
create or replace function public.get_elo_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null,
  sort_key text default 'elo'
)
returns jsonb language plpgsql stable set search_path = 'public'
as $$
declare
  norm_sort        text    := lower(coalesce(sort_key, 'elo'));
  all_rows         jsonb   := '[]'::jsonb;
  leaderboard_rows jsonb   := '[]'::jsonb;
  player_options   jsonb   := '[]'::jsonb;
  selected_row     jsonb   := null;
  summary          jsonb   := null;
  top_cards        jsonb   := '[]'::jsonb;
  sections         jsonb   := '{}'::jsonb;
  insights         jsonb   := '{}'::jsonb;
  sel_player_id    uuid    := null;
  sel_opponent_id  uuid    := null;
  my_elo           int     := 1000;
  next_win_elo     int     := 1000;
  next_loss_elo    int     := 1000;
  proj_expected    numeric := 0;
  proj_count       int     := 0;
  opp_elo          int;
  context_games    int     := 0;
  context_wins     int     := 0;
  context_win_rate numeric := 0;
  opponent_name    text    := null;
  all_cnt          int     := 0;
  row_item         jsonb;
  k                constant numeric := 32;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select count(*) into all_cnt from public.profiles where deleted_at is null;

  -- Resolve effective player (focus > caller > alphabetical first)
  select coalesce(
    (select p.id from public.profiles as p where p.id = focus_player_id  and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.id = profile_id        and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.deleted_at is null
       order by lower(coalesce(nullif(p.display_name,''), p.player_name, 'Player')), p.id limit 1)
  ) into sel_player_id;

  if opponent_id is not null and opponent_id <> sel_player_id then
    select p.id into sel_opponent_id
    from public.profiles as p where p.id = opponent_id and p.deleted_at is null limit 1;
  end if;

  -- Read pre-computed ELO leaderboard (eliminates full game-history replay)
  select coalesce(payload->'rows', '[]'::jsonb) into all_rows
  from public.global_stats_rollups where key = 'elo_leaderboard';

  -- Sort by requested key
  select coalesce(jsonb_agg(r order by (
    case norm_sort
      when 'prestige' then (r->>'prestige')::numeric
      when 'score'    then (r->>'score')::numeric
      when 'wins'     then (r->>'wins')::numeric
      when 'games'    then (r->>'gamesPlayed')::numeric
      else                 (r->>'currentElo')::numeric
    end
  ) desc, lower(r->>'name') asc), '[]'::jsonb)
  into leaderboard_rows from jsonb_array_elements(all_rows) as r;

  -- Append rank field
  select coalesce(jsonb_agg(r || jsonb_build_object('rank', ordinality::int) order by ordinality), '[]'::jsonb)
  into leaderboard_rows
  from jsonb_array_elements(leaderboard_rows) with ordinality as r(r, ordinality);

  -- Build player options
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',                   r->>'playerId',
    'label',                r->>'name',
    'name',                 r->>'name',
    'color',                r->'color',
    'assignedCardArtIndex', r->'assignedCardArtIndex',
    'currentElo',           r->'currentElo',
    'gamesPlayed',          r->'gamesPlayed'
  ) order by lower(r->>'name')), '[]'::jsonb)
  into player_options from jsonb_array_elements(leaderboard_rows) as r;

  -- Find selected player row
  select r into selected_row
  from jsonb_array_elements(leaderboard_rows) as r
  where (r->>'playerId') = sel_player_id::text limit 1;

  if selected_row is null then
    return jsonb_build_object(
      'generatedAt', now(), 'selectedPlayerId', sel_player_id,
      'selectedOpponentId', sel_opponent_id,
      'playerOptions', player_options, 'leaderboardRows', leaderboard_rows,
      'summary', null, 'topCards', '[]'::jsonb,
      'sections', '{}'::jsonb, 'insights', '{}'::jsonb,
      'emptyState', jsonb_build_object(
        'title', 'No ELO data yet',
        'description', 'Play a few games to see your ELO rating.')
    );
  end if;

  my_elo := coalesce((selected_row->>'currentElo')::int, 1000);

  -- Compute next-game projections from stored ratings (no game scan needed)
  for row_item in select r from jsonb_array_elements(leaderboard_rows) as r loop
    if (row_item->>'playerId') <> sel_player_id::text then
      opp_elo       := coalesce((row_item->>'currentElo')::int, 1000);
      proj_expected := proj_expected + 1.0 / (1.0 + pow(10.0, (opp_elo - my_elo)::numeric / 400.0));
      proj_count    := proj_count + 1;
    end if;
  end loop;

  if proj_count > 0 then
    proj_expected := proj_expected / proj_count;
    next_win_elo  := my_elo + round(k * (1.0 - proj_expected))::int;
    next_loss_elo := my_elo + round(k * (0.0 - proj_expected))::int;
  else
    next_win_elo  := my_elo + round(k * 0.5)::int;
    next_loss_elo := my_elo - round(k * 0.5)::int;
  end if;

  -- Opponent context (live query — viewer-dependent, minority use case)
  if sel_opponent_id is not null then
    select coalesce(nullif(p.display_name, ''), p.player_name, 'Player')
    into opponent_name from public.profiles as p where p.id = sel_opponent_id limit 1;

    select count(*)::int, count(*) filter (where g.winner_profile_id = sel_player_id)::int
    into context_games, context_wins
    from public.games as g
    join public.game_participants as gp on gp.game_id = g.id and gp.profile_id = sel_player_id
    where g.status = 'finished'
      and exists (select 1 from public.game_participants as ogp
                  where ogp.game_id = g.id and ogp.profile_id = sel_opponent_id);
    context_win_rate := case when context_games > 0 then context_wins::numeric / context_games else 0 end;
  end if;

  summary := jsonb_build_object(
    'playerId',          sel_player_id,
    'name',              selected_row->>'name',
    'currentElo',        selected_row->'currentElo',
    'peakElo',           selected_row->'peakElo',
    'gamesPlayed',       selected_row->'gamesPlayed',
    'wins',              selected_row->'wins',
    'losses',            selected_row->'losses',
    'confidence',        selected_row->'confidence',
    'recentForm',        selected_row->'recentForm',
    'avgDelta',          selected_row->'avgDelta',
    'bestDelta',         selected_row->'bestDelta',
    'worstDelta',        selected_row->'worstDelta',
    'nextWinElo',        next_win_elo,
    'nextLossElo',       next_loss_elo,
    'projectedExpected', round(proj_expected, 3),
    'contextGames',      case when sel_opponent_id is not null then context_games else null end,
    'contextWins',       case when sel_opponent_id is not null then context_wins else null end,
    'contextWinRate',    case when sel_opponent_id is not null then round(context_win_rate, 3) else null end,
    'opponentName',      opponent_name
  );

  top_cards := jsonb_build_array(
    jsonb_build_object('key','current-elo','label','Current ELO',
      'value',(selected_row->>'currentElo')::int,
      'description','Rating based on match outcomes with ELO scaling.'),
    jsonb_build_object('key','peak-elo','label','Peak ELO',
      'value',(selected_row->>'peakElo')::int,
      'description','Highest ELO rating achieved.'),
    jsonb_build_object('key','elo-confidence','label','Confidence',
      'value',concat(round((selected_row->>'confidence')::numeric * 100)::int, '%'),
      'description',concat(selected_row->>'gamesPlayed', ' games tracked. Full confidence at 12.')),
    jsonb_build_object('key','win-loss','label','Win / Loss',
      'value',concat(selected_row->>'wins', ' / ', selected_row->>'losses'),
      'description','Wins and losses in finished tracked games.'),
    jsonb_build_object('key','next-win-elo','label','Win gains',
      'value',concat('+', next_win_elo - my_elo),
      'description','Expected ELO change for next win.'),
    jsonb_build_object('key','next-loss-elo','label','Loss costs',
      'value',next_loss_elo - my_elo,
      'description','Expected ELO change for next loss.')
  );

  sections := jsonb_build_object('Leaderboard', jsonb_build_object(
    'rows',               leaderboard_rows,
    'selectedPlayerId',   sel_player_id,
    'selectedOpponentId', sel_opponent_id,
    'sortKey',            norm_sort,
    'playerCount',        all_cnt
  ));

  insights := jsonb_build_object('Leaderboard', jsonb_build_object(
    'title', case
      when sel_opponent_id is not null and opponent_name is not null
        then format('vs %s', opponent_name)
      when (selected_row->>'wins')::int > (selected_row->>'losses')::int then 'Winning record'
      when (selected_row->>'wins')::int < (selected_row->>'losses')::int then 'Below break-even'
      else 'Balanced record'
    end,
    'body', case
      when sel_opponent_id is not null and opponent_name is not null
        then format('%s and %s: %s shared games, %s wins for %s.',
          selected_row->>'name', opponent_name,
          context_games, context_wins, selected_row->>'name')
      else format('%s — ELO %s, %s/%s record. Win nets +%s, loss costs %s.',
        selected_row->>'name', selected_row->>'currentElo',
        selected_row->>'wins', selected_row->>'losses',
        next_win_elo - my_elo, next_loss_elo - my_elo)
    end
  ));

  return jsonb_build_object(
    'generatedAt',        now(),
    'selectedPlayerId',   sel_player_id,
    'selectedOpponentId', sel_opponent_id,
    'playerOptions',      player_options,
    'leaderboardRows',    leaderboard_rows,
    'summary',            summary,
    'topCards',           top_cards,
    'sections',           sections,
    'insights',           insights,
    'emptyState',         null
  );
end;
$$;


-- #4: get_game_history — paginated game log (replaces game history in rollup)
-- Returns items compatible with the format used by get_player_profile_screen.recentGames.
create or replace function public.get_game_history(
  target_profile_id  uuid,
  page_limit         int         default 20,
  before_finished_at timestamptz default null,
  before_game_id     uuid        default null,
  filter_opponent_id uuid        default null
)
returns jsonb language plpgsql stable security definer set search_path = 'public'
as $$
declare
  raw_items jsonb;
  items     jsonb;
  total_cnt int;
  has_more  bool;
  last_item jsonb;
  last_at   timestamptz;
  last_id   uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- Total count for this filter (used by client for pagination UI)
  select count(*)::int into total_cnt
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  where gp.profile_id = target_profile_id
    and (filter_opponent_id is null or exists(
      select 1 from public.game_participants as ogp
      where ogp.game_id = g.id and ogp.profile_id = filter_opponent_id
    ));

  -- Fetch page_limit + 1 rows to detect whether a next page exists
  select coalesce(jsonb_agg(row_data order by row_fa desc, row_id desc), '[]'::jsonb)
  into raw_items
  from (
    select
      coalesce(g.finished_at, g.created_at) as row_fa,
      g.id                                   as row_id,
      jsonb_build_object(
        'id',             g.id,
        'gameId',         g.id,
        'finishedAt',     coalesce(g.finished_at, g.created_at),
        'createdAt',      g.created_at,
        'groupId',        g.group_id,
        'groupName',      g.group_name_snapshot,
        'playerCount',    ga.player_count,
        'isWinner',       gp.is_winner,
        'prestige',       gp.total_prestige,
        'score',          gp.score,
        'prestigeSpread', ga.prestige_spread,
        'winnerName',     ga.winner_name,
        'winnerId',       g.winner_profile_id,
        'assists',        gp.assists,
        'failures',       gp.failures,
        'contracts',      gp.contracts,
        'players',        ga.players
      ) as row_data
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    join public.profiles as wp on wp.id = g.winner_profile_id
    join lateral (
      select
        count(*)::int as player_count,
        (max(a.total_prestige) - min(a.total_prestige))::int as prestige_spread,
        coalesce(nullif(wp.display_name, ''), wp.player_name, 'Unknown') as winner_name,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'id',                   a.profile_id,
            'profileId',            a.profile_id,
            'name',                 coalesce(nullif(a.display_name_snapshot, ''), a.player_name_snapshot, 'Player'),
            'color',                a.color_snapshot,
            'assignedCardArtIndex', a.assigned_card_art_index_snapshot,
            'startOrder',           a.start_order,
            'isWinner',             a.is_winner,
            'totalPrestige',        a.total_prestige
          ) order by a.start_order asc
        ), '[]'::jsonb) as players
      from public.game_participants as a
      where a.game_id = g.id
    ) as ga on true
    where gp.profile_id = target_profile_id
      and (filter_opponent_id is null or exists(
        select 1 from public.game_participants as ogp
        where ogp.game_id = g.id and ogp.profile_id = filter_opponent_id
      ))
      -- Cursor: items strictly older than the previous page's last item
      and (before_finished_at is null or (
        coalesce(g.finished_at, g.created_at) < before_finished_at
        or (coalesce(g.finished_at, g.created_at) = before_finished_at and g.id < before_game_id)
      ))
    order by coalesce(g.finished_at, g.created_at) desc, g.id desc
    limit page_limit + 1
  ) as rows;

  -- Determine if there's a next page; trim the sentinel item
  has_more := jsonb_array_length(raw_items) > page_limit;
  if has_more then
    items := raw_items #- ARRAY[page_limit::text];
  else
    items := raw_items;
  end if;

  -- Build cursor from the last returned item
  if has_more and jsonb_array_length(items) > 0 then
    last_item := items -> (jsonb_array_length(items) - 1);
    last_at   := (last_item->>'finishedAt')::timestamptz;
    last_id   := (last_item->>'id')::uuid;
  end if;

  return jsonb_build_object(
    'items',      items,
    'totalCount', total_cnt,
    'hasMore',    has_more,
    'nextCursor', case when has_more
      then jsonb_build_object('finishedAt', last_at, 'gameId', last_id)
      else null end
  );
end;
$$;
;
