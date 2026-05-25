
-- #5: admin_refresh_analytics — add pairing/macro/personal/synergy to insightsScreen rollup.
-- These were computed live on every get_insights_screen call; now computed once at save time.
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
  lifetime_score    numeric := 0;
  lifetime_prestige numeric := 0;
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
  -- #5: insights correlations (previously computed live in get_insights_screen)
  pairing_payload       jsonb := '[]'::jsonb;
  macro_payload         jsonb := '[]'::jsonb;
  personal_payload      jsonb := '[]'::jsonb;
  synergy_payload       jsonb := '[]'::jsonb;
  macro_contract_ratio        numeric := 0;
  macro_assists_given         numeric := 0;
  macro_assists_received      numeric := 0;
  macro_early_lead            numeric := 0;
  macro_assist_target_gap     numeric := 0;
  macro_assist_leader_gap     numeric := 0;
  macro_assists_at_six_plus   numeric := 0;
  macro_assists_over5_behind  numeric := 0;
  macro_assist_prestige_gained numeric := 0;
  personal_assist_target_gap   numeric := 0;
  personal_assist_leader_gap   numeric := 0;
  personal_assists_at_six_plus numeric := 0;
  personal_assists_over5_behind numeric := 0;
  personal_assist_prestige_gained numeric := 0;
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
      coalesce(sum(gr.prestige)        filter (where gr.round_index<=6),0)               as ep, count(*) filter (where gr.round_index<=6) as er,
      coalesce(sum(gr.contracts)       filter (where gr.round_index<=6),0)               as ec, coalesce(sum(gr.failures) filter (where gr.round_index<=6),0) as ef,
      coalesce(sum(gr.objective_count) filter (where gr.round_index<=6),0)               as eo,
      coalesce(sum(gr.prestige)        filter (where gr.round_index between 7 and 14),0) as mp, count(*) filter (where gr.round_index between 7 and 14) as mr,
      coalesce(sum(gr.contracts)       filter (where gr.round_index between 7 and 14),0) as mc, coalesce(sum(gr.failures) filter (where gr.round_index between 7 and 14),0) as mf,
      coalesce(sum(gr.objective_count) filter (where gr.round_index between 7 and 14),0) as mo,
      coalesce(sum(gr.prestige)        filter (where gr.round_index>=15),0)              as lp, count(*) filter (where gr.round_index>=15) as lr,
      coalesce(sum(gr.contracts)       filter (where gr.round_index>=15),0)              as lc, coalesce(sum(gr.failures) filter (where gr.round_index>=15),0) as lf,
      coalesce(sum(gr.objective_count) filter (where gr.round_index>=15),0)              as lo,
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
    if streak_current_len>=3 then if streak_current_is_win then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','win-streak','label',concat(streak_current_len::text,'-game win streak'),'value',concat('Wx',streak_current_len::text),'tone','green')); else top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','loss-streak','label',concat(streak_current_len::text,'-game losing streak'),'value',concat('Lx',streak_current_len::text),'tone','danger')); end if; end if;
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

  with target_halftimes as (select gp.game_id,gp.is_winner,coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) as my_half from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' join public.game_rounds as gr on gr.participant_id=gp.id join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=gp.id) as mri on true where gp.profile_id=target_profile_id group by gp.game_id,gp.id,gp.is_winner),
  game_max_other as (select other_gp.game_id,max(coalesce(oh.prestige,0)) as max_other_half from target_halftimes as th join public.game_participants as other_gp on other_gp.game_id=th.game_id and other_gp.profile_id<>target_profile_id and other_gp.profile_id is not null join lateral (select coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) as prestige from public.game_rounds as gr join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=other_gp.id) as mri on true where gr.participant_id=other_gp.id) as oh on true group by other_gp.game_id)
  select count(*)::int,count(*) filter (where th.my_half>=coalesce(gmo.max_other_half,0))::int,count(*) filter (where th.my_half>=coalesce(gmo.max_other_half,0) and th.is_winner)::int,count(*) filter (where th.my_half<coalesce(gmo.max_other_half,0) and th.is_winner)::int
  into ht_total,ht_lead_count,ht_lead_win_count,ht_trail_win_count
  from target_halftimes as th left join game_max_other as gmo on gmo.game_id=th.game_id;

  halftime_profile:=jsonb_build_object('totalGames',ht_total,'leadCount',ht_lead_count,'leadRate',case when ht_total>0 then round(ht_lead_count::numeric/ht_total,3) else 0::numeric end,'leadToWinRate',case when ht_lead_count>0 then round(ht_lead_win_count::numeric/ht_lead_count,3) else 0::numeric end,'trailToWinRate',case when (ht_total-ht_lead_count)>0 then round(ht_trail_win_count::numeric/(ht_total-ht_lead_count),3) else 0::numeric end,'description',case when ht_total=0 then 'No games yet.' else concat('Led at halftime in ',ht_lead_count::text,' of ',ht_total::text,' games (',round(100.0*ht_lead_count/ht_total,0)::int::text,'%). ',case when ht_lead_count>0 then concat('Win rate from lead: ',round(100.0*ht_lead_win_count/ht_lead_count,0)::int::text,'%.') else '' end) end);

  with game_sessions as (select gp.is_winner as gp_is_winner, gp.total_prestige as gp_prestige, row_number() over (partition by date(coalesce(g.finished_at,g.created_at)) order by coalesce(g.finished_at,g.created_at),g.id) as pos from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id),
  position_agg as (select pos,count(*)::int as appearances,count(*) filter (where gp_is_winner)::int as wins,round(avg(gp_prestige),1) as avg_prestige from game_sessions group by pos)
  select coalesce(jsonb_agg(jsonb_build_object('gameNumber',pos,'appearances',appearances,'wins',wins,'winRate',case when appearances>0 then round(wins::numeric/appearances,3) else 0::numeric end,'avgPrestige',avg_prestige) order by pos),'[]'::jsonb),coalesce(round(sum(wins) filter (where pos<=2)::numeric/nullif(sum(appearances) filter (where pos<=2),0),3),0)::numeric,coalesce(round(sum(wins) filter (where pos>=3)::numeric/nullif(sum(appearances) filter (where pos>=3),0),3),0)::numeric
  into session_profile_items,session_early_wr,session_late_wr from position_agg;

  session_tendency:=case when session_late_wr>session_early_wr+0.15 then 'Warms up' when session_early_wr>session_late_wr+0.15 then 'Fades late' else 'Consistent' end;
  session_profile:=jsonb_build_object('items',session_profile_items,'tendency',session_tendency,'earlyWinRate',session_early_wr,'lateWinRate',session_late_wr,'description',case when finished_game_count=0 then 'No games yet.' when session_tendency='Warms up' then concat('Performs better as sessions progress (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') when session_tendency='Fades late' then concat('Performance declines through sessions (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') else 'Win rate is consistent across games within a session.' end);

  select coalesce(jsonb_agg(jsonb_build_object('gameId',game_id,'finishedAt',finished_at,'groupName',group_name,'playerCount',player_count,'isWinner',is_winner,'prestige',row_prestige,'score',row_score,'prestigeSpread',prestige_spread,'winnerName',winner_name,'assists',assists,'failures',failures,'contracts',contracts) order by finished_at desc,game_id desc),'[]'::jsonb)
  into game_history
  from (select g.id as game_id,coalesce(g.finished_at,g.created_at) as finished_at,g.group_name_snapshot as group_name,ga.player_count,ga.prestige_spread,gp.is_winner,gp.total_prestige as row_prestige,gp.score as row_score,gp.assists,gp.failures,gp.contracts,coalesce(nullif(wp.display_name,''),wp.player_name,'Unknown') as winner_name from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' join public.profiles as wp on wp.id=g.winner_profile_id join lateral (select count(*)::int as player_count,(max(a.total_prestige)-min(a.total_prestige))::int as prestige_spread from public.game_participants as a where a.game_id=g.id) as ga on true where gp.profile_id=target_profile_id order by coalesce(g.finished_at,g.created_at) desc, g.id desc limit 50) as gd;

  player_options:=jsonb_build_array(jsonb_build_object('id',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'playerName',target_player_name,'displayName',target_display_name));

  player_detail:=jsonb_build_object('playerId',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'summary',case when finished_game_count>0 then concat('Server-authored player detail across ',finished_game_count::text,' finished game',case when finished_game_count=1 then '' else 's' end,'.') else 'No finished games are available for this player yet.' end,'stats',jsonb_build_object('games',finished_game_count,'wins',signal_win_count,'winRate',concat(round(signal_win_rate*100),'%'),'playerRows',player_row_count,'avgPrestige',round(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,1),'contractConversion',concat(round(signal_contract_conversion*100),'%'),'totalScore',lifetime_score,'totalPrestige',lifetime_prestige));

  -- #5: Compute pairing, macro, personal, synergy correlations for insightsScreen rollup.
  -- Previously these ran live on every get_insights_screen call.
  if finished_game_count >= 2 then

    -- Pairing correlations: for each co-player, how correlated is their presence with target winning?
    select coalesce(jsonb_agg(jsonb_build_object('label',format('With %s vs win rate',p.label),'value',round(p.corr_value,2),'strength',case when abs(p.corr_value)>=0.5 then 'Strong' when abs(p.corr_value)>=0.25 then 'Moderate' else 'Light' end) order by abs(p.corr_value) desc, p.games_together desc, p.label),'[]'::jsonb)
    into pairing_payload
    from (
      select np.label,
        coalesce(corr(case when paired.profile_id is null then 0::double precision else 1::double precision end, case when tg.target_won then 1::double precision else 0::double precision end)::numeric, 0) as corr_value,
        count(paired.profile_id)::int as games_together
      from (
        select distinct on (gp.profile_id) gp.profile_id,
          coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,''),'Unknown') as label
        from public.game_participants as gp
        join public.game_participants as my_gp on my_gp.game_id=gp.game_id and my_gp.profile_id=target_profile_id
        join public.games as g on g.id=gp.game_id and g.status='finished'
        where gp.profile_id is not null and gp.profile_id<>target_profile_id
        order by gp.profile_id, label
      ) as np
      cross join (
        select g.id as game_id,
          exists(select 1 from public.game_participants as wgp where wgp.game_id=g.id and wgp.profile_id=target_profile_id and wgp.is_winner) as target_won
        from public.games as g
        join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id
        where g.status='finished'
      ) as tg
      left join public.game_participants as paired on paired.game_id=tg.game_id and paired.profile_id=np.profile_id
      group by np.profile_id, np.label
      having count(paired.profile_id) >= 2
      order by abs(coalesce(corr(case when paired.profile_id is null then 0::double precision else 1::double precision end, case when tg.target_won then 1::double precision else 0::double precision end)::numeric,0)) desc
      limit 6
    ) as p;

    -- Macro correlations across ALL participants in target's games
    with tg as (
      select g.id as game_id
      from public.games as g
      join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id
      where g.status='finished'
    ),
    round_zero_leaders as (
      select gr.game_id, gp.profile_id,
        case when gr.prestige=max(gr.prestige) over (partition by gr.game_id) and gr.prestige>0 then 1 else 0 end as early_lead
      from public.game_rounds as gr
      join public.game_participants as gp on gp.id=gr.participant_id
      join tg on tg.game_id=gr.game_id
      where gr.round_index=0 and gp.profile_id is not null
    ),
    macro_samples as (
      select gp.contracts, gp.failures, gp.assists, gp.assist_prestige_received, gp.is_winner,
        coalesce(rzl.early_lead,0) as early_lead
      from public.game_participants as gp
      join tg on tg.game_id=gp.game_id
      left join round_zero_leaders as rzl on rzl.game_id=gp.game_id and rzl.profile_id=gp.profile_id
      where gp.profile_id is not null
    )
    select
      coalesce(corr(ms.contracts::double precision/greatest(ms.failures,1)::double precision, case when ms.is_winner then 1::double precision else 0::double precision end)::numeric, 0),
      coalesce(corr(ms.assists::double precision,                  case when ms.is_winner then 1::double precision else 0::double precision end)::numeric, 0),
      coalesce(corr(ms.assist_prestige_received::double precision, case when ms.is_winner then 1::double precision else 0::double precision end)::numeric, 0),
      coalesce(corr(ms.early_lead::double precision,               case when ms.is_winner then 1::double precision else 0::double precision end)::numeric, 0)
    into macro_contract_ratio, macro_assists_given, macro_assists_received, macro_early_lead
    from macro_samples as ms;

    -- Assist-context correlations: macro (all players) and personal (target only)
    with tg as (
      select g.id as game_id
      from public.games as g
      join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id
      where g.status='finished'
    ),
    game_profiles as (
      select gp.game_id, gp.profile_id
      from public.game_participants as gp
      join tg on tg.game_id=gp.game_id
      where gp.profile_id is not null
    ),
    tracked_rounds as (
      select gr.game_id, gr.round_index, gp.profile_id as target_player_id,
        coalesce(gr.prestige,0)::numeric as round_prestige,
        gr.assist_recipients, gr.assist_prestige_recipients
      from public.game_rounds as gr
      join public.game_participants as gp on gp.id=gr.participant_id
      join tg on tg.game_id=gr.game_id
      where gp.profile_id is not null
    ),
    round_prestige_deltas as (
      select tr.game_id, tr.round_index, tr.target_player_id as profile_id, tr.round_prestige as prestige_delta
      from tracked_rounds as tr
      union all
      select tr.game_id, tr.round_index, gp2.profile_id,
        greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key,'')::numeric,0),0)::numeric
      from tracked_rounds as tr
      join lateral jsonb_each_text(tr.assist_prestige_recipients) as edge(key,value) on true
      join game_profiles as gp2 on gp2.game_id=tr.game_id and gp2.profile_id::text=btrim(edge.key)
      where btrim(edge.key)<>''
    ),
    prestige_before as (
      select tr.game_id, tr.round_index, gp2.profile_id,
        coalesce(sum(prev.prestige_delta),0)::numeric as pbr
      from tracked_rounds as tr
      join game_profiles as gp2 on gp2.game_id=tr.game_id
      left join round_prestige_deltas as prev on prev.game_id=tr.game_id and prev.profile_id=gp2.profile_id and prev.round_index<tr.round_index
      group by tr.game_id, tr.round_index, gp2.profile_id
    ),
    leader_state as (
      select pb.game_id, pb.round_index, max(pb.pbr) as leader_prestige
      from prestige_before as pb
      group by pb.game_id, pb.round_index
    ),
    assist_events as (
      select tr.game_id, gp2.profile_id as player_id, tr.target_player_id,
        abs(h_state.pbr-t_state.pbr)::numeric                          as gap_to_target,
        (ls.leader_prestige-h_state.pbr)::numeric                      as gap_to_leader,
        case when h_state.pbr>=6 then 1 else 0 end                     as assist_at_six_plus,
        case when (ls.leader_prestige-h_state.pbr)>5 then 1 else 0 end as assist_over_five_behind,
        (greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key,'')::numeric,0),0)/greatest(edge.value::numeric,1))::numeric as assist_prestige_gained
      from tracked_rounds as tr
      join prestige_before as t_state on t_state.game_id=tr.game_id and t_state.round_index=tr.round_index and t_state.profile_id=tr.target_player_id
      join leader_state as ls on ls.game_id=tr.game_id and ls.round_index=tr.round_index
      join lateral jsonb_each_text(tr.assist_recipients) as edge(key,value) on true
      join game_profiles as gp2 on gp2.game_id=tr.game_id and gp2.profile_id::text=btrim(edge.key)
      join prestige_before as h_state on h_state.game_id=tr.game_id and h_state.round_index=tr.round_index and h_state.profile_id=gp2.profile_id
      join lateral generate_series(1,greatest(edge.value::int,0)) as rep(idx) on true
      where btrim(edge.key)<>'' and edge.value::int>0
    ),
    assist_context_samples as (
      select gp2.game_id, gp2.profile_id,
        count(ae.player_id)::int as assist_count,
        case when count(ae.player_id)>0 then avg(ae.gap_to_target)::numeric else null end as avg_gap_to_target,
        case when count(ae.player_id)>0 then avg(ae.gap_to_leader)::numeric else null end as avg_gap_to_leader,
        coalesce(sum(ae.assist_at_six_plus),0)::int                    as assists_at_six_plus,
        coalesce(sum(ae.assist_over_five_behind),0)::int               as assists_over_five_behind,
        coalesce(sum(ae.assist_prestige_gained),0)::numeric             as assist_prestige_gained,
        case when winner_gp.profile_id=gp2.profile_id then 1::double precision else 0::double precision end as victory
      from game_profiles as gp2
      left join assist_events as ae on ae.game_id=gp2.game_id and ae.player_id=gp2.profile_id
      left join public.game_participants as winner_gp on winner_gp.game_id=gp2.game_id and winner_gp.is_winner
      group by gp2.game_id, gp2.profile_id, winner_gp.profile_id
    )
    select
      coalesce((select corr(acs.avg_gap_to_target::double precision, acs.victory) from assist_context_samples as acs where acs.avg_gap_to_target is not null)::numeric, 0),
      coalesce((select corr(acs.avg_gap_to_leader::double precision, acs.victory) from assist_context_samples as acs where acs.avg_gap_to_leader is not null)::numeric, 0),
      coalesce((select corr(acs.assists_at_six_plus::double precision, acs.victory) from assist_context_samples as acs)::numeric, 0),
      coalesce((select corr(acs.assists_over_five_behind::double precision, acs.victory) from assist_context_samples as acs)::numeric, 0),
      coalesce((select corr(acs.assist_prestige_gained::double precision, acs.victory) from assist_context_samples as acs)::numeric, 0),
      coalesce((select corr(acs.avg_gap_to_target::double precision, acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id and acs.avg_gap_to_target is not null)::numeric, 0),
      coalesce((select corr(acs.avg_gap_to_leader::double precision, acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id and acs.avg_gap_to_leader is not null)::numeric, 0),
      coalesce((select corr(acs.assists_at_six_plus::double precision, acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric, 0),
      coalesce((select corr(acs.assists_over_five_behind::double precision, acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric, 0),
      coalesce((select corr(acs.assist_prestige_gained::double precision, acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric, 0)
    into macro_assist_target_gap, macro_assist_leader_gap, macro_assists_at_six_plus, macro_assists_over5_behind, macro_assist_prestige_gained,
         personal_assist_target_gap, personal_assist_leader_gap, personal_assists_at_six_plus, personal_assists_over5_behind, personal_assist_prestige_gained;

    personal_payload:=jsonb_build_array(
      jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(personal_assist_target_gap,2),'strength',case when abs(personal_assist_target_gap)>=0.5 then 'Strong' when abs(personal_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(personal_assist_leader_gap,2),'strength',case when abs(personal_assist_leader_gap)>=0.5 then 'Strong' when abs(personal_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(personal_assists_at_six_plus,2),'strength',case when abs(personal_assists_at_six_plus)>=0.5 then 'Strong' when abs(personal_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(personal_assists_over5_behind,2),'strength',case when abs(personal_assists_over5_behind)>=0.5 then 'Strong' when abs(personal_assists_over5_behind)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(personal_assist_prestige_gained,2),'strength',case when abs(personal_assist_prestige_gained)>=0.5 then 'Strong' when abs(personal_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));

    macro_payload:=jsonb_build_array(
      jsonb_build_object('label','Contracts / Failures Ratio vs Win Rate','value',round(macro_contract_ratio,2),'strength',case when abs(macro_contract_ratio)>=0.5 then 'Strong' when abs(macro_contract_ratio)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Given vs Win Rate','value',round(macro_assists_given,2),'strength',case when abs(macro_assists_given)>=0.5 then 'Strong' when abs(macro_assists_given)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Received vs Win Rate','value',round(macro_assists_received,2),'strength',case when abs(macro_assists_received)>=0.5 then 'Strong' when abs(macro_assists_received)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Early Lead vs Final Win','value',round(macro_early_lead,2),'strength',case when abs(macro_early_lead)>=0.5 then 'Strong' when abs(macro_early_lead)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(macro_assist_target_gap,2),'strength',case when abs(macro_assist_target_gap)>=0.5 then 'Strong' when abs(macro_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(macro_assist_leader_gap,2),'strength',case when abs(macro_assist_leader_gap)>=0.5 then 'Strong' when abs(macro_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(macro_assists_at_six_plus,2),'strength',case when abs(macro_assists_at_six_plus)>=0.5 then 'Strong' when abs(macro_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(macro_assists_over5_behind,2),'strength',case when abs(macro_assists_over5_behind)>=0.5 then 'Strong' when abs(macro_assists_over5_behind)>=0.25 then 'Moderate' else 'Light' end),
      jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(macro_assist_prestige_gained,2),'strength',case when abs(macro_assist_prestige_gained)>=0.5 then 'Strong' when abs(macro_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));

    -- Synergy pair scores across all player pairs in target's games
    with tg as (
      select g.id as game_id
      from public.games as g
      join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id
      where g.status='finished'
    ),
    pair_games as (
      select
        case when lgp.profile_id::text<rgp.profile_id::text then lgp.profile_id::text else rgp.profile_id::text end as a,
        case when lgp.profile_id::text<rgp.profile_id::text then rgp.profile_id::text else lgp.profile_id::text end as b,
        case when wgp.profile_id in (lgp.profile_id,rgp.profile_id) then 1 else 0 end as pair_won
      from public.game_participants as lgp
      join public.game_participants as rgp on rgp.game_id=lgp.game_id and lgp.profile_id is not null and rgp.profile_id is not null and lgp.profile_id::text<rgp.profile_id::text
      join tg on tg.game_id=lgp.game_id
      left join public.game_participants as wgp on wgp.game_id=lgp.game_id and wgp.is_winner
    ),
    pair_rollup as (
      select a, b, count(*)::int as games_together, coalesce(sum(pair_won),0)::int as wins_together
      from pair_games group by a, b
    ),
    assist_edges as (
      select
        case when src.profile_id::text<rec.profile_id::text then src.profile_id::text else rec.profile_id::text end as a,
        case when src.profile_id::text<rec.profile_id::text then rec.profile_id::text else src.profile_id::text end as b,
        sum(case when src.profile_id::text<rec.profile_id::text then coalesce(edge.value::numeric,0) else 0 end) as assist_ab,
        sum(case when src.profile_id::text<rec.profile_id::text then 0 else coalesce(edge.value::numeric,0) end) as assist_ba
      from public.game_rounds as gr
      join tg on tg.game_id=gr.game_id
      join public.game_participants as src on src.id=gr.participant_id
      join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key,value) on true
      join public.game_participants as rec on rec.game_id=gr.game_id and rec.profile_id::text=btrim(edge.key) and btrim(edge.key)!=''
      where src.profile_id is not null and rec.profile_id is not null and src.profile_id<>rec.profile_id
      group by 1, 2
    ),
    synergy_metrics as (
      select pr.a, pr.b, pr.games_together,
        coalesce(ae.assist_ab,0)+coalesce(ae.assist_ba,0) as total_assist,
        coalesce(ae.assist_ab,0)                          as assist_ab,
        coalesce(ae.assist_ba,0)                          as assist_ba,
        case when pr.games_together>0 then pr.wins_together::numeric/pr.games_together else 0 end as win_rate
      from pair_rollup as pr left join assist_edges as ae on ae.a=pr.a and ae.b=pr.b
      where pr.games_together >= 2
    )
    select coalesce(jsonb_agg(jsonb_build_object('a',sm.a,'b',sm.b,'score',round(sm.synergy_score,2)) order by sm.synergy_score desc, sm.games_together desc, sm.a, sm.b),'[]'::jsonb)
    into synergy_payload
    from (
      select a, b, games_together,
        total_assist*0.6+win_rate*20+case when total_assist>0 then (1-abs(assist_ab-assist_ba)/total_assist)*10 else 0 end+games_together*0.5 as synergy_score
      from synergy_metrics
      order by total_assist*0.6+win_rate*20+case when total_assist>0 then (1-abs(assist_ab-assist_ba)/total_assist)*10 else 0 end+games_together*0.5 desc
      limit 5
    ) as sm;

  end if;

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
    'insightsScreen',jsonb_build_object('generatedAt',generated_at,
      'meta',jsonb_build_object('games',finished_game_count,'playerRows',player_row_count),
      'topSignals',top_signals,
      'rivalries',head_to_head,
      'assistNetwork',jsonb_build_object('nodes','[]'::jsonb,'edges','[]'::jsonb),
      'correlations',jsonb_build_object(
        'summary',case when finished_game_count<2 then 'Need at least 2 games for insights.' else 'Outcome signals derived from your finished games.' end,
        'personal',personal_payload,
        'pairing',pairing_payload,
        'macro',macro_payload,
        'synergyPairs',synergy_payload,
        'players','[]'::jsonb,  -- populated live in get_insights_screen (viewer-context-dependent)
        'items',correlations_items,
        'selectedKey',null,
        'winLoseSplit',correlations_items)));

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


-- Backfill all rollups with the new insights correlation sections
do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;


-- #3 + #5: get_insights_screen simplified to pure rollup reader.
-- #3: target_game_ids array replaces 6 repeated target_games CTEs.
-- #5: no more live pairing/macro/personal/synergy queries — reads from rollup.
--     Only player_options remains live (viewer-context-dependent).
create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  viewer_profile_id uuid := auth.uid();
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  can_view_network  boolean := false;
  rollup_payload    jsonb;
  insights_payload  jsonb;
  target_game_ids   uuid[];
  finished_game_count integer := 0;
  player_row_count    integer := 0;
  player_options      jsonb   := '[]'::jsonb;
begin
  if viewer_profile_id is null then
    raise exception 'authenticated profile is required';
  end if;

  if target_profile_id <> viewer_profile_id then
    select exists (
      select 1 from public.games as g
      where g.status = 'finished'
        and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
        and exists (select 1 from public.game_participants as vgp where vgp.game_id=g.id and vgp.profile_id=viewer_profile_id)
    ) into can_view_network;
    if not can_view_network then
      raise exception 'profile_id must match the authenticated profile or a shared network player';
    end if;
  end if;

  -- #3: collect target game IDs once — replaces 6 repeated target_games CTEs.
  -- Uses the new partial index on games(created_at) WHERE status='finished'.
  select array_agg(g.id)
  into target_game_ids
  from public.games as g
  where g.status = 'finished'
    and exists (select 1 from public.game_participants as gp where gp.game_id=g.id and gp.profile_id=target_profile_id)
    and (target_profile_id = viewer_profile_id
         or exists (select 1 from public.game_participants as vgp where vgp.game_id=g.id and vgp.profile_id=viewer_profile_id));

  select count(distinct g.id)::int, count(*)::int
  into finished_game_count, player_row_count
  from public.game_participants as gp
  join public.games as g on g.id=gp.game_id
  where g.id = any(target_game_ids) and gp.profile_id=target_profile_id;

  -- player_options: who else appeared in the shared games (viewer-context-dependent, stays live)
  select coalesce(jsonb_agg(jsonb_build_object('id',np.profile_id,'label',np.label,'displayName',np.display_name,'playerName',np.player_name) order by np.label),'[]'::jsonb)
  into player_options
  from (
    select distinct on (gp.profile_id) gp.profile_id,
      coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,''),'Unknown Player') as label,
      nullif(gp.display_name_snapshot,'') as display_name,
      nullif(gp.player_name_snapshot,'') as player_name
    from public.game_participants as gp
    where gp.game_id = any(target_game_ids) and gp.profile_id is not null
    order by gp.profile_id, coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,'')) asc
  ) as np;

  -- #5: read correlations/rivalries/signals from rollup (no live queries)
  select psr.payload into rollup_payload
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_profile_id;

  if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
    insights_payload := rollup_payload->'insightsScreen';
  else
    insights_payload := jsonb_build_object(
      'generatedAt', now(),
      'meta',         jsonb_build_object('games',0,'playerRows',0),
      'topSignals',   '[]'::jsonb,
      'rivalries',    '[]'::jsonb,
      'assistNetwork',jsonb_build_object('nodes','[]'::jsonb,'edges','[]'::jsonb),
      'correlations', jsonb_build_object('summary','No insights available yet.','personal','[]'::jsonb,'pairing','[]'::jsonb,'macro','[]'::jsonb,'synergyPairs','[]'::jsonb,'players','[]'::jsonb,'items','[]'::jsonb,'selectedKey',null,'winLoseSplit','[]'::jsonb));
  end if;

  -- Overlay the live-computed fields
  insights_payload := insights_payload
    || jsonb_build_object('meta', jsonb_build_object('games',finished_game_count,'playerRows',player_row_count));
  insights_payload := jsonb_set(insights_payload, '{correlations,players}',    player_options,                       true);
  insights_payload := jsonb_set(insights_payload, '{correlations,selectedKey}',to_jsonb(target_profile_id::text),    true);

  return insights_payload;
end;
$$;
;
