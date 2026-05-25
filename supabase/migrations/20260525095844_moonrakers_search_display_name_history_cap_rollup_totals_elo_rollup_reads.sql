
-- #3: search display_name too
create or replace function public.search_profiles_by_player_name(query text)
returns table(id uuid, player_name text, display_name text, favorite_color text, assigned_card_art_index integer)
language sql stable security definer set search_path = 'public'
as $$
  select profiles.id, profiles.player_name, profiles.display_name, profiles.favorite_color, profiles.assigned_card_art_index
  from public.profiles
  where profiles.deleted_at is null
    and length(trim(coalesce(query,''))) > 0
    and (profiles.player_name ilike trim(query)||'%' or profiles.display_name ilike trim(query)||'%')
  order by
    case when lower(profiles.player_name)=lower(trim(query)) then 0 when lower(profiles.display_name)=lower(trim(query)) then 0 else 1 end,
    profiles.player_name asc
  limit 10;
$$;


-- #4 + #5 prep: admin_refresh_analytics
-- Variable renamed to lifetime_prestige/lifetime_score to avoid clash with gp.total_prestige column
create or replace function private.admin_refresh_analytics(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_at timestamptz := now();
  registered_player_count integer := 0;
  player_row_count integer := 0;
  days_since_last_game integer := null;
  finished_game_count integer := 0;
  signal_win_count integer := 0;
  signal_avg_assists numeric := 0;
  signal_avg_failures numeric := 0;
  signal_contract_conversion numeric := 0;
  signal_win_rate numeric := 0;
  ps_avg_direct numeric := 0; ps_avg_assist_recv numeric := 0; ps_avg_objective numeric := 0;
  ps_avg_direct_win numeric := 0; ps_avg_assist_recv_win numeric := 0; ps_avg_objective_win numeric := 0;
  ps_avg_direct_lose numeric := 0; ps_avg_assist_recv_lose numeric := 0; ps_avg_objective_lose numeric := 0;
  ps_total numeric := 1;
  prestige_sources jsonb := '{}'::jsonb;
  corr_avg_obj_win numeric := 0; corr_avg_obj_lose numeric := 0;
  corr_avg_assists_win numeric := 0; corr_avg_assists_lose numeric := 0;
  corr_avg_failures_win numeric := 0; corr_avg_failures_lose numeric := 0;
  correlations_items jsonb := '[]'::jsonb;
  -- #5 prep: lifetime totals (distinct names to avoid column name clash)
  lifetime_score    numeric := 0;
  lifetime_prestige numeric := 0;
  -- round query
  pace_avg_first_half numeric := 0; pace_avg_second_half numeric := 0; pace_avg_late_delta numeric := 0;
  pace_avg_first_half_win numeric := 0; pace_avg_first_half_lose numeric := 0;
  rps_prestige_early numeric := 0; rps_prestige_mid numeric := 0; rps_prestige_late numeric := 0;
  rps_contracts_early numeric := 0; rps_contracts_mid numeric := 0; rps_contracts_late numeric := 0;
  rps_failures_early numeric := 0; rps_failures_mid numeric := 0; rps_failures_late numeric := 0;
  rps_objectives_early numeric := 0; rps_objectives_mid numeric := 0; rps_objectives_late numeric := 0;
  round_phase_stats jsonb := '{}'::jsonb;
  consistency_zero_pct numeric := 0; consistency_zero_pct_win numeric := 0; consistency_best_round numeric := 0;
  consistency_profile jsonb := '{}'::jsonb;
  top_signals jsonb := '[]'::jsonb;
  streak_longest_win integer := 0; streak_longest_loss integer := 0;
  streak_current_is_win boolean := false; streak_current_len integer := 0;
  head_to_head jsonb := '[]'::jsonb; position_stats jsonb := '[]'::jsonb;
  game_history jsonb := '[]'::jsonb;
  player_count_split jsonb := '[]'::jsonb;
  ht_total integer := 0; ht_lead_count integer := 0; ht_lead_win_count integer := 0; ht_trail_win_count integer := 0;
  halftime_profile jsonb := '{}'::jsonb;
  session_profile_items jsonb := '[]'::jsonb;
  session_early_wr numeric := 0; session_late_wr numeric := 0;
  session_tendency text := 'Consistent'; session_profile jsonb := '{}'::jsonb;
  playstyle_label text := 'Direct-driven'; playstyle_summary text := ''; playstyle_highlights jsonb := '[]'::jsonb;
  player_options jsonb := '[]'::jsonb; player_detail jsonb := '{}'::jsonb;
  analytics_payload jsonb;
  target_player_name text := null; target_display_name text := null;
begin
  select public.profiles.player_name, nullif(public.profiles.display_name,'')
  into target_player_name, target_display_name
  from public.profiles where public.profiles.id = target_profile_id;

  select count(*) into registered_player_count from public.profiles where deleted_at is null;

  select count(*) into player_row_count
  from public.game_participants where public.game_participants.profile_id = target_profile_id;

  select (extract(epoch from (now()-max(coalesce(g.finished_at,g.created_at))))/86400)::int
  into days_since_last_game
  from public.games as g join public.game_participants as gp on gp.game_id=g.id and gp.profile_id=target_profile_id
  where g.status='finished';

  -- Consolidated participant query + lifetime totals
  select
    count(distinct gp.game_id)::int,
    count(*) filter (where gp.is_winner)::int,
    coalesce(avg(gp.assists),0)::numeric, coalesce(avg(gp.failures),0)::numeric,
    coalesce(sum(gp.contracts)::numeric/nullif(sum(gp.contracts+gp.failures),0),0)::numeric,
    coalesce(round(avg(gp.direct_prestige),2),0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received),2),0)::numeric,
    coalesce(round(avg(gp.objective_prestige),2),0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received) filter (where gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.objective_prestige)       filter (where gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received) filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.objective_prestige)       filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.assists)  filter (where gp.is_winner),    2),0)::numeric,
    coalesce(round(avg(gp.assists)  filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.failures) filter (where gp.is_winner),    2),0)::numeric,
    coalesce(round(avg(gp.failures) filter (where not gp.is_winner),2),0)::numeric,
    coalesce(sum(gp.score),0)::numeric,
    coalesce(sum(gp.total_prestige),0)::numeric
  into
    finished_game_count,
    signal_win_count, signal_avg_assists, signal_avg_failures, signal_contract_conversion,
    ps_avg_direct, ps_avg_assist_recv, ps_avg_objective,
    ps_avg_direct_win,  ps_avg_assist_recv_win,  ps_avg_objective_win,
    ps_avg_direct_lose, ps_avg_assist_recv_lose, ps_avg_objective_lose,
    corr_avg_assists_win, corr_avg_assists_lose,
    corr_avg_failures_win, corr_avg_failures_lose,
    lifetime_score, lifetime_prestige
  from public.game_participants as gp
  join public.games as g on g.id=gp.game_id and g.status='finished'
  where gp.profile_id=target_profile_id;

  signal_win_rate:=case when finished_game_count>0 then signal_win_count::numeric/finished_game_count else 0 end;
  corr_avg_obj_win:=ps_avg_objective_win; corr_avg_obj_lose:=ps_avg_objective_lose;
  ps_total:=greatest(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,0.01);

  -- Consolidated round query
  select
    coalesce(round(avg(fp),1),0)::numeric, coalesce(round(avg(sp),1),0)::numeric, coalesce(round(avg(sp-fp),1),0)::numeric,
    coalesce(round(avg(fp) filter (where is_win),1),0)::numeric, coalesce(round(avg(fp) filter (where not is_win),1),0)::numeric,
    coalesce(round(sum(ep)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mp)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lp)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(ec)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mc)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lc)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(ef)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mf)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lf)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(eo)::numeric/nullif(sum(er),0),3),0)::numeric, coalesce(round(sum(mo)::numeric/nullif(sum(mr),0),3),0)::numeric, coalesce(round(sum(lo)::numeric/nullif(sum(lr),0),3),0)::numeric,
    coalesce(round(avg(zero_r::numeric/nullif(er+mr+lr,0)*100.0),1),0)::numeric,
    coalesce(round(avg(zero_r::numeric/nullif(er+mr+lr,0)*100.0) filter (where is_win),1),0)::numeric,
    coalesce(max(peak_r),0)::numeric
  into
    pace_avg_first_half, pace_avg_second_half, pace_avg_late_delta, pace_avg_first_half_win, pace_avg_first_half_lose,
    rps_prestige_early, rps_prestige_mid, rps_prestige_late,
    rps_contracts_early, rps_contracts_mid, rps_contracts_late,
    rps_failures_early, rps_failures_mid, rps_failures_late,
    rps_objectives_early, rps_objectives_mid, rps_objectives_late,
    consistency_zero_pct, consistency_zero_pct_win, consistency_best_round
  from (
    select gp.is_winner as is_win,
      coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) as fp,
      coalesce(sum(gr.prestige) filter (where gr.round_index>=mri.max_ri/2.0),0) as sp,
      coalesce(sum(gr.prestige)        filter (where gr.round_index<=6),0)              as ep, count(*) filter (where gr.round_index<=6) as er,
      coalesce(sum(gr.contracts)       filter (where gr.round_index<=6),0)              as ec, coalesce(sum(gr.failures) filter (where gr.round_index<=6),0) as ef,
      coalesce(sum(gr.objective_count) filter (where gr.round_index<=6),0)              as eo,
      coalesce(sum(gr.prestige)        filter (where gr.round_index between 7 and 14),0) as mp, count(*) filter (where gr.round_index between 7 and 14) as mr,
      coalesce(sum(gr.contracts)       filter (where gr.round_index between 7 and 14),0) as mc, coalesce(sum(gr.failures) filter (where gr.round_index between 7 and 14),0) as mf,
      coalesce(sum(gr.objective_count) filter (where gr.round_index between 7 and 14),0) as mo,
      coalesce(sum(gr.prestige)        filter (where gr.round_index>=15),0)             as lp, count(*) filter (where gr.round_index>=15) as lr,
      coalesce(sum(gr.contracts)       filter (where gr.round_index>=15),0)             as lc, coalesce(sum(gr.failures) filter (where gr.round_index>=15),0) as lf,
      coalesce(sum(gr.objective_count) filter (where gr.round_index>=15),0)             as lo,
      count(*) filter (where gr.prestige<=0) as zero_r, max(gr.prestige) as peak_r
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_rounds as gr on gr.participant_id=gp.id
    join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=gp.id) as mri on true
    where gp.profile_id=target_profile_id
    group by gp.id, gp.is_winner
  ) as per_game;

  prestige_sources:=jsonb_build_object('avgDirect',ps_avg_direct,'avgAssistReceived',ps_avg_assist_recv,'avgObjective',ps_avg_objective,'directPct',round(100.0*ps_avg_direct/ps_total,1),'assistReceivedPct',round(100.0*ps_avg_assist_recv/ps_total,1),'objectivePct',round(100.0*ps_avg_objective/ps_total,1),'whenWin',jsonb_build_object('avgDirect',ps_avg_direct_win,'avgAssistReceived',ps_avg_assist_recv_win,'avgObjective',ps_avg_objective_win),'whenLose',jsonb_build_object('avgDirect',ps_avg_direct_lose,'avgAssistReceived',ps_avg_assist_recv_lose,'avgObjective',ps_avg_objective_lose),'description',case when finished_game_count=0 then 'No games yet.' else concat(round(100.0*ps_avg_direct/ps_total,0)::int::text,'% direct, ',round(100.0*ps_avg_assist_recv/ps_total,0)::int::text,'% assist-received, ',round(100.0*ps_avg_objective/ps_total,0)::int::text,'% objective.') end);

  round_phase_stats:=jsonb_build_object('early',jsonb_build_object('label','Early (rounds 0-6)','avgPrestigePerRound',rps_prestige_early,'avgContractsPerRound',rps_contracts_early,'avgFailuresPerRound',rps_failures_early,'avgObjectivesPerRound',rps_objectives_early),'mid',jsonb_build_object('label','Mid (rounds 7-14)','avgPrestigePerRound',rps_prestige_mid,'avgContractsPerRound',rps_contracts_mid,'avgFailuresPerRound',rps_failures_mid,'avgObjectivesPerRound',rps_objectives_mid),'late',jsonb_build_object('label','Late (rounds 15+)','avgPrestigePerRound',rps_prestige_late,'avgContractsPerRound',rps_contracts_late,'avgFailuresPerRound',rps_failures_late,'avgObjectivesPerRound',rps_objectives_late));

  consistency_profile:=jsonb_build_object('scoringRoundPct',round(100.0-consistency_zero_pct,1),'zeroRoundPct',consistency_zero_pct,'zeroRoundPctWin',consistency_zero_pct_win,'bestSingleRound',consistency_best_round,'description',case when finished_game_count=0 then 'No games yet.' else concat(round(100.0-consistency_zero_pct,0)::int::text,'% of rounds score prestige (best single round: ',consistency_best_round::text,').') end);

  if finished_game_count>0 then
    playstyle_label:=case when ps_avg_assist_recv/ps_total>=0.12 then 'Support-oriented' when ps_avg_objective/ps_total>=0.15 then 'Objective-focused' when signal_contract_conversion>=0.85 then 'Contract specialist' when signal_win_rate>=0.55 then 'Well-rounded winner' else 'Direct-driven' end;
    playstyle_summary:=concat(playstyle_label,' across ',finished_game_count::text,' game',case when finished_game_count=1 then '' else 's' end,'. ',round(100.0*ps_avg_direct/ps_total,0)::int::text,'% direct, ',round(100.0*ps_avg_assist_recv/ps_total,0)::int::text,'% assist-received, ',round(100.0*ps_avg_objective/ps_total,0)::int::text,'% objective. Contract conversion: ',round(signal_contract_conversion*100,0)::int::text,'%. Win rate: ',round(signal_win_rate*100,0)::int::text,'%.');
    playstyle_highlights:=jsonb_build_array(jsonb_build_object('key','win-rate','label','Win rate','value',concat(round(signal_win_rate*100),'%')),jsonb_build_object('key','direct-prestige-per-game','label','Direct prestige / game','value',round(ps_avg_direct,1)),jsonb_build_object('key','assists-per-game','label','Assists / game','value',round(signal_avg_assists,1)),jsonb_build_object('key','objective-share','label','Objective share','value',concat(round(100.0*ps_avg_objective/ps_total,0)::int,'%')));
  end if;

  select coalesce(max(streak_len) filter (where is_winner),0)::int, coalesce(max(streak_len) filter (where not is_winner),0)::int, coalesce((array_agg(is_winner order by last_rn desc))[1],false), coalesce((array_agg(streak_len order by last_rn desc))[1],0)::int
  into streak_longest_win, streak_longest_loss, streak_current_is_win, streak_current_len
  from (select is_winner, count(*)::int as streak_len, max(rn) as last_rn from (select gp.is_winner, row_number() over (order by g.created_at asc,g.id asc) as rn, row_number() over (order by g.created_at asc,g.id asc)-row_number() over (partition by gp.is_winner order by g.created_at asc,g.id asc) as grp from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id) as tagged group by is_winner, grp) as streaks;

  if finished_game_count>=3 then
    if signal_win_rate>=0.60 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','dominant-win-rate','label','Dominant win conversion','value',concat(round(signal_win_rate*100)::text,'% win rate'),'tone','green'));
    elsif signal_win_rate<=0.25 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','low-win-rate','label','Low win conversion','value',concat(round(signal_win_rate*100)::text,'% win rate'),'tone','danger')); end if;
    if signal_avg_assists>=1.5 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','high-assists','label','High assist volume','value',concat(round(signal_avg_assists,1)::text,' assists/game'),'tone','blue')); end if;
    if signal_avg_failures>=1.2 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','elevated-failures','label','Elevated failure rate','value',concat(round(signal_avg_failures,1)::text,' failures/game'),'tone','danger')); end if;
    if signal_contract_conversion>=0.80 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','strong-contracts','label','Strong contract execution','value',concat(round(signal_contract_conversion*100)::text,'% conversion'),'tone','green')); end if;
    if signal_avg_assists>=1.2 and signal_win_rate<0.40 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','support-low-conversion','label','Support-heavy, low conversion','value',concat(round(signal_avg_assists,1)::text,' assists, ',round(signal_win_rate*100)::text,'% wins'),'tone','accent')); end if;
    if streak_current_len>=3 then
      if streak_current_is_win then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','win-streak','label',concat(streak_current_len::text,'-game win streak'),'value',concat('Wx',streak_current_len::text),'tone','green'));
      else top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','loss-streak','label',concat(streak_current_len::text,'-game losing streak'),'value',concat('Lx',streak_current_len::text),'tone','danger')); end if;
    end if;
  end if;

  if finished_game_count>=3 then
    correlations_items:=jsonb_build_array(
      jsonb_build_object('key','objectives-vs-wins','label','Objective prestige','whenWin',corr_avg_obj_win,'whenLose',corr_avg_obj_lose,'delta',round(corr_avg_obj_win-corr_avg_obj_lose,2),'direction',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then 'positive' when corr_avg_obj_win<corr_avg_obj_lose-0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then concat('Avg ',corr_avg_obj_win::text,' in wins vs ',corr_avg_obj_lose::text,' in losses') when corr_avg_obj_win<corr_avg_obj_lose-0.1 then concat('More objectives in losses (',corr_avg_obj_lose::text,') than wins (',corr_avg_obj_win::text,')') else 'No meaningful difference' end),
      jsonb_build_object('key','assists-vs-wins','label','Assists','whenWin',corr_avg_assists_win,'whenLose',corr_avg_assists_lose,'delta',round(corr_avg_assists_win-corr_avg_assists_lose,2),'direction',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then 'positive' when corr_avg_assists_win<corr_avg_assists_lose-0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then concat('More assists in wins (',corr_avg_assists_win::text,')') when corr_avg_assists_win<corr_avg_assists_lose-0.1 then concat('Fewer assists when winning (',corr_avg_assists_win::text,')') else 'No meaningful difference' end),
      jsonb_build_object('key','failures-vs-wins','label','Failures','whenWin',corr_avg_failures_win,'whenLose',corr_avg_failures_lose,'delta',round(corr_avg_failures_win-corr_avg_failures_lose,2),'direction',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then 'positive' when corr_avg_failures_win>corr_avg_failures_lose+0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then concat('Fewer failures when winning (',corr_avg_failures_win::text,' vs ',corr_avg_failures_lose::text,')') when corr_avg_failures_win>corr_avg_failures_lose+0.1 then 'More failures in wins than losses' else 'No meaningful difference' end));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('opponentId',opponent_id,'opponentName',opponent_name,'gamesTogether',games_together,'wins',wins,'losses',losses,'draws',games_together-wins-losses) order by games_together desc,opponent_name asc),'[]'::jsonb) into head_to_head
  from (select other_p.id as opponent_id,coalesce(nullif(other_p.display_name,''),other_p.player_name,'Player') as opponent_name,count(distinct g.id)::int as games_together,count(distinct g.id) filter (where g.winner_profile_id=target_profile_id)::int as wins,count(distinct g.id) filter (where g.winner_profile_id=other_p.id)::int as losses from public.profiles as other_p join public.game_participants as gpa on gpa.profile_id=other_p.id join public.game_participants as gpb on gpb.game_id=gpa.game_id and gpb.profile_id=target_profile_id join public.games as g on g.id=gpa.game_id and g.status='finished' where other_p.id<>target_profile_id and other_p.deleted_at is null group by other_p.id,other_p.display_name,other_p.player_name) as h;

  select coalesce(jsonb_agg(jsonb_build_object('position',start_order,'appearances',appearances,'wins',wins,'winRate',case when appearances>0 then round(wins::numeric/appearances,3) else 0::numeric end,'avgPrestige',avg_prestige) order by start_order asc),'[]'::jsonb) into position_stats
  from (select gp.start_order,count(*)::int as appearances,count(*) filter (where gp.is_winner)::int as wins,round(avg(gp.total_prestige),1) as avg_prestige from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id group by gp.start_order) as pos_data;

  select coalesce(jsonb_agg(jsonb_build_object('playerCount',player_count,'games',games,'wins',wins,'winRate',case when games>0 then round(wins::numeric/games,3) else 0::numeric end,'avgPrestige',avg_prestige,'avgAssists',avg_assists,'avgFailures',avg_failures) order by player_count asc),'[]'::jsonb) into player_count_split
  from (select pc.player_count,count(distinct g.id)::int as games,count(*) filter (where gp.is_winner)::int as wins,round(avg(gp.total_prestige),1) as avg_prestige,round(avg(gp.assists),1) as avg_assists,round(avg(gp.failures),1) as avg_failures from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' join lateral (select count(*)::int as player_count from public.game_participants as c where c.game_id=g.id) as pc on true where gp.profile_id=target_profile_id group by pc.player_count) as splits;

  with target_halftimes as (
    select gp.game_id,gp.is_winner,coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) as my_half
    from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' join public.game_rounds as gr on gr.participant_id=gp.id join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=gp.id) as mri on true where gp.profile_id=target_profile_id group by gp.game_id,gp.id,gp.is_winner),
  game_max_other as (
    select other_gp.game_id,max(coalesce(oh.prestige,0)) as max_other_half
    from target_halftimes as th join public.game_participants as other_gp on other_gp.game_id=th.game_id and other_gp.profile_id<>target_profile_id and other_gp.profile_id is not null
    join lateral (select coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) as prestige from public.game_rounds as gr join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=other_gp.id) as mri on true where gr.participant_id=other_gp.id) as oh on true group by other_gp.game_id)
  select count(*)::int,count(*) filter (where th.my_half>=coalesce(gmo.max_other_half,0))::int,count(*) filter (where th.my_half>=coalesce(gmo.max_other_half,0) and th.is_winner)::int,count(*) filter (where th.my_half<coalesce(gmo.max_other_half,0) and th.is_winner)::int
  into ht_total,ht_lead_count,ht_lead_win_count,ht_trail_win_count
  from target_halftimes as th left join game_max_other as gmo on gmo.game_id=th.game_id;

  halftime_profile:=jsonb_build_object('totalGames',ht_total,'leadCount',ht_lead_count,'leadRate',case when ht_total>0 then round(ht_lead_count::numeric/ht_total,3) else 0::numeric end,'leadToWinRate',case when ht_lead_count>0 then round(ht_lead_win_count::numeric/ht_lead_count,3) else 0::numeric end,'trailToWinRate',case when (ht_total-ht_lead_count)>0 then round(ht_trail_win_count::numeric/(ht_total-ht_lead_count),3) else 0::numeric end,'description',case when ht_total=0 then 'No games yet.' else concat('Led at halftime in ',ht_lead_count::text,' of ',ht_total::text,' games (',round(100.0*ht_lead_count/ht_total,0)::int::text,'%). ',case when ht_lead_count>0 then concat('Win rate from lead: ',round(100.0*ht_lead_win_count/ht_lead_count,0)::int::text,'%.') else '' end) end);

  -- Use gp_is_winner and gp_prestige aliases to avoid any possible column ambiguity
  with game_sessions as (
    select gp.is_winner as gp_is_winner, gp.total_prestige as gp_prestige,
      row_number() over (partition by date(coalesce(g.finished_at,g.created_at)) order by coalesce(g.finished_at,g.created_at),g.id) as pos
    from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished'
    where gp.profile_id=target_profile_id),
  position_agg as (
    select pos,count(*)::int as appearances,count(*) filter (where gp_is_winner)::int as wins,round(avg(gp_prestige),1) as avg_prestige
    from game_sessions group by pos)
  select coalesce(jsonb_agg(jsonb_build_object('gameNumber',pos,'appearances',appearances,'wins',wins,'winRate',case when appearances>0 then round(wins::numeric/appearances,3) else 0::numeric end,'avgPrestige',avg_prestige) order by pos),'[]'::jsonb),coalesce(round(sum(wins) filter (where pos<=2)::numeric/nullif(sum(appearances) filter (where pos<=2),0),3),0)::numeric,coalesce(round(sum(wins) filter (where pos>=3)::numeric/nullif(sum(appearances) filter (where pos>=3),0),3),0)::numeric
  into session_profile_items,session_early_wr,session_late_wr from position_agg;

  session_tendency:=case when session_late_wr>session_early_wr+0.15 then 'Warms up' when session_early_wr>session_late_wr+0.15 then 'Fades late' else 'Consistent' end;
  session_profile:=jsonb_build_object('items',session_profile_items,'tendency',session_tendency,'earlyWinRate',session_early_wr,'lateWinRate',session_late_wr,'description',case when finished_game_count=0 then 'No games yet.' when session_tendency='Warms up' then concat('Performs better as sessions progress (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') when session_tendency='Fades late' then concat('Performance declines through sessions (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') else 'Win rate is consistent across games within a session.' end);

  -- #4: cap at 50 most recent; totalCount added to games section below
  select coalesce(jsonb_agg(jsonb_build_object('gameId',game_id,'finishedAt',finished_at,'groupName',group_name,'playerCount',player_count,'isWinner',is_winner,'prestige',row_prestige,'score',row_score,'prestigeSpread',prestige_spread,'winnerName',winner_name,'assists',assists,'failures',failures,'contracts',contracts) order by finished_at desc,game_id desc),'[]'::jsonb)
  into game_history
  from (
    select g.id as game_id,coalesce(g.finished_at,g.created_at) as finished_at,g.group_name_snapshot as group_name,ga.player_count,ga.prestige_spread,gp.is_winner,gp.total_prestige as row_prestige,gp.score as row_score,gp.assists,gp.failures,gp.contracts,coalesce(nullif(wp.display_name,''),wp.player_name,'Unknown') as winner_name
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.profiles as wp on wp.id=g.winner_profile_id
    join lateral (select count(*)::int as player_count,(max(a.total_prestige)-min(a.total_prestige))::int as prestige_spread from public.game_participants as a where a.game_id=g.id) as ga on true
    where gp.profile_id=target_profile_id
    order by coalesce(g.finished_at,g.created_at) desc, g.id desc
    limit 50
  ) as gd;

  player_options:=jsonb_build_array(jsonb_build_object('id',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'playerName',target_player_name,'displayName',target_display_name));

  player_detail:=jsonb_build_object('playerId',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),
    'summary',case when finished_game_count>0 then concat('Server-authored player detail across ',finished_game_count::text,' finished game',case when finished_game_count=1 then '' else 's' end,'.') else 'No finished games are available for this player yet.' end,
    'stats',jsonb_build_object('games',finished_game_count,'wins',signal_win_count,'winRate',concat(round(signal_win_rate*100),'%'),'playerRows',player_row_count,'avgPrestige',round(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,1),'contractConversion',concat(round(signal_contract_conversion*100),'%'),
      'totalScore',lifetime_score,'totalPrestige',lifetime_prestige));  -- #5 prep

  analytics_payload:=jsonb_build_object(
    'generatedAt',generated_at,
    'analyticsHome',jsonb_build_object('generatedAt',generated_at,'daysSinceLastGame',days_since_last_game,'hero',jsonb_build_object('players',registered_player_count,'games',finished_game_count,'views',player_row_count),'cards',jsonb_build_array(jsonb_build_object('key','registered-players','title','Registered players','value',registered_player_count,'description','Active players available to analytics.'),jsonb_build_object('key','tracked-games','title','Tracked games','value',finished_game_count,'description','Finished games involving this profile.'),jsonb_build_object('key','player-rows','title','Player rows','value',player_row_count,'description','Saved participant rows available to summarize.'),jsonb_build_object('key','days-since-last-game','title','Days since last game','value',coalesce(days_since_last_game::text,'-'),'description','Calendar days since this player''s most recent game.'))),
    'statsScreen',jsonb_build_object('generatedAt',generated_at,
      'overview',jsonb_build_object('hero',jsonb_build_object('title','Stats overview','takeaway',case when finished_game_count>0 then 'Server-authored stats are available for this profile.' else 'No finished games are available for this profile yet.' end,'games',finished_game_count,'players',registered_player_count),'cards',jsonb_build_array(jsonb_build_object('key','games-played','title','Games played','value',finished_game_count),jsonb_build_object('key','players-seen','title','Players in network','value',registered_player_count)),'topSignals',top_signals,'streaks',jsonb_build_object('currentStreak',streak_current_len,'currentStreakIsWin',streak_current_is_win,'longestWinStreak',streak_longest_win,'longestLossStreak',streak_longest_loss),'positionStats',position_stats,'playerCountSplit',player_count_split,'halftimeProfile',halftime_profile,'sessionProfile',session_profile),
      'players',jsonb_build_object('options',player_options,'selectedPlayerId',target_profile_id,'detail',player_detail),
      'prestigeSources',prestige_sources,
      'paceProfile',jsonb_build_object('avgFirstHalf',pace_avg_first_half,'avgSecondHalf',pace_avg_second_half,'avgLateDelta',pace_avg_late_delta,'avgFirstHalfWin',pace_avg_first_half_win,'avgFirstHalfLose',pace_avg_first_half_lose,'description',case when finished_game_count=0 then 'No games yet.' else concat('Avg prestige: ',pace_avg_first_half::text,' (first half) -> ',pace_avg_second_half::text,' (second half), +',pace_avg_late_delta::text,'.') end),
      'roundPhaseStats',round_phase_stats,'consistencyProfile',consistency_profile,
      'playstyle',jsonb_build_object('label',playstyle_label,'summary',playstyle_summary,'highlights',playstyle_highlights),
      'correlations',jsonb_build_object('summary',case when finished_game_count<3 then 'Need at least 3 games for meaningful correlation analysis.' else concat(jsonb_array_length(correlations_items)::text,' stats analyzed across ',finished_game_count::text,' games.') end,'items',correlations_items,'selectedKey',null),
      'games',jsonb_build_object('items',game_history,'totalCount',finished_game_count,'selectedGameId',null,'detail',null)),
    'insightsScreen',jsonb_build_object('generatedAt',generated_at,'meta',jsonb_build_object('games',finished_game_count,'playerRows',player_row_count),'topSignals',top_signals,'rivalries',head_to_head,'assistNetwork',jsonb_build_object('nodes','[]'::jsonb,'edges','[]'::jsonb),'correlations',jsonb_build_object('summary',case when finished_game_count<3 then 'Need at least 3 games for meaningful correlation analysis.' else 'Win/loss correlations across objectives, assists, and failures.' end,'items',correlations_items,'selectedKey',null)));

  insert into public.personal_stats_rollups (profile_id,payload,updated_at) values (target_profile_id,analytics_payload,generated_at) on conflict (profile_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;

  insert into public.global_stats_rollups (key,payload,updated_at) values ('overview',jsonb_build_object('gamesPlayed',(select count(*) from public.games where public.games.status='finished'),'playersRegistered',(select count(*) from public.profiles where public.profiles.deleted_at is null),'lastGameId',(select public.games.id from public.games where public.games.status='finished' order by public.games.created_at desc,public.games.id desc limit 1)),now()) on conflict (key) do update set payload=excluded.payload,updated_at=excluded.updated_at;

  insert into public.group_stats_rollups (group_id,payload,updated_at)
  select g.id,jsonb_build_object('groupId',g.id,'name',g.name,'gamesPlayed',coalesce(gc.game_count,0),'lastGameId',gc.last_game_id,'memberCount',coalesce(mc.member_count,0)),now()
  from public.groups as g
  left join lateral (select count(*)::int as game_count,(array_agg(games.id order by games.created_at desc,games.id desc))[1] as last_game_id from public.games as games where games.group_id=g.id and games.status='finished') as gc on true
  left join lateral (select count(*)::int as member_count from public.group_members as gm where gm.group_id=g.id) as mc on true
  where coalesce(gc.game_count,0)>0
  on conflict (group_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;

  return jsonb_build_object('refreshed',true,'profileId',target_profile_id,'generatedAt',generated_at);
end;
$$;

-- Backfill so rollups have totalScore/totalPrestige before get_elo_screen reads them
do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;


-- #2b + #5: get_elo_screen
-- #2b: if winner_profile_id not in active participants (profile deleted), treat as draw
-- #5:  stats subquery replaced with rollup reads (4 PK lookups vs full game_participants scan)
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
  normalized_sort_key text := lower(coalesce(sort_key,'elo'));
  rating_map      jsonb := '{}'::jsonb;
  next_rating_map jsonb := '{}'::jsonb;
  peak_rating_map jsonb := '{}'::jsonb;
  delta_map       jsonb := '{}'::jsonb;
  all_game_participants jsonb := '{}'::jsonb;
  game_row      record;
  part_text     text;
  p_id          uuid;
  current_rating  numeric;
  opponent_ratings numeric[];
  actual_score    numeric;
  next_rating     integer;
  current_delta   integer;
  old_d           jsonb;
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
  summary_avg_delta    numeric := 0;
  summary_best_delta   integer := 0;
  summary_worst_delta  integer := 0;
  win_rate             numeric := 0;
  context_games        integer := 0;
  context_wins         integer := 0;
  context_win_rate     numeric := 0;
  opponent_name        text    := null;
  projection_opponent_ratings numeric[] := array[]::numeric[];
  projection_expected         numeric   := 0;
  next_win_elo                integer   := 1000;
  next_loss_elo               integer   := 1000;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select count(*) into all_profiles_count from public.profiles where deleted_at is null;

  select coalesce(
    (select p.id from public.profiles as p where p.id=focus_player_id  and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.id=profile_id        and p.deleted_at is null limit 1),
    (select p.id from public.profiles as p where p.deleted_at is null order by lower(coalesce(nullif(p.display_name,''),p.player_name,'Player')),p.id limit 1)
  ) into effective_selected_player_id;

  if opponent_id is not null and opponent_id <> effective_selected_player_id then
    select p.id into effective_selected_opponent_id from public.profiles as p where p.id=opponent_id and p.deleted_at is null limit 1;
  end if;

  select coalesce(jsonb_object_agg(gd.game_id::text,gd.parts),'{}'::jsonb) into all_game_participants
  from (select gp.game_id, jsonb_agg(to_jsonb(gp.profile_id::text) order by gp.start_order asc,gp.profile_id asc) as parts from public.game_participants as gp where gp.profile_id is not null group by gp.game_id) as gd;

  for game_row in
    select g.id, g.winner_profile_id from public.games as g
    where g.status='finished' and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id is not null)
    order by g.created_at asc, g.id asc
  loop
    next_rating_map := rating_map;
    for part_text in select v from jsonb_array_elements_text(all_game_participants->(game_row.id::text)) as v loop
      p_id := part_text::uuid;
      current_rating := coalesce((rating_map->>part_text)::numeric, 1000::numeric);
      select coalesce(array_agg(coalesce((rating_map->>v2)::numeric,1000::numeric) order by v2) filter (where v2<>part_text),array[]::numeric[])
      into opponent_ratings from jsonb_array_elements_text(all_game_participants->(game_row.id::text)) as v2;

      -- #2b: winner_profile_id not in active participant list means profile was deleted.
      -- Treat as draw (0.5) rather than scoring everyone 0, which was the old null behavior.
      actual_score := case
        when game_row.winner_profile_id is null then 0.5::numeric
        when game_row.winner_profile_id = p_id  then 1::numeric
        when exists (
          select 1 from jsonb_array_elements_text(all_game_participants->(game_row.id::text)) as v
          where v = game_row.winner_profile_id::text
        ) then 0::numeric  -- another active player won
        else 0.5::numeric  -- winner profile deleted, treat as draw
      end;

      next_rating := round(current_rating+32::numeric*(actual_score-private.elo_expected_score_multi(current_rating,opponent_ratings)));
      peak_rating_map := jsonb_set(peak_rating_map,array[part_text],to_jsonb(greatest(coalesce((peak_rating_map->>part_text)::int,1000),next_rating)),true);
      current_delta := next_rating-current_rating::int;
      old_d := coalesce(delta_map->part_text,'{}'::jsonb);
      delta_map := jsonb_set(delta_map,array[part_text],jsonb_build_object('sum',coalesce((old_d->>'sum')::numeric,0)+current_delta,'cnt',coalesce((old_d->>'cnt')::int,0)+1,'best',greatest(coalesce((old_d->>'best')::int,current_delta),current_delta),'worst',least(coalesce((old_d->>'worst')::int,current_delta),current_delta)),true);
      next_rating_map := jsonb_set(next_rating_map,array[part_text],to_jsonb(next_rating),true);
    end loop;
    rating_map := next_rating_map;
  end loop;

  -- #5: player_options uses rollup for games_played (PK lookup, not full scan)
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(nullif(p.display_name,''),p.player_name,'Player'),'label',coalesce(nullif(p.display_name,''),p.player_name,'Player'),'displayName',nullif(p.display_name,''),'playerName',p.player_name,'color',p.favorite_color,'assignedCardArtIndex',p.assigned_card_art_index,'gamesPlayed',coalesce(stats.games_played,0),'currentElo',coalesce((rating_map->>p.id::text)::int,1000)) order by lower(coalesce(nullif(p.display_name,''),p.player_name,'Player')),p.id),'[]'::jsonb)
  into player_options
  from public.profiles as p
  left join (select psr.profile_id, coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0) as games_played from public.personal_stats_rollups as psr) as stats on stats.profile_id=p.id
  where p.deleted_at is null;

  -- #5: leaderboard base CTE reads from rollup instead of scanning all game_participants
  with base as (
    select p.id as player_id, coalesce(nullif(p.display_name,''),p.player_name,'Player') as name,
      p.favorite_color as color, p.assigned_card_art_index,
      coalesce((rating_map->>p.id::text)::int,1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int,1000) as peak_elo,
      coalesce((delta_map->p.id::text->>'sum')::numeric/nullif((delta_map->p.id::text->>'cnt')::int,0),0)::numeric as avg_delta,
      coalesce((delta_map->p.id::text->>'best')::int,0)  as best_delta,
      coalesce((delta_map->p.id::text->>'worst')::int,0) as worst_delta,
      coalesce(stats.games_played,0) as games_played,
      coalesce(stats.wins,0) as wins,
      greatest(coalesce(stats.games_played,0)-coalesce(stats.wins,0),0) as losses,
      coalesce(stats.score,0)::numeric    as score,
      coalesce(stats.prestige,0)::numeric as prestige,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.wins,0)::numeric/stats.games_played else 0 end as efficiency,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.prestige,0)::numeric/stats.games_played else 0 end as avg_prestige,
      least(1::numeric,case when coalesce(stats.games_played,0)>0 then stats.games_played::numeric/12 else 0 end) as confidence
    from public.profiles as p
    left join (
      select psr.profile_id,
        coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0)          as games_played,
        coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'wins')::int,0)           as wins,
        coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalScore')::numeric,0)    as score,
        coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalPrestige')::numeric,0) as prestige
      from public.personal_stats_rollups as psr
    ) as stats on stats.profile_id=p.id
    where p.deleted_at is null
  ),
  ordered as (select base.*, row_number() over (order by case when normalized_sort_key='wins' then wins::numeric when normalized_sort_key='games' then games_played::numeric when normalized_sort_key='score' then score when normalized_sort_key='prestige' then prestige when normalized_sort_key='efficiency' then efficiency when normalized_sort_key='avgprestige' then avg_prestige else current_elo::numeric end desc, lower(name) asc, player_id asc) as rank from base)
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank,'playerId',player_id,'name',name,'color',color,'assignedCardArtIndex',assigned_card_art_index,'currentElo',current_elo,'peakElo',peak_elo,'avgDelta',round(avg_delta,1),'bestDelta',best_delta,'worstDelta',worst_delta,'confidence',confidence,'gamesPlayed',games_played,'wins',wins,'losses',losses,'score',score,'prestige',prestige,'efficiency',efficiency,'avgPrestige',avg_prestige) order by rank),'[]'::jsonb) into leaderboard_rows from ordered;

  -- #5: summary uses same rollup-backed stats
  with base as (
    select p.id as player_id, coalesce(nullif(p.display_name,''),p.player_name,'Player') as name,
      coalesce((rating_map->>p.id::text)::int,1000)      as current_elo,
      coalesce((peak_rating_map->>p.id::text)::int,1000) as peak_elo,
      coalesce((delta_map->p.id::text->>'sum')::numeric/nullif((delta_map->p.id::text->>'cnt')::int,0),0)::numeric as avg_delta,
      coalesce((delta_map->p.id::text->>'best')::int,0)  as best_delta,
      coalesce((delta_map->p.id::text->>'worst')::int,0) as worst_delta,
      coalesce(stats.games_played,0) as games_played, coalesce(stats.wins,0) as wins,
      greatest(coalesce(stats.games_played,0)-coalesce(stats.wins,0),0) as losses,
      coalesce(stats.score,0)::numeric as score, coalesce(stats.prestige,0)::numeric as prestige,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.wins,0)::numeric/stats.games_played else 0 end as efficiency,
      case when coalesce(stats.games_played,0)>0 then coalesce(stats.prestige,0)::numeric/stats.games_played else 0 end as avg_prestige,
      least(1::numeric,case when coalesce(stats.games_played,0)>0 then stats.games_played::numeric/12 else 0 end) as confidence
    from public.profiles as p
    left join (select psr.profile_id,coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0) as games_played,coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'wins')::int,0) as wins,coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalScore')::numeric,0) as score,coalesce((psr.payload->'statsScreen'->'players'->'detail'->'stats'->>'totalPrestige')::numeric,0) as prestige from public.personal_stats_rollups as psr) as stats on stats.profile_id=p.id
    where p.deleted_at is null)
  select base.name,base.current_elo,base.peak_elo,base.games_played,base.wins,base.losses,base.confidence,base.score,base.prestige,base.efficiency,base.avg_prestige,base.avg_delta,base.best_delta,base.worst_delta
  into summary_name,summary_current_elo,summary_peak_elo,summary_games,summary_wins,summary_losses,summary_confidence,summary_score,summary_prestige,summary_efficiency,summary_avg_prestige,summary_avg_delta,summary_best_delta,summary_worst_delta
  from base where base.player_id=effective_selected_player_id;

  select coalesce(string_agg(lf.result,'' order by lf.created_at asc,lf.game_id asc),'') into summary_recent_form
  from (select g.id as game_id,g.created_at,case when gp.is_winner then 'W' else 'L' end as result from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=effective_selected_player_id order by g.created_at desc,g.id desc limit 5) as lf;

  if effective_selected_opponent_id is not null then
    select coalesce(nullif(p.display_name,''),p.player_name,'Player') into opponent_name from public.profiles as p where p.id=effective_selected_opponent_id;
  end if;

  select count(*)::int,count(*) filter (where gp.is_winner)::int into context_games,context_wins
  from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished'
  where gp.profile_id=effective_selected_player_id and (effective_selected_opponent_id is null or exists (select 1 from public.game_participants as opp where opp.game_id=g.id and opp.profile_id=effective_selected_opponent_id));

  win_rate:=case when summary_games>0 then summary_wins::numeric/summary_games else 0 end;
  context_win_rate:=case when context_games>0 then context_wins::numeric/context_games else 0 end;

  select coalesce(array_agg(coalesce((rating_map->>p.id::text)::numeric,1000)) filter (where p.id<>effective_selected_player_id),array[]::numeric[]) into projection_opponent_ratings from public.profiles as p where p.deleted_at is null;
  if array_length(projection_opponent_ratings,1)>0 and summary_current_elo is not null then
    projection_expected:=private.elo_expected_score_multi(summary_current_elo::numeric,projection_opponent_ratings);
    next_win_elo:=round(summary_current_elo+32*(1-projection_expected))::int;
    next_loss_elo:=round(summary_current_elo+32*(0-projection_expected))::int;
  else next_win_elo:=summary_current_elo; next_loss_elo:=summary_current_elo; end if;

  selected_summary:=jsonb_build_object('playerId',effective_selected_player_id,'name',summary_name,'currentElo',summary_current_elo,'peakElo',summary_peak_elo,'confidence',summary_confidence,'gamesPlayed',summary_games,'wins',summary_wins,'losses',summary_losses,'avgDelta',round(summary_avg_delta,1),'bestDelta',summary_best_delta,'worstDelta',summary_worst_delta,'recentForm',case when length(summary_recent_form)>0 then summary_recent_form else '-' end,'score',summary_score,'prestige',summary_prestige,'efficiency',summary_efficiency,'avgPrestige',summary_avg_prestige,'nextWinElo',next_win_elo,'nextLossElo',next_loss_elo);

  top_cards:=jsonb_build_array(jsonb_build_object('key','current-elo','label','Current ELO','value',summary_current_elo::text,'sub',concat(summary_games::text,' rated game',case when summary_games=1 then '' else 's' end),'tone','accent'),jsonb_build_object('key','peak-elo','label','Peak ELO','value',summary_peak_elo::text,'sub',case when summary_peak_elo>summary_current_elo then concat('+',(summary_peak_elo-summary_current_elo)::text,' above current') else 'Currently at peak' end,'tone','blue'),jsonb_build_object('key','win-rate','label','Win Rate','value',concat(round(win_rate*100),'%'),'sub',case when context_games>0 then concat('H2H ',round(context_win_rate*100),'%') else 'All rated games' end,'tone','green'));

  sections:=jsonb_build_object(
    'Leaderboard',jsonb_build_object('title','Leaderboard Metrics','cards',jsonb_build_array(jsonb_build_object('key','leader-current','label','Current ELO','value',summary_current_elo::text,'tone','accent'),jsonb_build_object('key','leader-peak','label','Peak ELO','value',summary_peak_elo::text,'tone','blue'),jsonb_build_object('key','leader-games','label','Rated Games','value',summary_games::text,'tone','default'),jsonb_build_object('key','leader-record','label','Record','value',concat(summary_wins::text,'-',summary_losses::text),'tone',case when summary_wins>=summary_losses then 'green' else 'danger' end),jsonb_build_object('key','leader-winrate','label','Win Rate','value',concat(round(win_rate*100),'%'),'tone',case when win_rate>=0.5 then 'green' else 'danger' end),jsonb_build_object('key','leader-confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Momentum',jsonb_build_object('title','Momentum Snapshot','cards',jsonb_build_array(jsonb_build_object('key','recent-form','label','Recent Form','value',case when length(summary_recent_form)>0 then summary_recent_form else '-' end,'tone','accent'),jsonb_build_object('key','avg-delta','label','Avg ELO Change','value',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,'tone',case when summary_avg_delta>=0 then 'green' else 'danger' end),jsonb_build_object('key','wins','label','Wins','value',summary_wins::text,'tone','green'),jsonb_build_object('key','losses','label','Losses','value',summary_losses::text,'tone','danger'),jsonb_build_object('key','winrate','label','Win Rate','value',concat(round(win_rate*100),'%'),'tone',case when win_rate>=0.5 then 'green' else 'danger' end),jsonb_build_object('key','confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Skills',jsonb_build_object('title','Rating Profile','cards',jsonb_build_array(jsonb_build_object('key','current','label','Current ELO','value',summary_current_elo::text,'tone','accent'),jsonb_build_object('key','peak','label','Peak ELO','value',summary_peak_elo::text,'tone','blue'),jsonb_build_object('key','best-delta','label','Best Single Game','value',case when summary_best_delta>=0 then concat('+',summary_best_delta::text) else summary_best_delta::text end,'tone','green'),jsonb_build_object('key','worst-delta','label','Worst Single Game','value',case when summary_worst_delta>=0 then concat('+',summary_worst_delta::text) else summary_worst_delta::text end,'tone','danger'),jsonb_build_object('key','record','label','Record','value',concat(summary_wins::text,'-',summary_losses::text),'tone',case when summary_wins>=summary_losses then 'green' else 'danger' end),jsonb_build_object('key','confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))),
    'Context',jsonb_build_object('title','Context Split','cards',jsonb_build_array(jsonb_build_object('key','sample','label',case when opponent_name is not null then concat('Games vs ',opponent_name) else 'Filtered Games' end,'value',context_games::text,'tone','accent'),jsonb_build_object('key','context-winrate','label','H2H Win Rate','value',concat(round(context_win_rate*100),'%'),'tone',case when context_win_rate>=0.5 then 'green' else 'danger' end),jsonb_build_object('key','context-wins','label','Filter Wins','value',context_wins::text,'tone','green'),jsonb_build_object('key','context-losses','label','Filter Losses','value',greatest(context_games-context_wins,0)::text,'tone','danger'),jsonb_build_object('key','context-current','label','Current ELO','value',summary_current_elo::text,'tone','blue'),jsonb_build_object('key','context-confidence','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','default'))),
    'Projection',jsonb_build_object('title','Projection Window','cards',jsonb_build_array(jsonb_build_object('key','current-proj','label','Current ELO','value',summary_current_elo::text,'tone','accent'),jsonb_build_object('key','next-win','label','Next Win ELO','value',next_win_elo::text,'tone','green'),jsonb_build_object('key','next-loss','label','Next Loss ELO','value',next_loss_elo::text,'tone','danger'),jsonb_build_object('key','avg-delta','label','Avg ELO Change','value',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,'tone','accent'),jsonb_build_object('key','best-delta','label','Best Single Game','value',case when summary_best_delta>=0 then concat('+',summary_best_delta::text) else summary_best_delta::text end,'tone','green'),jsonb_build_object('key','confidence-proj','label','Confidence','value',concat(round(summary_confidence*100),'%'),'tone','blue'))));

  insights:=jsonb_build_object('Leaderboard',jsonb_build_object('title','Leaderboard Insight','body',case when summary_games=0 then 'No rated games yet. Finish a saved game to start ELO tracking.' else concat(summary_name,' sits at ELO ',summary_current_elo::text,' (peak: ',summary_peak_elo::text,').') end),'Momentum',jsonb_build_object('title','Momentum Insight','body',case when summary_games=0 then 'No rated games yet.' else concat(summary_name,' recent form: ',case when length(summary_recent_form)>0 then summary_recent_form else '-' end,'. Avg ELO change: ',case when summary_avg_delta>=0 then concat('+',round(summary_avg_delta,1)::text) else round(summary_avg_delta,1)::text end,' per game.') end),'Skills',jsonb_build_object('title','Rating Insight','body',case when summary_games=0 then 'No rated games yet.' else concat(summary_name,' peaked at ',summary_peak_elo::text,'.',case when summary_peak_elo>summary_current_elo then concat(' Currently ',(summary_peak_elo-summary_current_elo)::text,' below career peak.') else ' Currently at career peak.' end) end),'Context',jsonb_build_object('title','Context Insight','body',case when opponent_name is not null and context_games>0 then concat(summary_name,' ',context_wins::text,' win',case when context_wins=1 then '' else 's' end,' in ',context_games::text,' game',case when context_games=1 then '' else 's' end,' against ',opponent_name,'.') else 'Select an opponent to isolate head-to-head results.' end),'Projection',jsonb_build_object('title','Projection Insight','body',case when summary_games=0 then 'Projection requires at least one rated game.' else concat('Win vs current field: ',next_win_elo::text,' (',case when next_win_elo>=summary_current_elo then '+' else '' end,(next_win_elo-summary_current_elo)::text,'). Loss: ',next_loss_elo::text,' (',(next_loss_elo-summary_current_elo)::text,').') end));

  if all_profiles_count=0 then empty_state:=jsonb_build_object('title','No ELO roster yet','description','Create at least one profile to unlock the server-authored leaderboard.');
  elsif summary_games=0 then empty_state:=jsonb_build_object('title','No rated games yet','description','Finish a saved game to populate the server-authored ELO surfaces.');
  end if;

  return jsonb_build_object('generatedAt',now(),'sortKey',coalesce(sort_key,'elo'),'playerOptions',player_options,'selectedPlayerId',effective_selected_player_id,'selectedOpponentId',effective_selected_opponent_id,'leaderboardRows',leaderboard_rows,'summary',selected_summary,'topCards',top_cards,'sections',sections,'insights',insights,'emptyState',empty_state);
end;
$$;
;
