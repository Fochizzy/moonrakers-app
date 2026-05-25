
-- get_stats_screen: return rollup directly when comprehensive (playstyle.label presence
-- indicates admin_refresh_analytics has populated all sections). Live computation is now
-- a fallback-only path for old/missing rollups.
create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  target_profile_id uuid := profile_id;
  rollup_payload jsonb;
  response_payload jsonb;
  finished_game_count integer := 0;
  win_count integer := 0;
  avg_total_prestige numeric := 0;
  avg_direct_prestige numeric := 0;
  avg_assists numeric := 0;
  avg_table_size numeric := 0;
  best_prestige numeric := 0;
  total_tracked_prestige numeric := 0;
  avg_objective_share numeric := 0;
  avg_assist_share numeric := 0;
  contract_conversion numeric := 0;
  corr_direct numeric := 0;
  corr_assists numeric := 0;
  corr_objectives numeric := 0;
  corr_failures numeric := 0;
  latest_game_date text := null;
  latest_result text := null;
  playstyle_label text := 'Direct-driven';
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  if rollup_payload is not null and rollup_payload ? 'statsScreen' then
    response_payload := rollup_payload->'statsScreen';
    -- Early return: admin_refresh_analytics sets playstyle.label once all sections are
    -- fully computed (playerCountSplit, halftimeProfile, consistencyProfile, etc.).
    -- An empty/missing label means an old pre-migration rollup; fall through to live queries.
    if coalesce(response_payload->'playstyle'->>'label', '') != '' then
      return response_payload;
    end if;
  else
    response_payload := jsonb_build_object(
      'generatedAt', now(),
      'overview', jsonb_build_object(
        'hero', jsonb_build_object('title','Stats overview','takeaway','No stats rollup is available yet.','games',0,'players',0),
        'cards', '[]'::jsonb,
        'topSignals', '[]'::jsonb),
      'players', jsonb_build_object(
        'options', jsonb_build_array(jsonb_build_object('id',target_profile_id,'label','Current player','playerName',null,'displayName',null)),
        'selectedPlayerId', target_profile_id,
        'detail', jsonb_build_object('playerId',target_profile_id,'label','Current player','summary','No player detail is available yet.','stats',jsonb_build_object('games',0,'playerRows',0))),
      'playstyle', jsonb_build_object('summary','No playstyle data is available yet.','highlights','[]'::jsonb),
      'correlations', jsonb_build_object('summary','No correlations are available yet.','items','[]'::jsonb,'selectedKey',null),
      'games', jsonb_build_object('items','[]'::jsonb,'selectedGameId',null,'detail',null));
  end if;

  -- Live fallback (only reached for rollups that predate the playstyle.label field)
  with table_sizes as (
    select game_id, count(*)::numeric as player_count from public.game_participants group by game_id
  ),
  player_games as (
    select gp.game_id, gp.total_prestige, gp.direct_prestige, gp.assist_prestige_received,
      gp.objective_prestige, gp.assists, gp.failures, gp.contracts, gp.is_winner,
      coalesce(table_sizes.player_count,0) as player_count
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id
    left join table_sizes on table_sizes.game_id = gp.game_id
    where gp.profile_id = target_profile_id and g.status = 'finished'
  )
  select count(*)::int,
    coalesce(sum(case when is_winner then 1 else 0 end),0)::int,
    coalesce(avg(total_prestige),0), coalesce(avg(direct_prestige),0),
    coalesce(avg(assists),0), coalesce(avg(player_count),0),
    coalesce(max(total_prestige),0), coalesce(sum(total_prestige),0),
    coalesce(avg(case when total_prestige>0 then objective_prestige/total_prestige else 0 end),0),
    coalesce(avg(case when total_prestige>0 then assist_prestige_received/total_prestige else 0 end),0),
    coalesce(sum(contracts)::numeric/nullif(sum(contracts+failures),0),0),
    coalesce(corr(direct_prestige::float,     case when is_winner then 1::float else 0::float end)::numeric,0),
    coalesce(corr(assists::float,             case when is_winner then 1::float else 0::float end)::numeric,0),
    coalesce(corr(objective_prestige::float,  case when is_winner then 1::float else 0::float end)::numeric,0),
    coalesce(corr(failures::float,            case when is_winner then 1::float else 0::float end)::numeric,0)
  into finished_game_count, win_count, avg_total_prestige, avg_direct_prestige,
    avg_assists, avg_table_size, best_prestige, total_tracked_prestige,
    avg_objective_share, avg_assist_share, contract_conversion,
    corr_direct, corr_assists, corr_objectives, corr_failures
  from player_games;

  select to_char(coalesce(g.finished_at,g.created_at) at time zone 'UTC','YYYY-MM-DD'),
    case when gp.is_winner then 'Won latest tracked game' else 'Finished latest tracked game' end
  into latest_game_date, latest_result
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id
  where gp.profile_id = target_profile_id and g.status = 'finished'
  order by coalesce(g.finished_at,g.created_at) desc, g.created_at desc
  limit 1;

  if finished_game_count > 0 then
    playstyle_label := case
      when avg_assist_share  >= 0.33 then 'Support-leaning'
      when avg_objective_share >= 0.20 then 'Objective-heavy'
      when contract_conversion >= 0.62 then 'Conversion-first'
      else 'Direct-driven'
    end;

    response_payload := jsonb_set(response_payload,'{players,detail}',jsonb_build_object(
      'playerId', target_profile_id,
      'label', coalesce(response_payload #>> '{players,detail,label}','Current player'),
      'summary', format('Server-authored player detail across %s finished game%s.',finished_game_count,case when finished_game_count=1 then '' else 's' end),
      'stats', jsonb_build_object('games',finished_game_count,'wins',win_count,'winRate',concat(round((win_count::numeric/finished_game_count)*100),'%'),'avgPrestige',round(avg_total_prestige,1),'contractConversion',concat(round(contract_conversion*100),'%'))),true);

    response_payload := jsonb_set(response_payload,'{playstyle}',jsonb_build_object(
      'label', playstyle_label,
      'summary', format('%s profile across %s finished game%s.',playstyle_label,finished_game_count,case when finished_game_count=1 then '' else 's' end),
      'highlights', jsonb_build_array(
        jsonb_build_object('key','win-rate','label','Win rate','value',concat(round((win_count::numeric/finished_game_count)*100),'%')),
        jsonb_build_object('key','direct-prestige-per-game','label','Direct prestige / game','value',round(avg_direct_prestige,1)),
        jsonb_build_object('key','assists-per-game','label','Assists / game','value',round(avg_assists,1)),
        jsonb_build_object('key','objective-share','label','Objective share','value',concat(round(avg_objective_share*100),'%')))),true);

    response_payload := jsonb_set(response_payload,'{games}',jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('key','latest-finish','label','Latest tracked game','value',case when latest_game_date is null then 'Tracked game recorded' else latest_result||' on '||latest_game_date end),
        jsonb_build_object('key','wins','label','Wins','value',concat(win_count,' / ',finished_game_count)),
        jsonb_build_object('key','avg-table-size','label','Average table size','value',round(avg_table_size,1)),
        jsonb_build_object('key','best-prestige','label','Best prestige','value',round(best_prestige,1))),
      'selectedGameId', null,
      'detail', jsonb_build_object('latestGameDate',latest_game_date,'latestResult',latest_result,'trackedPrestige',round(total_tracked_prestige,1))),true);
  end if;

  if finished_game_count >= 2 then
    response_payload := jsonb_set(response_payload,'{correlations}',jsonb_build_object(
      'summary','Outcome signals derived from your finished Supabase participant rows.',
      'items', jsonb_build_array(
        jsonb_build_object('key','direct-prestige-vs-wins','label','Direct prestige vs wins','value',round(corr_direct,2),'strength',case when abs(corr_direct)>=0.5 then 'Strong' when abs(corr_direct)>=0.25 then 'Moderate' else 'Light' end),
        jsonb_build_object('key','assists-vs-wins','label','Assist volume vs wins','value',round(corr_assists,2),'strength',case when abs(corr_assists)>=0.5 then 'Strong' when abs(corr_assists)>=0.25 then 'Moderate' else 'Light' end),
        jsonb_build_object('key','objective-prestige-vs-wins','label','Objective prestige vs wins','value',round(corr_objectives,2),'strength',case when abs(corr_objectives)>=0.5 then 'Strong' when abs(corr_objectives)>=0.25 then 'Moderate' else 'Light' end),
        jsonb_build_object('key','failures-vs-wins','label','Failures vs wins','value',round(corr_failures,2),'strength',case when abs(corr_failures)>=0.5 then 'Strong' when abs(corr_failures)>=0.25 then 'Moderate' else 'Light' end)),
      'selectedKey', null),true);
  end if;

  return response_payload;
end;
$$;


-- get_insights_screen: add winLoseSplit key to the correlations object so clients
-- can read the rollup's avg-when-win / avg-when-lose data alongside the live-computed
-- Pearson correlations, pairing stats, and synergy pairs.
create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
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
  macro_assists_over_five_behind numeric := 0;
  macro_assist_prestige_gained numeric := 0;
  personal_assist_target_gap numeric := 0;
  personal_assist_leader_gap numeric := 0;
  personal_assists_at_six_plus numeric := 0;
  personal_assists_over_five_behind numeric := 0;
  personal_assist_prestige_gained numeric := 0;
begin
  if viewer_profile_id is null then
    raise exception 'authenticated profile is required';
  end if;

  if target_profile_id <> viewer_profile_id then
    select exists (
      select 1 from public.games as g
      where g.status = 'finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id)
    ) into can_view_network_profile;
    if not can_view_network_profile then
      raise exception 'profile_id must match the authenticated profile or a shared network player';
    end if;
  end if;

  response_payload := jsonb_build_object(
    'generatedAt', now(),
    'meta', jsonb_build_object('games',0,'playerRows',0),
    'topSignals', '[]'::jsonb,
    'assistNetwork', jsonb_build_object('nodes','[]'::jsonb,'edges','[]'::jsonb),
    'correlations', jsonb_build_object('summary','No insight correlations are available yet.','personal','[]'::jsonb,'pairing','[]'::jsonb,'macro','[]'::jsonb,'synergyPairs','[]'::jsonb,'players','[]'::jsonb,'items','[]'::jsonb,'selectedKey',null));

  if target_profile_id = viewer_profile_id then
    select rollup.payload into rollup_payload
    from public.personal_stats_rollups as rollup
    where rollup.profile_id = target_profile_id;
    if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
      response_payload := rollup_payload->'insightsScreen';
    end if;
  end if;

  with target_games as (
    select g.id as game_id, coalesce(g.finished_at,g.created_at) as event_at
    from public.games as g
    where g.status='finished'
      and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
      and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
  )
  select count(*)::int,
    coalesce((select count(*) from public.game_participants as gp join target_games on target_games.game_id=gp.game_id where gp.profile_id=target_profile_id),0)::int
  into finished_game_count, player_row_count
  from target_games;

  with target_games as (
    select g.id as game_id, coalesce(g.finished_at,g.created_at) as event_at
    from public.games as g
    where g.status='finished'
      and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
      and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
  ),
  network_players as (
    select distinct on (gp.profile_id) gp.profile_id,
      coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,''),'Unknown Player') as label,
      nullif(gp.display_name_snapshot,'') as display_name, nullif(gp.player_name_snapshot,'') as player_name
    from target_games join public.game_participants as gp on gp.game_id=target_games.game_id
    where gp.profile_id is not null
    order by gp.profile_id, target_games.event_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',network_players.profile_id,'label',network_players.label,'displayName',network_players.display_name,'playerName',network_players.player_name) order by network_players.label),'[]'::jsonb)
  into player_options from network_players;

  if finished_game_count >= 2 then
    with target_games as (
      select g.id as game_id,
        exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id and gp.is_winner) as target_won
      from public.games as g
      where g.status='finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
    ),
    network_players as (
      select distinct on (gp.profile_id) gp.profile_id,
        coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,''),'Unknown Player') as label
      from public.game_participants as gp
      join target_games on target_games.game_id=gp.game_id
      where gp.profile_id is not null and gp.profile_id<>target_profile_id
      order by gp.profile_id, label
    ),
    pairing_metrics as (
      select network_players.profile_id, network_players.label,
        count(*) filter (where paired.profile_id is not null) as games_together,
        coalesce(corr(case when paired.profile_id is null then 0::double precision else 1::double precision end, case when target_games.target_won then 1::double precision else 0::double precision end)::numeric,0) as corr_value
      from network_players cross join target_games
      left join public.game_participants as paired on paired.game_id=target_games.game_id and paired.profile_id=network_players.profile_id
      group by network_players.profile_id, network_players.label
    ),
    ranked_pairings as (
      select pairing_metrics.label, round(pairing_metrics.corr_value,2) as corr_value, pairing_metrics.games_together
      from pairing_metrics where pairing_metrics.games_together>=2
      order by abs(pairing_metrics.corr_value) desc, pairing_metrics.games_together desc, pairing_metrics.label limit 6
    )
    select coalesce(jsonb_agg(jsonb_build_object('label',format('With %s vs win rate',ranked_pairings.label),'value',ranked_pairings.corr_value,'strength',case when abs(ranked_pairings.corr_value)>=0.5 then 'Strong' when abs(ranked_pairings.corr_value)>=0.25 then 'Moderate' else 'Light' end) order by abs(ranked_pairings.corr_value) desc, ranked_pairings.games_together desc, ranked_pairings.label),'[]'::jsonb)
    into pairing_payload from ranked_pairings;

    with target_games as (
      select g.id as game_id from public.games as g
      where g.status='finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
    ),
    round_one_leaders as (
      select gr.game_id, gp.profile_id,
        case when gr.prestige=max(gr.prestige) over (partition by gr.game_id) and gr.prestige>0 then 1 else 0 end as early_lead
      from public.game_rounds as gr
      join public.game_participants as gp on gp.id=gr.participant_id
      join target_games on target_games.game_id=gr.game_id
      where gr.round_index=0 and gp.profile_id is not null
    ),
    player_samples as (
      select gp.contracts, gp.failures, gp.assists, gp.assist_prestige_received, gp.is_winner,
        coalesce(round_one_leaders.early_lead,0) as early_lead
      from public.game_participants as gp
      join target_games on target_games.game_id=gp.game_id
      left join round_one_leaders on round_one_leaders.game_id=gp.game_id and round_one_leaders.profile_id=gp.profile_id
      where gp.profile_id is not null
    )
    select
      coalesce(corr(player_samples.contracts::double precision/greatest(player_samples.failures,1)::double precision,case when player_samples.is_winner then 1::double precision else 0::double precision end)::numeric,0),
      coalesce(corr(player_samples.assists::double precision,case when player_samples.is_winner then 1::double precision else 0::double precision end)::numeric,0),
      coalesce(corr(player_samples.assist_prestige_received::double precision,case when player_samples.is_winner then 1::double precision else 0::double precision end)::numeric,0),
      coalesce(corr(player_samples.early_lead::double precision,case when player_samples.is_winner then 1::double precision else 0::double precision end)::numeric,0)
    into macro_contract_ratio, macro_assists_given, macro_assists_received, macro_early_lead
    from player_samples;

    with target_games as (
      select g.id as game_id from public.games as g
      where g.status='finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
    ),
    tracked_rounds as (
      select gr.game_id, gr.round_index, gp.profile_id as target_player_id,
        coalesce(gr.prestige,0)::numeric as round_prestige,
        gr.assist_recipients, gr.assist_prestige_recipients
      from public.game_rounds as gr
      join public.game_participants as gp on gp.id=gr.participant_id
      join target_games on target_games.game_id=gr.game_id
      where gp.profile_id is not null
    ),
    tracked_games_with_rounds as (select distinct tracked_rounds.game_id from tracked_rounds),
    game_profiles as (
      select gp.game_id, gp.profile_id from public.game_participants as gp
      join tracked_games_with_rounds on tracked_games_with_rounds.game_id=gp.game_id
      where gp.profile_id is not null
    ),
    round_prestige_deltas as (
      select tracked_rounds.game_id, tracked_rounds.round_index, tracked_rounds.target_player_id as profile_id, tracked_rounds.round_prestige as prestige_delta from tracked_rounds
      union all
      select tracked_rounds.game_id, tracked_rounds.round_index, helper_profile.profile_id,
        greatest(coalesce(nullif(helper_edge.value,'')::numeric,0),0)::numeric as prestige_delta
      from tracked_rounds
      join lateral jsonb_each_text(tracked_rounds.assist_prestige_recipients) as helper_edge(key,value) on true
      join game_profiles as helper_profile on helper_profile.game_id=tracked_rounds.game_id and helper_profile.profile_id::text=btrim(helper_edge.key)
      where btrim(helper_edge.key)<>''
    ),
    prestige_before_round as (
      select tracked_rounds.game_id, tracked_rounds.round_index, game_profiles.profile_id,
        coalesce(sum(previous_deltas.prestige_delta),0)::numeric as prestige_before_round
      from tracked_rounds join game_profiles on game_profiles.game_id=tracked_rounds.game_id
      left join round_prestige_deltas as previous_deltas on previous_deltas.game_id=tracked_rounds.game_id and previous_deltas.profile_id=game_profiles.profile_id and previous_deltas.round_index<tracked_rounds.round_index
      group by tracked_rounds.game_id, tracked_rounds.round_index, game_profiles.profile_id
    ),
    leader_state as (
      select prestige_before_round.game_id, prestige_before_round.round_index, max(prestige_before_round.prestige_before_round) as leader_prestige
      from prestige_before_round group by prestige_before_round.game_id, prestige_before_round.round_index
    ),
    assist_events as (
      select tracked_rounds.game_id, helper_profile.profile_id as player_id, tracked_rounds.target_player_id,
        abs(helper_state.prestige_before_round-target_state.prestige_before_round)::numeric as gap_to_target,
        (leader_state.leader_prestige-helper_state.prestige_before_round)::numeric as gap_to_leader,
        case when helper_state.prestige_before_round>=6 then 1 else 0 end as assist_at_six_plus,
        case when (leader_state.leader_prestige-helper_state.prestige_before_round)>5 then 1 else 0 end as assist_over_five_behind,
        (greatest(coalesce(nullif(tracked_rounds.assist_prestige_recipients->>helper_edge.key,'')::numeric,0),0)/greatest((helper_edge.value)::numeric,1))::numeric as assist_prestige_gained
      from tracked_rounds
      join prestige_before_round as target_state on target_state.game_id=tracked_rounds.game_id and target_state.round_index=tracked_rounds.round_index and target_state.profile_id=tracked_rounds.target_player_id
      join leader_state on leader_state.game_id=tracked_rounds.game_id and leader_state.round_index=tracked_rounds.round_index
      join lateral jsonb_each_text(tracked_rounds.assist_recipients) as helper_edge(key,value) on true
      join game_profiles as helper_profile on helper_profile.game_id=tracked_rounds.game_id and helper_profile.profile_id::text=btrim(helper_edge.key)
      join prestige_before_round as helper_state on helper_state.game_id=tracked_rounds.game_id and helper_state.round_index=tracked_rounds.round_index and helper_state.profile_id=helper_profile.profile_id
      join lateral generate_series(1,greatest((helper_edge.value)::int,0)) as repeated(idx) on true
      where btrim(helper_edge.key)<>'' and (helper_edge.value)::int>0
    ),
    assist_context_samples as (
      select game_profiles.game_id, game_profiles.profile_id,
        count(assist_events.player_id)::int as assist_count,
        case when count(assist_events.player_id)>0 then avg(assist_events.gap_to_target)::numeric else null end as avg_gap_to_target,
        case when count(assist_events.player_id)>0 then avg(assist_events.gap_to_leader)::numeric else null end as avg_gap_to_leader,
        coalesce(sum(assist_events.assist_at_six_plus),0)::int as assists_at_six_plus,
        coalesce(sum(assist_events.assist_over_five_behind),0)::int as assists_over_five_behind,
        coalesce(sum(assist_events.assist_prestige_gained),0)::numeric as assist_prestige_gained,
        case when winner_rows.profile_id=game_profiles.profile_id then 1::double precision else 0::double precision end as victory
      from game_profiles
      left join assist_events on assist_events.game_id=game_profiles.game_id and assist_events.player_id=game_profiles.profile_id
      left join public.game_participants as winner_rows on winner_rows.game_id=game_profiles.game_id and winner_rows.is_winner
      group by game_profiles.game_id, game_profiles.profile_id, winner_rows.profile_id
    )
    select
      coalesce((select corr(assist_context_samples.avg_gap_to_target::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.avg_gap_to_target is not null)::numeric,0),
      coalesce((select corr(assist_context_samples.avg_gap_to_leader::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.avg_gap_to_leader is not null)::numeric,0),
      coalesce((select corr(assist_context_samples.assists_at_six_plus::double precision,assist_context_samples.victory) from assist_context_samples)::numeric,0),
      coalesce((select corr(assist_context_samples.avg_gap_to_target::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.profile_id=target_profile_id and assist_context_samples.avg_gap_to_target is not null)::numeric,0),
      coalesce((select corr(assist_context_samples.avg_gap_to_leader::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.profile_id=target_profile_id and assist_context_samples.avg_gap_to_leader is not null)::numeric,0),
      coalesce((select corr(assist_context_samples.assists_at_six_plus::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.profile_id=target_profile_id)::numeric,0),
      coalesce((select corr(assist_context_samples.assists_over_five_behind::double precision,assist_context_samples.victory) from assist_context_samples)::numeric,0),
      coalesce((select corr(assist_context_samples.assist_prestige_gained::double precision,assist_context_samples.victory) from assist_context_samples)::numeric,0),
      coalesce((select corr(assist_context_samples.assists_over_five_behind::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.profile_id=target_profile_id)::numeric,0),
      coalesce((select corr(assist_context_samples.assist_prestige_gained::double precision,assist_context_samples.victory) from assist_context_samples where assist_context_samples.profile_id=target_profile_id)::numeric,0)
    into macro_assist_target_gap,macro_assist_leader_gap,macro_assists_at_six_plus,macro_assists_over_five_behind,macro_assist_prestige_gained,
      personal_assist_target_gap,personal_assist_leader_gap,personal_assists_at_six_plus,personal_assists_over_five_behind,personal_assist_prestige_gained;

    personal_payload := jsonb_build_array(
      jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(personal_assist_target_gap,2),'strength',case when abs(personal_assist_target_gap)>=0.5 then 'Strong' when abs(personal_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(personal_assist_leader_gap,2),'strength',case when abs(personal_assist_leader_gap)>=0.5 then 'Strong' when abs(personal_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(personal_assists_at_six_plus,2),'strength',case when abs(personal_assists_at_six_plus)>=0.5 then 'Strong' when abs(personal_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(personal_assists_over_five_behind,2),'strength',case when abs(personal_assists_over_five_behind)>=0.5 then 'Strong' when abs(personal_assists_over_five_behind)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(personal_assist_prestige_gained,2),'strength',case when abs(personal_assist_prestige_gained)>=0.5 then 'Strong' when abs(personal_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));

    macro_payload := jsonb_build_array(
      jsonb_build_object('label','Contracts / Failures Ratio vs Win Rate','value',round(macro_contract_ratio,2),'strength',case when abs(macro_contract_ratio)>=0.5 then 'Strong' when abs(macro_contract_ratio)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Given vs Win Rate','value',round(macro_assists_given,2),'strength',case when abs(macro_assists_given)>=0.5 then 'Strong' when abs(macro_assists_given)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Received vs Win Rate','value',round(macro_assists_received,2),'strength',case when abs(macro_assists_received)>=0.5 then 'Strong' when abs(macro_assists_received)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Early Lead vs Final Win','value',round(macro_early_lead,2),'strength',case when abs(macro_early_lead)>=0.5 then 'Strong' when abs(macro_early_lead)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(macro_assist_target_gap,2),'strength',case when abs(macro_assist_target_gap)>=0.5 then 'Strong' when abs(macro_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(macro_assist_leader_gap,2),'strength',case when abs(macro_assist_leader_gap)>=0.5 then 'Strong' when abs(macro_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(macro_assists_at_six_plus,2),'strength',case when abs(macro_assists_at_six_plus)>=0.5 then 'Strong' when abs(macro_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(macro_assists_over_five_behind,2),'strength',case when abs(macro_assists_over_five_behind)>=0.5 then 'Strong' when abs(macro_assists_over_five_behind)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(macro_assist_prestige_gained,2),'strength',case when abs(macro_assist_prestige_gained)>=0.5 then 'Strong' when abs(macro_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));

    with target_games as (
      select g.id as game_id from public.games as g
      where g.status='finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and (target_profile_id=viewer_profile_id or exists (select 1 from public.game_participants as viewer_gp where viewer_gp.game_id=g.id and viewer_gp.profile_id=viewer_profile_id))
    ),
    pair_games as (
      select
        case when left_gp.profile_id::text<right_gp.profile_id::text then left_gp.profile_id::text else right_gp.profile_id::text end as a,
        case when left_gp.profile_id::text<right_gp.profile_id::text then right_gp.profile_id::text else left_gp.profile_id::text end as b,
        left_gp.game_id,
        case when winner_gp.profile_id in (left_gp.profile_id,right_gp.profile_id) then 1 else 0 end as pair_won
      from public.game_participants as left_gp
      join public.game_participants as right_gp on right_gp.game_id=left_gp.game_id and left_gp.profile_id is not null and right_gp.profile_id is not null and left_gp.profile_id::text<right_gp.profile_id::text
      join target_games on target_games.game_id=left_gp.game_id
      left join public.game_participants as winner_gp on winner_gp.game_id=left_gp.game_id and winner_gp.is_winner
    ),
    pair_rollup as (
      select pair_games.a, pair_games.b, count(*)::int as games_together, coalesce(sum(pair_games.pair_won),0)::int as wins_together
      from pair_games group by pair_games.a, pair_games.b
    ),
    assist_edges as (
      select
        case when source.profile_id::text<recipient.profile_id::text then source.profile_id::text else recipient.profile_id::text end as a,
        case when source.profile_id::text<recipient.profile_id::text then recipient.profile_id::text else source.profile_id::text end as b,
        sum(case when source.profile_id::text<recipient.profile_id::text then coalesce((edge.value)::numeric,0) else 0 end) as assist_ab,
        sum(case when source.profile_id::text<recipient.profile_id::text then 0 else coalesce((edge.value)::numeric,0) end) as assist_ba
      from public.game_rounds as gr
      join target_games on target_games.game_id=gr.game_id
      join public.game_participants as source on source.id=gr.participant_id
      join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key,value) on true
      join public.game_participants as recipient on recipient.game_id=gr.game_id and recipient.profile_id=nullif(edge.key,'')::uuid
      where source.profile_id is not null and recipient.profile_id is not null and source.profile_id<>recipient.profile_id
      group by 1,2
    ),
    synergy_metrics as (
      select pair_rollup.a, pair_rollup.b, pair_rollup.games_together, pair_rollup.wins_together,
        coalesce(assist_edges.assist_ab,0) as assist_ab, coalesce(assist_edges.assist_ba,0) as assist_ba,
        coalesce(assist_edges.assist_ab,0)+coalesce(assist_edges.assist_ba,0) as total_assist,
        case when pair_rollup.games_together>0 then pair_rollup.wins_together::numeric/pair_rollup.games_together else 0 end as win_rate
      from pair_rollup left join assist_edges on assist_edges.a=pair_rollup.a and assist_edges.b=pair_rollup.b
      where pair_rollup.games_together>=2
    ),
    ranked_synergy as (
      select synergy_metrics.a, synergy_metrics.b,
        round((synergy_metrics.total_assist*0.6+synergy_metrics.win_rate*20+case when synergy_metrics.total_assist>0 then (1-abs(synergy_metrics.assist_ab-synergy_metrics.assist_ba)/synergy_metrics.total_assist)*10 else 0 end+synergy_metrics.games_together*0.5),2) as synergy_score,
        synergy_metrics.games_together
      from synergy_metrics
      order by synergy_score desc, synergy_metrics.games_together desc, synergy_metrics.a, synergy_metrics.b limit 5
    )
    select coalesce(jsonb_agg(jsonb_build_object('a',ranked_synergy.a,'b',ranked_synergy.b,'score',ranked_synergy.synergy_score) order by ranked_synergy.synergy_score desc, ranked_synergy.games_together desc, ranked_synergy.a, ranked_synergy.b),'[]'::jsonb)
    into synergy_payload from ranked_synergy;
  end if;

  response_payload := jsonb_set(response_payload,'{meta,games}',to_jsonb(finished_game_count),true);
  response_payload := jsonb_set(response_payload,'{meta,playerRows}',to_jsonb(player_row_count),true);
  response_payload := jsonb_set(response_payload,'{correlations}',
    jsonb_build_object(
      'summary', case when target_profile_id=viewer_profile_id then 'Outcome signals derived from your finished Supabase games.' else 'Outcome signals derived from finished shared Supabase games.' end,
      'personal', personal_payload,
      'pairing', pairing_payload,
      'macro', macro_payload,
      'synergyPairs', synergy_payload,
      'players', player_options,
      'items', macro_payload,
      'selectedKey', target_profile_id::text,
      -- #5: expose rollup win/loss split alongside live Pearson correlations and pairing data.
      -- Clients can read correlations.winLoseSplit for the avg-when-win / avg-when-lose stats.
      'winLoseSplit', case
        when target_profile_id = viewer_profile_id
          then coalesce(rollup_payload->'insightsScreen'->'correlations'->'items', '[]'::jsonb)
        else '[]'::jsonb
      end),true);

  return response_payload;
end;
$$;
;
