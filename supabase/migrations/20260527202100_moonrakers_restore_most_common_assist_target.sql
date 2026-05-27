-- Restores the server-authored mostCommonAssistTarget summary by deriving it
-- from exact timed assist events in tracked round payloads.

create or replace function private.build_most_common_assist_target_summary(
  target_profile_id uuid,
  filtered_opponent_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with relevant_games as (
    select g.id as game_id
    from public.games as g
    join public.game_participants as self_gp
      on self_gp.game_id = g.id
     and self_gp.profile_id = target_profile_id
    where g.status = 'finished'
      and (
        filtered_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = filtered_opponent_id
        )
      )
  ),
  tracked_rounds as (
    select
      gr.game_id,
      coalesce(gr.assist_recipients, '{}'::jsonb) as assist_recipients
    from public.game_rounds as gr
    join public.game_participants as gp on gp.id = gr.participant_id
    join relevant_games as rg on rg.game_id = gr.game_id
    where gp.profile_id = target_profile_id
  ),
  assist_events as (
    select
      tr.game_id,
      rec_gp.profile_id as target_player_id
    from tracked_rounds as tr
    join lateral jsonb_each_text(tr.assist_recipients) as edge(key, value) on true
    join lateral generate_series(1, greatest(edge.value::int, 0)) as rep(idx) on true
    join public.game_participants as rec_gp
      on rec_gp.game_id = tr.game_id
     and rec_gp.profile_id is not null
     and rec_gp.profile_id::text = btrim(edge.key)
    where btrim(edge.key) <> ''
      and greatest(edge.value::int, 0) > 0
  )
  select (
    select jsonb_build_object(
      'playerId', ae.target_player_id,
      'playerName', coalesce(nullif(target_profile.display_name, ''), target_profile.player_name, 'Player'),
      'assistsSent', count(*)::int,
      'assistsSentLabel', count(*)::int::text,
      'sampleSize', count(distinct ae.game_id)::int,
      'sampleSizeLabel', format('%s games', count(distinct ae.game_id)::int)
    )
    from assist_events as ae
    join public.profiles as target_profile on target_profile.id = ae.target_player_id
    where target_profile.deleted_at is null
    group by ae.target_player_id, target_profile.display_name, target_profile.player_name
    having count(distinct ae.game_id) >= 3
    order by
      count(*)::int desc,
      count(distinct ae.game_id)::int desc,
      lower(coalesce(nullif(target_profile.display_name, ''), target_profile.player_name, 'Player')) asc
    limit 1
  );
$$;

create or replace function private.build_personal_rollup_moonrakers_intel(
  target_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base_payload jsonb := private.build_moonrakers_intel_payload(target_profile_id, null);
begin
  if base_payload is null or coalesce((base_payload->>'hasData')::boolean, false) = false then
    return base_payload;
  end if;

  return jsonb_set(
    base_payload,
    '{supportProfile,mostCommonAssistTarget}',
    coalesce(private.build_most_common_assist_target_summary(target_profile_id, null), 'null'::jsonb),
    true
  );
end;
$$;

create or replace function public.get_player_profile_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null
)
returns jsonb language plpgsql stable set search_path = 'public'
as $$
declare
  signed_in_profile_id uuid := profile_id;
  generated_at                 timestamptz := now();
  elo_payload                  jsonb := '{}'::jsonb;
  rollup_payload               jsonb;
  selected_player_id           uuid := null;
  selected_opponent_id         uuid := null;
  selected_summary             jsonb := null;
  selected_player_opt          jsonb := null;
  player_options               jsonb := '[]'::jsonb;
  signed_in_top_player_options jsonb := '[]'::jsonb;
  opponent_options             jsonb := '[]'::jsonb;
  top_opponent_options         jsonb := '[]'::jsonb;
  top_cards                    jsonb := '[]'::jsonb;
  tabs                         jsonb := '{}'::jsonb;
  tab_insights                 jsonb := '{}'::jsonb;
  profile_insight              jsonb := null;
  active_insight               jsonb := null;
  recent_games                 jsonb := '[]'::jsonb;
  hero                         jsonb := null;
  moonrakers_intel             jsonb := null;
  total_games                  integer := 0;
  total_wins                   integer := 0;
  win_rate                     numeric := 0;
  current_elo                  integer := 1000;
  peak_elo                     integer := 1000;
  player_name                  text    := 'Player';
  player_color                 text    := null;
  player_card_art_idx          integer := null;
  opponent_name                text    := null;
begin
  if profile_id is null or profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  elo_payload          := public.get_elo_screen(profile_id, focus_player_id, opponent_id, 'elo');
  selected_player_id   := nullif(elo_payload->>'selectedPlayerId','')::uuid;
  selected_opponent_id := nullif(elo_payload->>'selectedOpponentId','')::uuid;
  player_options       := coalesce(elo_payload->'playerOptions','[]'::jsonb);
  selected_summary     := elo_payload->'summary';
  top_cards            := coalesce(elo_payload->'topCards','[]'::jsonb);
  tabs                 := coalesce(elo_payload->'sections','{}'::jsonb);
  tab_insights         := coalesce(elo_payload->'insights','{}'::jsonb);

  select coalesce(jsonb_agg(entry order by ordinality),'[]'::jsonb)
  into signed_in_top_player_options
  from (
    select
      jsonb_build_object(
        'id',shared.opponent_id,'name',shared.opponent_name,'label',shared.opponent_name,
        'displayName',shared.opponent_display_name,'playerName',shared.opponent_player_name,
        'color',shared.favorite_color,'assignedCardArtIndex',shared.assigned_card_art_index,
        'gamesPlayed',shared.games_together,'currentElo',coalesce(nullif(shared.current_elo_text,'')::integer,1000)
      ) as entry,
      row_number() over (
        order by shared.games_together desc,lower(shared.opponent_name) asc,shared.opponent_id
      ) as ordinality
    from (
      select
        other_profile.id as opponent_id,
        coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player') as opponent_name,
        nullif(other_profile.display_name,'') as opponent_display_name,
        other_profile.player_name as opponent_player_name,
        other_profile.favorite_color,
        other_profile.assigned_card_art_index,
        count(distinct g.id)::int as games_together,
        max(player_option->>'currentElo') as current_elo_text
      from public.game_participants as viewer_gp
      join public.games as g on g.id=viewer_gp.game_id and g.status='finished'
      join public.game_participants as other_gp on other_gp.game_id=viewer_gp.game_id and other_gp.profile_id is not null and other_gp.profile_id<>viewer_gp.profile_id
      join public.profiles as other_profile on other_profile.id=other_gp.profile_id
      left join lateral jsonb_array_elements(player_options) as player_option on nullif(player_option->>'id','')::uuid=other_profile.id
      where viewer_gp.profile_id=signed_in_profile_id
      group by other_profile.id,other_profile.display_name,other_profile.player_name,other_profile.favorite_color,other_profile.assigned_card_art_index
      order by count(distinct g.id) desc,lower(coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player')) asc,other_profile.id
      limit 4
    ) as shared
  ) as ranked_entries;

  if selected_player_id is null then
    return jsonb_build_object(
      'generatedAt',generated_at,'selectedPlayerId',null,'selectedOpponentId',null,'playerOptions',player_options,'signedInTopPlayerOptions',signed_in_top_player_options,
      'hero',jsonb_build_object('id',null,'name','Player','color',null,'assignedCardArtIndex',null,'currentElo',1000,'peakElo',1000,'winRate',0,'totalWins',0,'totalGames',0),
      'quickActions',jsonb_build_object('compareLabel','Compare with...','chartsLabel','Open charts','recentGamesLabel','Recent games'),
      'topCards',top_cards,'activeInsight',null,
      'profileInsight',jsonb_build_object('title','No player selected','body','Choose a player from the shared analytics directory to load a full server-authored profile.'),
      'tabs',tabs,'tabInsights',tab_insights,
      'moonrakersIntel',jsonb_build_object('hasData',false,'emptyTitle','Not enough Moonrakers data yet','emptyBody','Finish or import a few more games to unlock player-specific playstyle reads.'),
      'opponentOptions','[]'::jsonb,'topOpponentOptions','[]'::jsonb,'recentGames','[]'::jsonb,
      'emptyState',jsonb_build_object('title','No player profile yet','description','The shared analytics payload does not currently expose a player profile for this account.')
    );
  end if;

  select entry into selected_player_opt from jsonb_array_elements(player_options) as entry
  where nullif(entry->>'id','')::uuid=selected_player_id limit 1;

  player_name         := coalesce(nullif(selected_summary->>'name',''),nullif(selected_player_opt->>'name',''),nullif(selected_player_opt->>'label',''),'Player');
  player_color        := nullif(selected_player_opt->>'color','');
  player_card_art_idx := nullif(selected_player_opt->>'assignedCardArtIndex','')::integer;
  current_elo         := coalesce(nullif(selected_summary->>'currentElo','')::integer,1000);
  peak_elo            := coalesce(nullif(selected_summary->>'peakElo','')::integer,current_elo);

  select psr.payload into rollup_payload
  from public.personal_stats_rollups as psr
  where psr.profile_id = selected_player_id;

  if rollup_payload is not null then
    moonrakers_intel := rollup_payload->'moonrakersIntel';
    if selected_opponent_id is null then
      total_games := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0);
      total_wins  := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'wins')::int,0);
      win_rate    := case when total_games > 0 then total_wins::numeric / total_games else 0 end;
    end if;
  end if;

  if selected_opponent_id is not null or rollup_payload is null or moonrakers_intel is null or coalesce((moonrakers_intel->>'hasData')::boolean,false)=false then
    select
      count(*)::int,
      count(*) filter (where gp.is_winner)::int,
      coalesce(count(*) filter (where gp.is_winner)::numeric / nullif(count(*)::numeric,0),0)::numeric
    into total_games, total_wins, win_rate
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id
    where gp.profile_id = selected_player_id
      and g.status='finished'
      and (
        selected_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = gp.game_id
            and ogp.profile_id = selected_opponent_id
        )
      );
  end if;

  if selected_opponent_id is not null then
    select coalesce(nullif(p.display_name,''),p.player_name,'Player')
    into opponent_name
    from public.profiles as p
    where p.id = selected_opponent_id
    limit 1;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ranked_games.id,'gameId',ranked_games.id,'createdAt',ranked_games.created_at,'finishedAt',ranked_games.finished_at,
    'winnerId',ranked_games.winner_profile_id,'groupId',ranked_games.group_id,'groupName',ranked_games.group_name_snapshot,
    'players',coalesce(ranked_games.players,'[]'::jsonb)
  ) order by ranked_games.sort_finished_at desc,ranked_games.id desc),'[]'::jsonb)
  into recent_games
  from (
    select
      g.id,
      g.created_at,
      g.finished_at,
      g.winner_profile_id,
      g.group_id,
      g.group_name_snapshot,
      pp.players,
      coalesce(g.finished_at,g.created_at) as sort_finished_at
    from public.games as g
    join public.game_participants as focus_gp on focus_gp.game_id=g.id and focus_gp.profile_id=selected_player_id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id',gp.profile_id,'profileId',gp.profile_id,
        'name',coalesce(nullif(gp.display_name_snapshot,''),gp.player_name_snapshot,'Player'),
        'color',gp.color_snapshot,'assignedCardArtIndex',gp.assigned_card_art_index_snapshot,
        'startOrder',gp.start_order,'isWinner',gp.is_winner,'totalPrestige',gp.total_prestige
      ) order by gp.start_order asc,gp.profile_id asc) as players
      from public.game_participants as gp
      where gp.game_id=g.id
    ) as pp on true
    where g.status='finished'
      and (
        selected_opponent_id is null or exists (
          select 1
          from public.game_participants as ogp
          where ogp.game_id = g.id
            and ogp.profile_id = selected_opponent_id
        )
      )
    order by coalesce(g.finished_at,g.created_at) desc,g.id desc
    limit 60
  ) as ranked_games;

  if selected_opponent_id is not null then
    moonrakers_intel := private.build_moonrakers_intel_payload(selected_player_id, selected_opponent_id);
  elsif moonrakers_intel is null or coalesce((moonrakers_intel->>'hasData')::boolean,false)=false then
    moonrakers_intel := private.build_moonrakers_intel_payload(selected_player_id, null);
  end if;

  if moonrakers_intel is not null and coalesce((moonrakers_intel->>'hasData')::boolean,false)=true then
    moonrakers_intel := jsonb_set(
      moonrakers_intel,
      '{supportProfile,mostCommonAssistTarget}',
      coalesce(private.build_most_common_assist_target_summary(selected_player_id, selected_opponent_id), 'null'::jsonb),
      true
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',shared.opponent_id,'name',shared.opponent_name,'label',shared.opponent_name,
    'displayName',shared.opponent_display_name,'playerName',shared.opponent_player_name,
    'color',shared.favorite_color,'assignedCardArtIndex',shared.assigned_card_art_index,
    'gamesPlayed',shared.games_together,'currentElo',coalesce(nullif(shared.current_elo_text,'')::integer,1000)
  ) order by shared.games_together desc,lower(shared.opponent_name) asc,shared.opponent_id),'[]'::jsonb)
  into opponent_options
  from (
    select
      other_profile.id as opponent_id,
      coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player') as opponent_name,
      nullif(other_profile.display_name,'') as opponent_display_name,
      other_profile.player_name as opponent_player_name,
      other_profile.favorite_color,
      other_profile.assigned_card_art_index,
      count(distinct g.id)::int as games_together,
      max(player_option->>'currentElo') as current_elo_text
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_participants as other_gp on other_gp.game_id=gp.game_id and other_gp.profile_id is not null and other_gp.profile_id<>gp.profile_id
    join public.profiles as other_profile on other_profile.id=other_gp.profile_id
    left join lateral jsonb_array_elements(player_options) as player_option on nullif(player_option->>'id','')::uuid=other_profile.id
    where gp.profile_id=selected_player_id
      and (
        selected_opponent_id is null
        or other_profile.id = selected_opponent_id
      )
    group by other_profile.id,other_profile.display_name,other_profile.player_name,other_profile.favorite_color,other_profile.assigned_card_art_index
  ) as shared;

  select coalesce(jsonb_agg(entry order by ordinality),'[]'::jsonb)
  into top_opponent_options
  from (
    select entry,ordinality
    from jsonb_array_elements(opponent_options) with ordinality as entry(entry,ordinality)
    order by coalesce(nullif(entry->>'gamesPlayed','')::integer,0) desc,lower(coalesce(entry->>'label',entry->>'name','player')) asc
    limit 4
  ) as top_entries;

  hero := jsonb_build_object(
    'id',selected_player_id,'name',player_name,'color',player_color,'assignedCardArtIndex',player_card_art_idx,
    'currentElo',current_elo,'peakElo',peak_elo,'winRate',win_rate,'totalWins',total_wins,'totalGames',total_games
  );

  profile_insight := jsonb_build_object(
    'title',case
      when total_games = 0 then 'Awaiting tracked results'
      when selected_opponent_id is not null and opponent_name is not null then format('Context against %s',opponent_name)
      when win_rate >= 0.6 then 'Winning profile'
      when win_rate <= 0.35 then 'Recovery window'
      else 'Balanced profile'
    end,
    'body',case
      when total_games = 0 then 'This player is in the shared directory, but there are no finished games in the published Moonrakers history yet.'
      when selected_opponent_id is not null and opponent_name is not null then format('%s has %s wins across %s shared games against %s in the published Supabase record.',player_name,total_wins,total_games,opponent_name)
      when win_rate >= 0.6 then format('%s is converting %s%% of finished games with a current ELO of %s.',player_name,round(win_rate * 100)::int,current_elo)
      when win_rate <= 0.35 then format('%s is below break-even right now, so the current profile is more about stabilizing form than protecting peak rating.',player_name)
      else format('%s is operating near the league middle, with enough history to compare momentum, context, and projection in one place.',player_name)
    end
  );

  active_insight := coalesce(
    tab_insights->'Leaderboard',
    jsonb_build_object(
      'title','Profile insight',
      'body',format('%s now has a full server-authored analytics profile.',player_name)
    )
  );

  return jsonb_build_object(
    'generatedAt',generated_at,'selectedPlayerId',selected_player_id,'selectedOpponentId',selected_opponent_id,
    'playerOptions',player_options,'signedInTopPlayerOptions',signed_in_top_player_options,'hero',hero,
    'quickActions',jsonb_build_object('compareLabel','Compare with...','chartsLabel','Open charts','recentGamesLabel','Recent games'),
    'topCards',top_cards,'activeInsight',active_insight,'profileInsight',profile_insight,
    'tabs',tabs,'tabInsights',tab_insights,'moonrakersIntel',moonrakers_intel,
    'opponentOptions',opponent_options,'topOpponentOptions',top_opponent_options,'recentGames',recent_games,
    'emptyState',case when total_games > 0 then null else jsonb_build_object('title','No player analytics yet','description','Track or import a few finished games so the full profile contract has live history to summarize.') end
  );
end;
$$;

do $$
declare
  profile_row record;
begin
  for profile_row in
    select public.profiles.id
    from public.profiles
    where public.profiles.deleted_at is null
    order by public.profiles.created_at asc, public.profiles.id asc
  loop
    perform private.admin_refresh_analytics(profile_row.id);
  end loop;
end;
$$;
