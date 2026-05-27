
create or replace function private.admin_refresh_analytics(target_profile_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  generated_at timestamptz := now();
  registered_player_count integer := 0; player_row_count integer := 0;
  days_since_last_game integer := null; finished_game_count integer := 0;
  signal_win_count integer := 0; signal_avg_assists numeric := 0; signal_avg_failures numeric := 0;
  signal_contract_conversion numeric := 0; signal_win_rate numeric := 0;
  ps_avg_direct numeric := 0; ps_avg_assist_recv numeric := 0; ps_avg_objective numeric := 0;
  ps_avg_direct_win numeric := 0; ps_avg_assist_recv_win numeric := 0; ps_avg_objective_win numeric := 0;
  ps_avg_direct_lose numeric := 0; ps_avg_assist_recv_lose numeric := 0; ps_avg_objective_lose numeric := 0;
  ps_total numeric := 1; prestige_sources jsonb := '{}'::jsonb;
  corr_avg_obj_win numeric := 0; corr_avg_obj_lose numeric := 0;
  corr_avg_assists_win numeric := 0; corr_avg_assists_lose numeric := 0;
  corr_avg_failures_win numeric := 0; corr_avg_failures_lose numeric := 0;
  correlations_items jsonb := '[]'::jsonb;
  lifetime_score numeric := 0; lifetime_prestige numeric := 0;
  avg_score_win numeric := 0; avg_score_lose numeric := 0; avg_score_per_game numeric := 0;
  pace_avg_first_half numeric := 0; pace_avg_second_half numeric := 0; pace_avg_late_delta numeric := 0;
  pace_avg_first_half_win numeric := 0; pace_avg_first_half_lose numeric := 0;
  pace_avg_opening_turns numeric := 0; pace_avg_closing_turns numeric := 0;
  pace_avg_closing_turns_win numeric := 0; pace_avg_closing_turns_loss numeric := 0;
  avg_prestige_per_turn numeric := 0; avg_prestige_per_turn_win numeric := 0; avg_prestige_per_turn_loss numeric := 0;
  rps_prestige_early numeric := 0; rps_prestige_mid numeric := 0; rps_prestige_late numeric := 0;
  rps_contracts_early numeric := 0; rps_contracts_mid numeric := 0; rps_contracts_late numeric := 0;
  rps_failures_early numeric := 0; rps_failures_mid numeric := 0; rps_failures_late numeric := 0;
  rps_objectives_early numeric := 0; rps_objectives_mid numeric := 0; rps_objectives_late numeric := 0;
  rps_ppc_early numeric := 0; rps_ppc_mid numeric := 0; rps_ppc_late numeric := 0;
  round_phase_stats jsonb := '{}'::jsonb;
  consistency_zero_pct numeric := 0; consistency_zero_pct_win numeric := 0; consistency_best_round numeric := 0;
  consistency_profile jsonb := '{}'::jsonb; top_signals jsonb := '[]'::jsonb;
  seat_best_order integer := -1; seat_best_apps integer := 0; seat_best_win_pct numeric := 0;
  seat_worst_order integer := -1; seat_worst_apps integer := 0;
  streak_longest_win integer := 0; streak_longest_loss integer := 0;
  streak_current_is_win boolean := false; streak_current_len integer := 0;
  head_to_head jsonb := '[]'::jsonb; position_stats jsonb := '[]'::jsonb;
  game_history jsonb := '[]'::jsonb; player_count_split jsonb := '[]'::jsonb;
  ht_total integer := 0; ht_lead_count integer := 0; ht_lead_win_count integer := 0; ht_trail_win_count integer := 0;
  halftime_profile jsonb := '{}'::jsonb;
  session_profile_items jsonb := '[]'::jsonb;
  session_early_wr numeric := 0; session_late_wr numeric := 0;
  session_tendency text := 'Consistent'; session_profile jsonb := '{}'::jsonb;
  playstyle_label text := 'Direct-driven'; playstyle_summary text := ''; playstyle_highlights jsonb := '[]'::jsonb;
  player_options jsonb := '[]'::jsonb; player_detail jsonb := '{}'::jsonb;
  pairing_payload jsonb := '[]'::jsonb; macro_payload jsonb := '[]'::jsonb;
  personal_payload jsonb := '[]'::jsonb; synergy_payload jsonb := '[]'::jsonb;
  macro_contract_ratio numeric := 0; macro_assists_given numeric := 0;
  macro_assists_received numeric := 0; macro_early_lead numeric := 0;
  macro_assist_target_gap numeric := 0; macro_assist_leader_gap numeric := 0;
  macro_assists_at_six_plus numeric := 0; macro_assists_over5_behind numeric := 0; macro_assist_prestige_gained numeric := 0;
  personal_assist_target_gap numeric := 0; personal_assist_leader_gap numeric := 0;
  personal_assists_at_six_plus numeric := 0; personal_assists_over5_behind numeric := 0; personal_assist_prestige_gained numeric := 0;
  achievements_payload jsonb := '[]'::jsonb;
  assist_network_nodes jsonb := '[]'::jsonb; assist_network_edges jsonb := '[]'::jsonb;
  pb_best_prestige integer := 0; pb_best_score numeric := 0;
  pb_most_contracts integer := 0; pb_perfect_wins integer := 0; pb_best_group_name text := null;
  sc_session_count integer := 0; sc_avg_gap numeric := 0;
  sc_longest_gap integer := 0; sc_last_session_date date := null;
  mi_base_turns_per_game   numeric := 0; mi_base_rate             numeric := 0;
  mi_wr_with_base          numeric := 0; mi_wr_without_base       numeric := 0;
  mi_prestige_with_base    numeric := 0; mi_prestige_without_base numeric := 0;
  mi_games_with_obj        integer := 0; mi_high_obj_games        integer := 0;
  mi_wr_with_obj           numeric := 0; mi_wr_without_obj        numeric := 0;
  mi_prestige_with_obj     numeric := 0;
  mi_best_partner_id       uuid    := null; mi_best_partner_name     text    := null;
  mi_best_partner_winrate  numeric := 0;   mi_best_partner_games    integer := 0;
  mi_best_partner_prestige numeric := 0;
  mi_top_target_id         uuid    := null; mi_top_target_name       text    := null;
  mi_top_target_assists    integer := 0;   mi_top_target_games      integer := 0;
  mi_style_read            text    := 'Balanced'; mi_support_style text := 'Balanced';
  mi_assist_events         integer := 0;   mi_prestige_gained       numeric := 0;
  mi_best_condition        jsonb   := null; mi_worst_condition       jsonb  := null;
  analytics_payload jsonb;
  target_player_name text := null; target_display_name text := null;
begin
  select public.profiles.player_name, nullif(public.profiles.display_name,'')
  into target_player_name, target_display_name
  from public.profiles where public.profiles.id=target_profile_id;

  select count(*) into registered_player_count from public.profiles where deleted_at is null;
  select count(*) into player_row_count from public.game_participants where public.game_participants.profile_id=target_profile_id;

  select (extract(epoch from (now()-max(coalesce(g.finished_at,g.created_at))))/86400)::int
  into days_since_last_game
  from public.games as g join public.game_participants as gp on gp.game_id=g.id and gp.profile_id=target_profile_id
  where g.status='finished';

  select
    count(distinct gp.game_id)::int, count(*) filter (where gp.is_winner)::int,
    coalesce(avg(gp.assists),0)::numeric, coalesce(avg(gp.failures),0)::numeric,
    coalesce(sum(gp.contracts)::numeric/nullif(sum(gp.contracts+gp.failures),0),0)::numeric,
    coalesce(round(avg(gp.direct_prestige),2),0)::numeric, coalesce(round(avg(gp.assist_prestige_received),2),0)::numeric, coalesce(round(avg(gp.objective_prestige),2),0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.assist_prestige_received) filter (where gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.objective_prestige)       filter (where gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where not gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.assist_prestige_received) filter (where not gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.objective_prestige)       filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.assists)  filter (where gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.assists)  filter (where not gp.is_winner),2),0)::numeric,
    coalesce(round(avg(gp.failures) filter (where gp.is_winner),2),0)::numeric, coalesce(round(avg(gp.failures) filter (where not gp.is_winner),2),0)::numeric,
    coalesce(sum(gp.score),0)::numeric, coalesce(sum(gp.total_prestige),0)::numeric,
    coalesce(round(avg(gp.score) filter (where gp.is_winner),    1),0)::numeric,
    coalesce(round(avg(gp.score) filter (where not gp.is_winner),1),0)::numeric
  into
    finished_game_count, signal_win_count, signal_avg_assists, signal_avg_failures, signal_contract_conversion,
    ps_avg_direct, ps_avg_assist_recv, ps_avg_objective,
    ps_avg_direct_win, ps_avg_assist_recv_win, ps_avg_objective_win,
    ps_avg_direct_lose, ps_avg_assist_recv_lose, ps_avg_objective_lose,
    corr_avg_assists_win, corr_avg_assists_lose, corr_avg_failures_win, corr_avg_failures_lose,
    lifetime_score, lifetime_prestige, avg_score_win, avg_score_lose
  from public.game_participants as gp
  join public.games as g on g.id=gp.game_id and g.status='finished'
  where gp.profile_id=target_profile_id;

  signal_win_rate:=case when finished_game_count>0 then signal_win_count::numeric/finished_game_count else 0 end;
  corr_avg_obj_win:=ps_avg_objective_win; corr_avg_obj_lose:=ps_avg_objective_lose;
  ps_total:=greatest(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,0.01);
  avg_score_per_game:=coalesce(round(lifetime_score/nullif(finished_game_count,0),1),0);

  select coalesce(max(gp.total_prestige),0)::int, coalesce(max(gp.score),0)::numeric, coalesce(max(gp.contracts),0)::int, count(*) filter (where gp.failures=0 and gp.contracts>=3 and gp.is_winner)::int
  into pb_best_prestige, pb_best_score, pb_most_contracts, pb_perfect_wins
  from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id;
  select grp.name into pb_best_group_name from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' and g.group_id is not null join public.groups as grp on grp.id=g.group_id where gp.profile_id=target_profile_id group by grp.id,grp.name having count(*)>=2 order by count(*) filter (where gp.is_winner)::numeric/count(*) desc limit 1;

  select
    coalesce(round(avg(fp),1),0)::numeric, coalesce(round(avg(sp),1),0)::numeric, coalesce(round(avg(sp-fp),1),0)::numeric,
    coalesce(round(avg(fp) filter (where is_win),1),0)::numeric, coalesce(round(avg(fp) filter (where not is_win),1),0)::numeric,
    coalesce(round(sum(ep)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mp)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lp)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(ec)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mc)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lc)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(ef)::numeric/nullif(sum(er),0),2),0)::numeric, coalesce(round(sum(mf)::numeric/nullif(sum(mr),0),2),0)::numeric, coalesce(round(sum(lf)::numeric/nullif(sum(lr),0),2),0)::numeric,
    coalesce(round(sum(eo)::numeric/nullif(sum(er),0),3),0)::numeric, coalesce(round(sum(mo)::numeric/nullif(sum(mr),0),3),0)::numeric, coalesce(round(sum(lo)::numeric/nullif(sum(lr),0),3),0)::numeric,
    coalesce(round(avg(zero_r::numeric/nullif(er+mr+lr,0)*100.0),1),0)::numeric,
    coalesce(round(avg(zero_r::numeric/nullif(er+mr+lr,0)*100.0) filter (where is_win),1),0)::numeric,
    coalesce(max(peak_r),0)::numeric,
    coalesce(round(sum(ep)::numeric/nullif(sum(ec),0),3),0)::numeric, coalesce(round(sum(mp)::numeric/nullif(sum(mc),0),3),0)::numeric, coalesce(round(sum(lp)::numeric/nullif(sum(lc),0),3),0)::numeric
  into
    pace_avg_first_half, pace_avg_second_half, pace_avg_late_delta, pace_avg_first_half_win, pace_avg_first_half_lose,
    rps_prestige_early, rps_prestige_mid, rps_prestige_late,
    rps_contracts_early, rps_contracts_mid, rps_contracts_late,
    rps_failures_early, rps_failures_mid, rps_failures_late,
    rps_objectives_early, rps_objectives_mid, rps_objectives_late,
    consistency_zero_pct, consistency_zero_pct_win, consistency_best_round,
    rps_ppc_early, rps_ppc_mid, rps_ppc_late
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
    where gp.profile_id=target_profile_id group by gp.id, gp.is_winner
  ) as per_game;

  select
    coalesce(round(avg(opening_prestige),2),0)::numeric, coalesce(round(avg(closing_prestige),2),0)::numeric,
    coalesce(round(avg(closing_prestige) filter (where is_win),2),0)::numeric,
    coalesce(round(avg(closing_prestige) filter (where not is_win),2),0)::numeric,
    coalesce(round(avg(prestige_per_turn),3),0)::numeric,
    coalesce(round(avg(prestige_per_turn) filter (where is_win),3),0)::numeric,
    coalesce(round(avg(prestige_per_turn) filter (where not is_win),3),0)::numeric
  into pace_avg_opening_turns, pace_avg_closing_turns, pace_avg_closing_turns_win, pace_avg_closing_turns_loss,
       avg_prestige_per_turn, avg_prestige_per_turn_win, avg_prestige_per_turn_loss
  from (
    select gp.is_winner as is_win,
      sum(gr_r.prestige) filter (where gr_r.player_turn<=3) as opening_prestige,
      sum(gr_r.prestige) filter (where gr_r.player_turn>gr_r.total_turns-3) as closing_prestige,
      round(gp.total_prestige::numeric/nullif(count(gr_r.player_turn),0),3) as prestige_per_turn
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join (select participant_id, prestige, row_number() over (partition by participant_id order by round_index asc) as player_turn, count(*) over (partition by participant_id) as total_turns from public.game_rounds) as gr_r on gr_r.participant_id=gp.id
    where gp.profile_id=target_profile_id group by gp.id, gp.is_winner, gp.total_prestige
  ) as per_game;

  prestige_sources:=jsonb_build_object('avgDirect',ps_avg_direct,'avgAssistReceived',ps_avg_assist_recv,'avgObjective',ps_avg_objective,'directPct',round(100.0*ps_avg_direct/ps_total,1),'assistReceivedPct',round(100.0*ps_avg_assist_recv/ps_total,1),'objectivePct',round(100.0*ps_avg_objective/ps_total,1),'whenWin',jsonb_build_object('avgDirect',ps_avg_direct_win,'avgAssistReceived',ps_avg_assist_recv_win,'avgObjective',ps_avg_objective_win),'whenLose',jsonb_build_object('avgDirect',ps_avg_direct_lose,'avgAssistReceived',ps_avg_assist_recv_lose,'avgObjective',ps_avg_objective_lose),'description',case when finished_game_count=0 then 'No games yet.' else concat(round(100.0*ps_avg_direct/ps_total,0)::int::text,'% direct, ',round(100.0*ps_avg_assist_recv/ps_total,0)::int::text,'% assist-received, ',round(100.0*ps_avg_objective/ps_total,0)::int::text,'% objective.') end);
  round_phase_stats:=jsonb_build_object('early',jsonb_build_object('label','Early (rounds 0-6)','avgPrestigePerRound',rps_prestige_early,'avgContractsPerRound',rps_contracts_early,'avgFailuresPerRound',rps_failures_early,'avgObjectivesPerRound',rps_objectives_early,'prestigePerContract',rps_ppc_early),'mid',jsonb_build_object('label','Mid (rounds 7-14)','avgPrestigePerRound',rps_prestige_mid,'avgContractsPerRound',rps_contracts_mid,'avgFailuresPerRound',rps_failures_mid,'avgObjectivesPerRound',rps_objectives_mid,'prestigePerContract',rps_ppc_mid),'late',jsonb_build_object('label','Late (rounds 15+)','avgPrestigePerRound',rps_prestige_late,'avgContractsPerRound',rps_contracts_late,'avgFailuresPerRound',rps_failures_late,'avgObjectivesPerRound',rps_objectives_late,'prestigePerContract',rps_ppc_late));
  consistency_profile:=jsonb_build_object('scoringRoundPct',round(100.0-consistency_zero_pct,1),'zeroRoundPct',consistency_zero_pct,'zeroRoundPctWin',consistency_zero_pct_win,'bestSingleRound',consistency_best_round,'description',case when finished_game_count=0 then 'No games yet.' else concat(round(100.0-consistency_zero_pct,0)::int::text,'% of rounds score prestige (best single round: ',consistency_best_round::text,').') end);

  if finished_game_count>0 then
    playstyle_label:=case when ps_avg_assist_recv/ps_total>=0.12 then 'Support-oriented' when ps_avg_objective/ps_total>=0.15 then 'Objective-focused' when signal_contract_conversion>=0.85 then 'Contract specialist' when signal_win_rate>=0.55 then 'Well-rounded winner' else 'Direct-driven' end;
    playstyle_summary:=concat(playstyle_label,' across ',finished_game_count::text,' game',case when finished_game_count=1 then '' else 's' end,'. ',round(100.0*ps_avg_direct/ps_total,0)::int::text,'% direct, ',round(100.0*ps_avg_assist_recv/ps_total,0)::int::text,'% assist-received, ',round(100.0*ps_avg_objective/ps_total,0)::int::text,'% objective. Contract conversion: ',round(signal_contract_conversion*100,0)::int::text,'%. Win rate: ',round(signal_win_rate*100,0)::int::text,'%.');
    playstyle_highlights:=jsonb_build_array(jsonb_build_object('key','win-rate','label','Win rate','value',concat(round(signal_win_rate*100),'%')),jsonb_build_object('key','direct-prestige-per-game','label','Direct prestige / game','value',round(ps_avg_direct,1)),jsonb_build_object('key','assists-per-game','label','Assists / game','value',round(signal_avg_assists,1)),jsonb_build_object('key','objective-share','label','Objective share','value',concat(round(100.0*ps_avg_objective/ps_total,0)::int,'%')));
    mi_style_read:=case when ps_avg_direct>=ps_avg_assist_recv+0.75 and ps_avg_direct>=ps_avg_objective+0.75 then 'Direct' when ps_avg_assist_recv>=ps_avg_direct+0.75 and ps_avg_assist_recv>=ps_avg_objective+0.75 then 'Support' when ps_avg_objective>=ps_avg_direct+0.75 and ps_avg_objective>=ps_avg_assist_recv+0.75 then 'Objective' else 'Balanced' end;
    mi_support_style:=case when signal_avg_assists-ps_avg_assist_recv>=0.5 then 'Giver' when ps_avg_assist_recv-signal_avg_assists>=0.5 then 'Receiver' else 'Balanced' end;
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
    select start_order, appearances, round(wins::numeric/appearances,3) into seat_best_order, seat_best_apps, seat_best_win_pct
    from (select gp.start_order,count(*)::int as appearances,count(*) filter (where gp.is_winner)::int as wins from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id group by gp.start_order having count(*)>=3) as seat_data
    order by wins::numeric/appearances desc limit 1;
    if seat_best_order>=0 and seat_best_win_pct>=0.60 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','strong-seat','label',concat('Dominant from seat ',seat_best_order::text),'value',concat(round(seat_best_win_pct*100)::int::text,'% win rate (',seat_best_apps::text,' games)'),'tone','blue')); end if;
    select start_order, appearances into seat_worst_order, seat_worst_apps from (select gp.start_order,count(*)::int as appearances,count(*) filter (where gp.is_winner)::int as wins from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id group by gp.start_order having count(*)>=3 and count(*) filter (where gp.is_winner)=0 limit 1) as sd;
    if seat_worst_order>=0 then top_signals:=top_signals||jsonb_build_array(jsonb_build_object('key','weak-seat','label',concat('0 wins from seat ',seat_worst_order::text),'value',concat(seat_worst_apps::text,' games, 0% win rate'),'tone','danger')); end if;
  end if;

  if finished_game_count>=3 then
    correlations_items:=jsonb_build_array(
      jsonb_build_object('key','objectives-vs-wins','label','Objective prestige','whenWin',corr_avg_obj_win,'whenLose',corr_avg_obj_lose,'delta',round(corr_avg_obj_win-corr_avg_obj_lose,2),'direction',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then 'positive' when corr_avg_obj_win<corr_avg_obj_lose-0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then concat('Avg ',corr_avg_obj_win::text,' in wins vs ',corr_avg_obj_lose::text,' in losses') when corr_avg_obj_win<corr_avg_obj_lose-0.1 then concat('More objectives in losses (',corr_avg_obj_lose::text,') than wins (',corr_avg_obj_win::text,')') else 'No meaningful difference' end),
      jsonb_build_object('key','assists-vs-wins','label','Assists','whenWin',corr_avg_assists_win,'whenLose',corr_avg_assists_lose,'delta',round(corr_avg_assists_win-corr_avg_assists_lose,2),'direction',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then 'positive' when corr_avg_assists_win<corr_avg_assists_lose-0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then concat('More assists in wins (',corr_avg_assists_win::text,')') when corr_avg_assists_win<corr_avg_assists_lose-0.1 then concat('Fewer assists when winning (',corr_avg_assists_win::text,')') else 'No meaningful difference' end),
      jsonb_build_object('key','failures-vs-wins','label','Failures','whenWin',corr_avg_failures_win,'whenLose',corr_avg_failures_lose,'delta',round(corr_avg_failures_win-corr_avg_failures_lose,2),'direction',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then 'positive' when corr_avg_failures_win>corr_avg_failures_lose+0.1 then 'negative' else 'neutral' end,'description',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then concat('Fewer failures when winning (',corr_avg_failures_win::text,' vs ',corr_avg_failures_lose::text,')') when corr_avg_failures_win>corr_avg_failures_lose+0.1 then 'More failures in wins than losses' else 'No meaningful difference' end),
      jsonb_build_object('key','score-vs-wins','label','Score','whenWin',avg_score_win,'whenLose',avg_score_lose,'delta',round(avg_score_win-avg_score_lose,2),'direction',case when avg_score_win>avg_score_lose+2 then 'positive' when avg_score_win<avg_score_lose-2 then 'negative' else 'neutral' end,'description',case when avg_score_win>avg_score_lose+2 then concat('Higher score in wins (avg ',avg_score_win::text,' vs ',avg_score_lose::text,' in losses)') when avg_score_win<avg_score_lose-2 then concat('No scoring advantage in wins (',avg_score_win::text,' vs ',avg_score_lose::text,')') else 'No meaningful score difference between wins and losses' end));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('opponentId',opponent_id,'opponentName',opponent_name,'gamesTogether',games_together,'wins',wins,'losses',losses,'draws',games_together-wins-losses,'avgPrestigeMargin',avg_margin,'avgWinMargin',avg_win_margin,'lastResult',last_result,'lastPlayedAt',last_played_at) order by games_together desc,opponent_name asc),'[]'::jsonb) into head_to_head
  from (select other_p.id as opponent_id,coalesce(nullif(other_p.display_name,''),other_p.player_name,'Player') as opponent_name,count(distinct g.id)::int as games_together,count(distinct g.id) filter (where g.winner_profile_id=target_profile_id)::int as wins,count(distinct g.id) filter (where g.winner_profile_id=other_p.id)::int as losses,round(avg(gpb.total_prestige-gpa.total_prestige),1) as avg_margin,round(avg(gpb.total_prestige-gpa.total_prestige) filter (where g.winner_profile_id=target_profile_id),1) as avg_win_margin,(array_agg(case when g.winner_profile_id=target_profile_id then 'W' when g.winner_profile_id=other_p.id then 'L' else 'D' end order by coalesce(g.finished_at,g.created_at) desc))[1] as last_result,max(coalesce(g.finished_at,g.created_at)) as last_played_at from public.profiles as other_p join public.game_participants as gpa on gpa.profile_id=other_p.id join public.game_participants as gpb on gpb.game_id=gpa.game_id and gpb.profile_id=target_profile_id join public.games as g on g.id=gpa.game_id and g.status='finished' where other_p.id<>target_profile_id and other_p.deleted_at is null group by other_p.id,other_p.display_name,other_p.player_name) as h;

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

  with game_sessions as (select gp.is_winner as gp_is_winner,gp.total_prestige as gp_prestige,row_number() over (partition by date(coalesce(g.finished_at,g.created_at)) order by coalesce(g.finished_at,g.created_at),g.id) as pos from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id),
  position_agg as (select pos,count(*)::int as appearances,count(*) filter (where gp_is_winner)::int as wins,round(avg(gp_prestige),1) as avg_prestige from game_sessions group by pos)
  select coalesce(jsonb_agg(jsonb_build_object('gameNumber',pos,'appearances',appearances,'wins',wins,'winRate',case when appearances>0 then round(wins::numeric/appearances,3) else 0::numeric end,'avgPrestige',avg_prestige) order by pos),'[]'::jsonb),coalesce(round(sum(wins) filter (where pos<=2)::numeric/nullif(sum(appearances) filter (where pos<=2),0),3),0)::numeric,coalesce(round(sum(wins) filter (where pos>=3)::numeric/nullif(sum(appearances) filter (where pos>=3),0),3),0)::numeric
  into session_profile_items,session_early_wr,session_late_wr from position_agg;
  session_tendency:=case when session_late_wr>session_early_wr+0.15 then 'Warms up' when session_early_wr>session_late_wr+0.15 then 'Fades late' else 'Consistent' end;
  session_profile:=jsonb_build_object('items',session_profile_items,'tendency',session_tendency,'earlyWinRate',session_early_wr,'lateWinRate',session_late_wr,'description',case when finished_game_count=0 then 'No games yet.' when session_tendency='Warms up' then concat('Performs better as sessions progress (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') when session_tendency='Fades late' then concat('Performance declines through sessions (game 1-2: ',round(session_early_wr*100,0)::int::text,'% -> game 3+: ',round(session_late_wr*100,0)::int::text,'% win rate).') else 'Win rate is consistent across games within a session.' end);

  with sessions as (select date(coalesce(g.finished_at,g.created_at)) as sd from public.games as g join public.game_participants as gp on gp.game_id=g.id and gp.profile_id=target_profile_id where g.status='finished' group by date(coalesce(g.finished_at,g.created_at))),
  gaps as (select sd,sd-lag(sd) over (order by sd) as gap_days from sessions)
  select count(*)::int,round(avg(gap_days)::numeric,1),coalesce(max(gap_days)::int,0),max(sd)
  into sc_session_count,sc_avg_gap,sc_longest_gap,sc_last_session_date from gaps;

  -- #5: Extended game history with players array + game-level fields
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',game_id,'gameId',game_id,'finishedAt',finished_at,'createdAt',row_created_at,
    'groupId',group_id,'groupName',group_name,'playerCount',player_count,
    'isWinner',is_winner,'prestige',row_prestige,'score',row_score,'prestigeSpread',prestige_spread,
    'winnerName',winner_name,'winnerId',winner_id,
    'assists',assists,'failures',failures,'contracts',contracts,
    'players',players
  ) order by finished_at desc,game_id desc),'[]'::jsonb)
  into game_history
  from (
    select g.id as game_id, coalesce(g.finished_at,g.created_at) as finished_at,
      g.created_at as row_created_at, g.group_id, g.winner_profile_id as winner_id,
      g.group_name_snapshot as group_name, ga.player_count, ga.prestige_spread, ga.players,
      gp.is_winner, gp.total_prestige as row_prestige, gp.score as row_score,
      gp.assists, gp.failures, gp.contracts,
      coalesce(nullif(wp.display_name,''),wp.player_name,'Unknown') as winner_name
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.profiles as wp on wp.id=g.winner_profile_id
    join lateral (
      select count(*)::int as player_count, (max(a.total_prestige)-min(a.total_prestige))::int as prestige_spread,
        coalesce(jsonb_agg(jsonb_build_object(
          'id',a.profile_id,'profileId',a.profile_id,
          'name',coalesce(nullif(a.display_name_snapshot,''),a.player_name_snapshot,'Player'),
          'color',a.color_snapshot,'assignedCardArtIndex',a.assigned_card_art_index_snapshot,
          'startOrder',a.start_order,'isWinner',a.is_winner,'totalPrestige',a.total_prestige
        ) order by a.start_order asc),'[]'::jsonb) as players
      from public.game_participants as a where a.game_id=g.id
    ) as ga on true
    where gp.profile_id=target_profile_id
    order by coalesce(g.finished_at,g.created_at) desc, g.id desc limit 50
  ) as gd;

  player_options:=jsonb_build_array(jsonb_build_object('id',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'playerName',target_player_name,'displayName',target_display_name));
  player_detail:=jsonb_build_object('playerId',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'summary',case when finished_game_count>0 then concat('Server-authored player detail across ',finished_game_count::text,' finished game',case when finished_game_count=1 then '' else 's' end,'.') else 'No finished games are available for this player yet.' end,'stats',jsonb_build_object('games',finished_game_count,'wins',signal_win_count,'winRate',concat(round(signal_win_rate*100),'%'),'playerRows',player_row_count,'avgPrestige',round(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,1),'contractConversion',concat(round(signal_contract_conversion*100),'%'),'totalScore',lifetime_score,'totalPrestige',lifetime_prestige,'avgScore',avg_score_per_game,'scoreDescription','Score tracks cumulative round performance across the full game. Unlike prestige (your final tally), score reflects how many turns you actively scored — a high score with low prestige means consistent but small contributions.','prestigePerTurn',avg_prestige_per_turn,'prestigePerTurnWin',avg_prestige_per_turn_win,'prestigePerTurnLoss',avg_prestige_per_turn_loss,'prestigePerTurnDescription','Prestige scored per turn taken. Adjusts for game length and player count — a higher value means more efficient play regardless of how long the game ran.'));

  if finished_game_count>0 then
    with base_games as (select gp.game_id,gp.is_winner,gp.failures,gp.assists,gp.total_prestige,gp.score,coalesce(g.finished_at,g.created_at) as finished_at,(select max(gp2.total_prestige) from public.game_participants as gp2 where gp2.game_id=gp.game_id and not gp2.is_winner) as second_prestige from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id),
    streak_tagged as (select is_winner,finished_at,game_id,row_number() over (order by finished_at asc,game_id asc)-row_number() over (partition by is_winner order by finished_at asc,game_id asc) as grp from base_games),
    win_streaks as (select count(*)::int as streak_len,max(finished_at) as streak_end from streak_tagged where is_winner group by grp),
    comeback_games as (select bg.game_id,bg.finished_at from base_games as bg where bg.is_winner and (select coalesce(sum(gr.prestige) filter (where gr.round_index<mri.max_ri/2.0),0) from public.game_participants as my_gp join public.game_rounds as gr on gr.participant_id=my_gp.id join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=my_gp.id) as mri on true where my_gp.game_id=bg.game_id and my_gp.profile_id=target_profile_id)<coalesce((select max(opp_half) from (select coalesce(sum(gr2.prestige) filter (where gr2.round_index<mri2.max_ri/2.0),0) as opp_half from public.game_participants as opp_gp join public.game_rounds as gr2 on gr2.participant_id=opp_gp.id join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=opp_gp.id) as mri2 on true where opp_gp.game_id=bg.game_id and opp_gp.profile_id is not null and opp_gp.profile_id!=target_profile_id group by opp_gp.id) as oh),0)),
    ach_raw as (
      select 'first_win'::text as key,'First Victory'::text as label,'Won your first tracked game.'::text as description,min(finished_at) as earned_at,null::numeric as value from base_games where is_winner having count(*) filter (where is_winner)>0
      union all select 'perfect_win','Flawless Win','Won a game without a single failure.',min(finished_at) filter (where is_winner and failures=0),null from base_games having count(*) filter (where is_winner and failures=0)>0
      union all select 'dominant_win','Dominant Victory','Won a game by 5 or more prestige.',min(finished_at) filter (where is_winner and (total_prestige-coalesce(second_prestige,0))>=5),null from base_games having count(*) filter (where is_winner and (total_prestige-coalesce(second_prestige,0))>=5)>0
      union all select 'nail_biter','Nail-Biter','Won a game by exactly 1 prestige.',min(finished_at) filter (where is_winner and (total_prestige-coalesce(second_prestige,0))=1),null from base_games having count(*) filter (where is_winner and (total_prestige-coalesce(second_prestige,0))=1)>0
      union all select 'high_scorer','High Scorer','Scored 50 or more points in a single game.',min(finished_at) filter (where score>=50),max(score) filter (where score>=50) from base_games having count(*) filter (where score>=50)>0
      union all select 'assist_master','Assist Master','Recorded 3 or more assists in a single game.',min(finished_at) filter (where assists>=3),max(assists) filter (where assists>=3)::numeric from base_games having count(*) filter (where assists>=3)>0
      union all select 'win_streak_3','Hot Streak','Won 3 games in a row.',min(streak_end) filter (where streak_len>=3),max(streak_len) filter (where streak_len>=3)::numeric from win_streaks having count(*) filter (where streak_len>=3)>0
      union all select 'win_streak_5','On Fire','Won 5 games in a row.',min(streak_end) filter (where streak_len>=5),max(streak_len) filter (where streak_len>=5)::numeric from win_streaks having count(*) filter (where streak_len>=5)>0
      union all select 'comeback_win','Comeback Kid','Won a game after trailing at halftime.',min(finished_at),null from comeback_games having count(*)>0
    )
    select coalesce(jsonb_agg(jsonb_build_object('key',key,'label',label,'description',description,'earnedAt',earned_at,'value',value) order by earned_at asc),'[]'::jsonb)
    into achievements_payload from ach_raw;

    -- #1: moonrakersIntel base discipline + objective profile
    select
      coalesce(round(avg(base_turns::numeric),2),0)::numeric,
      coalesce(round(sum(base_turns)::numeric/nullif(sum(total_turns),0),3),0)::numeric,
      coalesce(round(avg(is_win::int) filter (where base_turns>0),3),0)::numeric,
      coalesce(round(avg(is_win::int) filter (where base_turns=0),3),0)::numeric,
      coalesce(round(avg(row_prestige) filter (where base_turns>0),1),0)::numeric,
      coalesce(round(avg(row_prestige) filter (where base_turns=0),1),0)::numeric,
      count(*) filter (where obj_prestige>0)::int,
      count(*) filter (where obj_prestige>=2)::int,
      coalesce(round(avg(is_win::int) filter (where obj_prestige>0),3),0)::numeric,
      coalesce(round(avg(is_win::int) filter (where obj_prestige=0),3),0)::numeric,
      coalesce(round(avg(row_prestige) filter (where obj_prestige>0),1),0)::numeric
    into mi_base_turns_per_game,mi_base_rate,mi_wr_with_base,mi_wr_without_base,mi_prestige_with_base,mi_prestige_without_base,
         mi_games_with_obj,mi_high_obj_games,mi_wr_with_obj,mi_wr_without_obj,mi_prestige_with_obj
    from (
      select gp.is_winner::int as is_win, gp.total_prestige as row_prestige, gp.objective_prestige as obj_prestige,
        count(*) filter (where gr.contracts=0 and gr.failures=0 and gr.objective_count=0 and gr.objective_prestige=0)::int as base_turns,
        count(*)::int as total_turns
      from public.game_participants as gp
      join public.games as g on g.id=gp.game_id and g.status='finished'
      join public.game_rounds as gr on gr.participant_id=gp.id
      where gp.profile_id=target_profile_id
      group by gp.id, gp.is_winner, gp.total_prestige, gp.objective_prestige
    ) as bd;

    -- Best support partner
    select p.id, coalesce(nullif(p.display_name,''),p.player_name,'Player'), count(distinct g.id)::int,
      round(count(distinct g.id) filter (where g.winner_profile_id=target_profile_id)::numeric/count(distinct g.id),3),
      round(avg(gp.total_prestige),1)
    into mi_best_partner_id,mi_best_partner_name,mi_best_partner_games,mi_best_partner_winrate,mi_best_partner_prestige
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_participants as opp_gp on opp_gp.game_id=g.id and opp_gp.profile_id!=target_profile_id and opp_gp.profile_id is not null
    join public.profiles as p on p.id=opp_gp.profile_id and p.deleted_at is null
    where gp.profile_id=target_profile_id
    group by p.id,p.display_name,p.player_name
    having count(distinct g.id)>=3
    order by round(count(distinct g.id) filter (where g.winner_profile_id=target_profile_id)::numeric/count(distinct g.id),3) desc,
             round(avg(gp.total_prestige),1) desc limit 1;

    -- Most common assist target
    select rec_gp.profile_id, coalesce(nullif(p.display_name,''),p.player_name,'Player'),
      sum((edge.v)::int)::int, count(distinct gr.game_id)::int
    into mi_top_target_id,mi_top_target_name,mi_top_target_assists,mi_top_target_games
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_rounds as gr on gr.participant_id=gp.id
    join lateral jsonb_each_text(gr.assist_recipients) as edge(k,v) on true
    join public.game_participants as rec_gp on rec_gp.game_id=g.id and rec_gp.profile_id::text=btrim(edge.k)
    join public.profiles as p on p.id=rec_gp.profile_id
    where gp.profile_id=target_profile_id and btrim(edge.k)!='' and (edge.v)::int>0 and rec_gp.profile_id is not null
    group by rec_gp.profile_id,p.display_name,p.player_name
    order by sum((edge.v)::int) desc limit 1;

    -- Assist events + prestige gained (fixed: p_edge.k not p_edge.key)
    select coalesce(sum((edge.v)::int),0)::int, coalesce(sum((p_edge.v)::numeric),0)::numeric
    into mi_assist_events, mi_prestige_gained
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_rounds as gr on gr.participant_id=gp.id
    join lateral jsonb_each_text(gr.assist_recipients) as edge(k,v) on true
    left join lateral jsonb_each_text(gr.assist_prestige_recipients) as p_edge(k,v) on p_edge.k=edge.k
    where gp.profile_id=target_profile_id and btrim(edge.k)!='' and (edge.v)::int>0;

    -- Best/worst condition
    with condition_data as (
      select format('in %sp', pc.player_count) as label, count(*)::int as n,
        round(count(*) filter (where gp.is_winner)::numeric/count(*),3) as wr, round(avg(gp.total_prestige),1) as ap
      from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished'
      join lateral (select count(*)::int as player_count from public.game_participants where game_id=g.id) as pc on true
      where gp.profile_id=target_profile_id group by pc.player_count having count(*)>=3
      union all
      select case when gp.start_order=0 then 'from Early Seat' when gp.start_order>=2 then 'from Late Seat' else 'from Middle Seat' end,
        count(*)::int, round(count(*) filter (where gp.is_winner)::numeric/count(*),3), round(avg(gp.total_prestige),1)
      from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished'
      where gp.profile_id=target_profile_id group by 1 having count(*)>=3
    )
    select
      (select jsonb_build_object('label',label,'winRate',wr,'avgPrestige',ap,'sampleSize',n) from condition_data order by wr desc,ap desc limit 1),
      (select jsonb_build_object('label',label,'winRate',wr,'avgPrestige',ap,'sampleSize',n) from condition_data order by wr asc,ap asc limit 1)
    into mi_best_condition, mi_worst_condition;
  end if;

  if finished_game_count>=2 then
    select coalesce(jsonb_agg(jsonb_build_object('label',format('With %s vs win rate',p.label),'value',round(p.corr_value,2),'strength',case when abs(p.corr_value)>=0.5 then 'Strong' when abs(p.corr_value)>=0.25 then 'Moderate' else 'Light' end) order by abs(p.corr_value) desc,p.games_together desc,p.label),'[]'::jsonb) into pairing_payload
    from (select np.label,coalesce(corr(case when paired.profile_id is null then 0::double precision else 1::double precision end,case when tg.target_won then 1::double precision else 0::double precision end)::numeric,0) as corr_value,count(paired.profile_id)::int as games_together from (select distinct on (gp.profile_id) gp.profile_id,coalesce(nullif(gp.display_name_snapshot,''),nullif(gp.player_name_snapshot,''),'Unknown') as label from public.game_participants as gp join public.game_participants as my_gp on my_gp.game_id=gp.game_id and my_gp.profile_id=target_profile_id join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id is not null and gp.profile_id<>target_profile_id order by gp.profile_id,label) as np cross join (select g.id as game_id,exists(select 1 from public.game_participants as wgp where wgp.game_id=g.id and wgp.profile_id=target_profile_id and wgp.is_winner) as target_won from public.games as g join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id where g.status='finished') as tg left join public.game_participants as paired on paired.game_id=tg.game_id and paired.profile_id=np.profile_id group by np.profile_id,np.label having count(paired.profile_id)>=2 order by abs(coalesce(corr(case when paired.profile_id is null then 0::double precision else 1::double precision end,case when tg.target_won then 1::double precision else 0::double precision end)::numeric,0)) desc limit 6) as p;

    with tg as (select g.id as game_id from public.games as g join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id where g.status='finished'),
    round_zero_leaders as (select gr.game_id,gp.profile_id,case when gr.prestige=max(gr.prestige) over (partition by gr.game_id) and gr.prestige>0 then 1 else 0 end as early_lead from public.game_rounds as gr join public.game_participants as gp on gp.id=gr.participant_id join tg on tg.game_id=gr.game_id where gr.round_index=0 and gp.profile_id is not null),
    macro_samples as (select gp.contracts,gp.failures,gp.assists,gp.assist_prestige_received,gp.is_winner,coalesce(rzl.early_lead,0) as early_lead from public.game_participants as gp join tg on tg.game_id=gp.game_id left join round_zero_leaders as rzl on rzl.game_id=gp.game_id and rzl.profile_id=gp.profile_id where gp.profile_id is not null)
    select coalesce(corr(ms.contracts::double precision/greatest(ms.failures,1)::double precision,case when ms.is_winner then 1::double precision else 0::double precision end)::numeric,0),coalesce(corr(ms.assists::double precision,case when ms.is_winner then 1::double precision else 0::double precision end)::numeric,0),coalesce(corr(ms.assist_prestige_received::double precision,case when ms.is_winner then 1::double precision else 0::double precision end)::numeric,0),coalesce(corr(ms.early_lead::double precision,case when ms.is_winner then 1::double precision else 0::double precision end)::numeric,0)
    into macro_contract_ratio,macro_assists_given,macro_assists_received,macro_early_lead from macro_samples as ms;

    with tg as (select g.id as game_id from public.games as g join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id where g.status='finished'),
    game_profiles as (select gp.game_id,gp.profile_id from public.game_participants as gp join tg on tg.game_id=gp.game_id where gp.profile_id is not null),
    tracked_rounds as (select gr.game_id,gr.round_index,gp.profile_id as target_player_id,coalesce(gr.prestige,0)::numeric as round_prestige,gr.assist_recipients,gr.assist_prestige_recipients from public.game_rounds as gr join public.game_participants as gp on gp.id=gr.participant_id join tg on tg.game_id=gr.game_id where gp.profile_id is not null),
    round_prestige_deltas as (select tr.game_id,tr.round_index,tr.target_player_id as profile_id,tr.round_prestige as prestige_delta from tracked_rounds as tr union all select tr.game_id,tr.round_index,gp2.profile_id,greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key,'')::numeric,0),0)::numeric from tracked_rounds as tr join lateral jsonb_each_text(tr.assist_prestige_recipients) as edge(key,value) on true join game_profiles as gp2 on gp2.game_id=tr.game_id and gp2.profile_id::text=btrim(edge.key) where btrim(edge.key)<>''),
    prestige_before as (select tr.game_id,tr.round_index,gp2.profile_id,coalesce(sum(prev.prestige_delta),0)::numeric as pbr from tracked_rounds as tr join game_profiles as gp2 on gp2.game_id=tr.game_id left join round_prestige_deltas as prev on prev.game_id=tr.game_id and prev.profile_id=gp2.profile_id and prev.round_index<tr.round_index group by tr.game_id,tr.round_index,gp2.profile_id),
    leader_state as (select pb.game_id,pb.round_index,max(pb.pbr) as leader_prestige from prestige_before as pb group by pb.game_id,pb.round_index),
    assist_events as (select tr.game_id,gp2.profile_id as player_id,tr.target_player_id,abs(h_state.pbr-t_state.pbr)::numeric as gap_to_target,(ls.leader_prestige-h_state.pbr)::numeric as gap_to_leader,case when h_state.pbr>=6 then 1 else 0 end as assist_at_six_plus,case when (ls.leader_prestige-h_state.pbr)>5 then 1 else 0 end as assist_over_five_behind,(greatest(coalesce(nullif(tr.assist_prestige_recipients->>edge.key,'')::numeric,0),0)/greatest(edge.value::numeric,1))::numeric as assist_prestige_gained from tracked_rounds as tr join prestige_before as t_state on t_state.game_id=tr.game_id and t_state.round_index=tr.round_index and t_state.profile_id=tr.target_player_id join leader_state as ls on ls.game_id=tr.game_id and ls.round_index=tr.round_index join lateral jsonb_each_text(tr.assist_recipients) as edge(key,value) on true join game_profiles as gp2 on gp2.game_id=tr.game_id and gp2.profile_id::text=btrim(edge.key) join prestige_before as h_state on h_state.game_id=tr.game_id and h_state.round_index=tr.round_index and h_state.profile_id=gp2.profile_id join lateral generate_series(1,greatest(edge.value::int,0)) as rep(idx) on true where btrim(edge.key)<>'' and edge.value::int>0),
    assist_context_samples as (select gp2.game_id,gp2.profile_id,count(ae.player_id)::int as assist_count,case when count(ae.player_id)>0 then avg(ae.gap_to_target)::numeric else null end as avg_gap_to_target,case when count(ae.player_id)>0 then avg(ae.gap_to_leader)::numeric else null end as avg_gap_to_leader,coalesce(sum(ae.assist_at_six_plus),0)::int as assists_at_six_plus,coalesce(sum(ae.assist_over_five_behind),0)::int as assists_over_five_behind,coalesce(sum(ae.assist_prestige_gained),0)::numeric as assist_prestige_gained,case when winner_gp.profile_id=gp2.profile_id then 1::double precision else 0::double precision end as victory from game_profiles as gp2 left join assist_events as ae on ae.game_id=gp2.game_id and ae.player_id=gp2.profile_id left join public.game_participants as winner_gp on winner_gp.game_id=gp2.game_id and winner_gp.is_winner group by gp2.game_id,gp2.profile_id,winner_gp.profile_id)
    select
      coalesce((select corr(acs.avg_gap_to_target::double precision,acs.victory) from assist_context_samples as acs where acs.avg_gap_to_target is not null)::numeric,0),coalesce((select corr(acs.avg_gap_to_leader::double precision,acs.victory) from assist_context_samples as acs where acs.avg_gap_to_leader is not null)::numeric,0),coalesce((select corr(acs.assists_at_six_plus::double precision,acs.victory) from assist_context_samples as acs)::numeric,0),coalesce((select corr(acs.assists_over_five_behind::double precision,acs.victory) from assist_context_samples as acs)::numeric,0),coalesce((select corr(acs.assist_prestige_gained::double precision,acs.victory) from assist_context_samples as acs)::numeric,0),
      coalesce((select corr(acs.avg_gap_to_target::double precision,acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id and acs.avg_gap_to_target is not null)::numeric,0),coalesce((select corr(acs.avg_gap_to_leader::double precision,acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id and acs.avg_gap_to_leader is not null)::numeric,0),coalesce((select corr(acs.assists_at_six_plus::double precision,acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric,0),coalesce((select corr(acs.assists_over_five_behind::double precision,acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric,0),coalesce((select corr(acs.assist_prestige_gained::double precision,acs.victory) from assist_context_samples as acs where acs.profile_id=target_profile_id)::numeric,0)
    into macro_assist_target_gap,macro_assist_leader_gap,macro_assists_at_six_plus,macro_assists_over5_behind,macro_assist_prestige_gained,
         personal_assist_target_gap,personal_assist_leader_gap,personal_assists_at_six_plus,personal_assists_over5_behind,personal_assist_prestige_gained;

    personal_payload:=jsonb_build_array(jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(personal_assist_target_gap,2),'strength',case when abs(personal_assist_target_gap)>=0.5 then 'Strong' when abs(personal_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(personal_assist_leader_gap,2),'strength',case when abs(personal_assist_leader_gap)>=0.5 then 'Strong' when abs(personal_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(personal_assists_at_six_plus,2),'strength',case when abs(personal_assists_at_six_plus)>=0.5 then 'Strong' when abs(personal_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(personal_assists_over5_behind,2),'strength',case when abs(personal_assists_over5_behind)>=0.5 then 'Strong' when abs(personal_assists_over5_behind)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(personal_assist_prestige_gained,2),'strength',case when abs(personal_assist_prestige_gained)>=0.5 then 'Strong' when abs(personal_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));
    macro_payload:=jsonb_build_array(jsonb_build_object('label','Contracts / Failures Ratio vs Win Rate','value',round(macro_contract_ratio,2),'strength',case when abs(macro_contract_ratio)>=0.5 then 'Strong' when abs(macro_contract_ratio)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists Given vs Win Rate','value',round(macro_assists_given,2),'strength',case when abs(macro_assists_given)>=0.5 then 'Strong' when abs(macro_assists_given)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists Received vs Win Rate','value',round(macro_assists_received,2),'strength',case when abs(macro_assists_received)>=0.5 then 'Strong' when abs(macro_assists_received)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Early Lead vs Final Win','value',round(macro_early_lead,2),'strength',case when abs(macro_early_lead)>=0.5 then 'Strong' when abs(macro_early_lead)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assist Target Prestige Gap vs Victory','value',round(macro_assist_target_gap,2),'strength',case when abs(macro_assist_target_gap)>=0.5 then 'Strong' when abs(macro_assist_target_gap)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assist Leader Prestige Gap vs Victory','value',round(macro_assist_leader_gap,2),'strength',case when abs(macro_assist_leader_gap)>=0.5 then 'Strong' when abs(macro_assist_leader_gap)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists at 6+ Prestige vs Victory','value',round(macro_assists_at_six_plus,2),'strength',case when abs(macro_assists_at_six_plus)>=0.5 then 'Strong' when abs(macro_assists_at_six_plus)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assists Over 5 Behind Leader vs Victory','value',round(macro_assists_over5_behind,2),'strength',case when abs(macro_assists_over5_behind)>=0.5 then 'Strong' when abs(macro_assists_over5_behind)>=0.25 then 'Moderate' else 'Light' end),jsonb_build_object('label','Assist Prestige Gained vs Victory','value',round(macro_assist_prestige_gained,2),'strength',case when abs(macro_assist_prestige_gained)>=0.5 then 'Strong' when abs(macro_assist_prestige_gained)>=0.25 then 'Moderate' else 'Light' end));

    with tg as (select g.id as game_id from public.games as g join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id where g.status='finished'),
    pair_games as (select case when lgp.profile_id::text<rgp.profile_id::text then lgp.profile_id::text else rgp.profile_id::text end as a,case when lgp.profile_id::text<rgp.profile_id::text then rgp.profile_id::text else lgp.profile_id::text end as b,case when wgp.profile_id in (lgp.profile_id,rgp.profile_id) then 1 else 0 end as pair_won from public.game_participants as lgp join public.game_participants as rgp on rgp.game_id=lgp.game_id and lgp.profile_id is not null and rgp.profile_id is not null and lgp.profile_id::text<rgp.profile_id::text join tg on tg.game_id=lgp.game_id left join public.game_participants as wgp on wgp.game_id=lgp.game_id and wgp.is_winner),
    pair_rollup as (select a,b,count(*)::int as games_together,coalesce(sum(pair_won),0)::int as wins_together from pair_games group by a,b),
    assist_edges as (select case when src.profile_id::text<rec.profile_id::text then src.profile_id::text else rec.profile_id::text end as a,case when src.profile_id::text<rec.profile_id::text then rec.profile_id::text else src.profile_id::text end as b,sum(case when src.profile_id::text<rec.profile_id::text then coalesce(edge.value::numeric,0) else 0 end) as assist_ab,sum(case when src.profile_id::text<rec.profile_id::text then 0 else coalesce(edge.value::numeric,0) end) as assist_ba from public.game_rounds as gr join tg on tg.game_id=gr.game_id join public.game_participants as src on src.id=gr.participant_id join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(key,value) on true join public.game_participants as rec on rec.game_id=gr.game_id and rec.profile_id::text=btrim(edge.key) and btrim(edge.key)!='' where src.profile_id is not null and rec.profile_id is not null and src.profile_id<>rec.profile_id group by 1,2),
    synergy_metrics as (select pr.a,pr.b,pr.games_together,coalesce(ae.assist_ab,0)+coalesce(ae.assist_ba,0) as total_assist,coalesce(ae.assist_ab,0) as assist_ab,coalesce(ae.assist_ba,0) as assist_ba,case when pr.games_together>0 then pr.wins_together::numeric/pr.games_together else 0 end as win_rate from pair_rollup as pr left join assist_edges as ae on ae.a=pr.a and ae.b=pr.b where pr.games_together>=2)
    select coalesce(jsonb_agg(jsonb_build_object('a',sm.a,'b',sm.b,'score',round(sm.synergy_score,2)) order by sm.synergy_score desc,sm.games_together desc,sm.a,sm.b),'[]'::jsonb) into synergy_payload
    from (select a,b,games_together,total_assist*0.6+win_rate*20+case when total_assist>0 then (1-abs(assist_ab-assist_ba)/total_assist)*10 else 0 end+games_together*0.5 as synergy_score from synergy_metrics order by total_assist*0.6+win_rate*20+case when total_assist>0 then (1-abs(assist_ab-assist_ba)/total_assist)*10 else 0 end+games_together*0.5 desc limit 5) as sm;

    with tg as (select g.id as game_id from public.games as g join public.game_participants as my_gp on my_gp.game_id=g.id and my_gp.profile_id=target_profile_id where g.status='finished'),
    net_players as (select distinct on (gp.profile_id) gp.profile_id,coalesce(nullif(p.display_name,''),p.player_name,'Unknown') as display_name,p.favorite_color,p.assigned_card_art_index from public.game_participants as gp join tg on tg.game_id=gp.game_id join public.profiles as p on p.id=gp.profile_id where gp.profile_id is not null order by gp.profile_id,gp.game_id desc),
    assist_flows as (select src.profile_id as from_id,rec.profile_id as to_id,count(*)::int as times_assisted,sum((edge.v)::numeric) as total_prestige from public.game_rounds as gr join tg on tg.game_id=gr.game_id join public.game_participants as src on src.id=gr.participant_id join lateral jsonb_each_text(gr.assist_prestige_recipients) as edge(k,v) on true join public.game_participants as rec on rec.game_id=gr.game_id and rec.profile_id::text=btrim(edge.k) where btrim(edge.k)!='' and (edge.v)::numeric>0 and src.profile_id is not null and rec.profile_id is not null group by src.profile_id,rec.profile_id)
    select coalesce((select jsonb_agg(jsonb_build_object('id',np.profile_id,'label',np.display_name,'color',np.favorite_color,'assignedCardArtIndex',np.assigned_card_art_index,'assistsGiven',coalesce(ag.assists_given,0),'prestigeGiven',coalesce(ag.prestige_given,0),'assistsReceived',coalesce(ar.assists_received,0),'prestigeReceived',coalesce(ar.prestige_received,0))) from net_players as np left join (select from_id as pid,sum(times_assisted)::int as assists_given,sum(total_prestige) as prestige_given from assist_flows group by from_id) as ag on ag.pid=np.profile_id left join (select to_id as pid,sum(times_assisted)::int as assists_received,sum(total_prestige) as prestige_received from assist_flows group by to_id) as ar on ar.pid=np.profile_id),'[]'::jsonb),
      coalesce((select jsonb_agg(jsonb_build_object('fromId',af.from_id,'toId',af.to_id,'timesAssisted',af.times_assisted,'totalPrestige',af.total_prestige)) from assist_flows as af),'[]'::jsonb)
    into assist_network_nodes,assist_network_edges;
  end if;

  analytics_payload:=jsonb_build_object(
    'generatedAt',generated_at,
    'achievements',achievements_payload,
    'moonrakersIntel',case when finished_game_count<3 then jsonb_build_object('hasData',false,'emptyTitle','Not enough Moonrakers data yet','emptyBody','Finish a few more games to unlock player-specific playstyle reads.')
    else jsonb_build_object(
      'hasData',true,
      'playstyle',jsonb_build_object('directPrestigePerGame',ps_avg_direct,'directPrestigePerGameLabel',trim(to_char(ps_avg_direct,'FM999990.0')),'assistPrestigeReceivedPerGame',ps_avg_assist_recv,'assistPrestigeReceivedPerGameLabel',trim(to_char(ps_avg_assist_recv,'FM999990.0')),'objectivePointsPerGame',ps_avg_objective,'objectivePointsPerGameLabel',trim(to_char(ps_avg_objective,'FM999990.0')),'baseTurnsPerGame',mi_base_turns_per_game,'baseTurnsPerGameLabel',trim(to_char(mi_base_turns_per_game,'FM999990.0')),'baseRate',mi_base_rate,'baseRateLabel',concat(round(mi_base_rate*100)::int,'%'),'styleRead',mi_style_read),
      'bestCondition',mi_best_condition,'worstCondition',mi_worst_condition,
      'baseDiscipline',jsonb_build_object('baseRate',mi_base_rate,'baseRateLabel',concat(round(mi_base_rate*100)::int,'%'),'baseTurnsPerGame',mi_base_turns_per_game,'baseTurnsPerGameLabel',trim(to_char(mi_base_turns_per_game,'FM999990.0')),'winRateWithBase',mi_wr_with_base,'winRateWithBaseLabel',concat(round(mi_wr_with_base*100)::int,'%'),'winRateWithoutBase',mi_wr_without_base,'winRateWithoutBaseLabel',concat(round(mi_wr_without_base*100)::int,'%'),'prestigeWithBase',mi_prestige_with_base,'prestigeWithBaseLabel',trim(to_char(mi_prestige_with_base,'FM999990.0')),'prestigeWithoutBase',mi_prestige_without_base,'prestigeWithoutBaseLabel',trim(to_char(mi_prestige_without_base,'FM999990.0'))),
      'objectiveProfile',jsonb_build_object('objectivePointsPerGame',ps_avg_objective,'objectivePointsPerGameLabel',trim(to_char(ps_avg_objective,'FM999990.0')),'gamesWithObjectives',mi_games_with_obj,'gamesWithObjectivesLabel',format('%s/%s',mi_games_with_obj,finished_game_count),'highObjectiveGames',mi_high_obj_games,'highObjectiveGamesLabel',format('%s/%s',mi_high_obj_games,finished_game_count),'winRateWithObjectives',mi_wr_with_obj,'winRateWithObjectivesLabel',concat(round(mi_wr_with_obj*100)::int,'%'),'winRateWithoutObjectives',mi_wr_without_obj,'winRateWithoutObjectivesLabel',concat(round(mi_wr_without_obj*100)::int,'%'),'prestigeWithObjectives',mi_prestige_with_obj,'prestigeWithObjectivesLabel',trim(to_char(mi_prestige_with_obj,'FM999990.0'))),
      'supportProfile',jsonb_build_object('assistsGivenPerGame',signal_avg_assists,'assistsGivenPerGameLabel',trim(to_char(signal_avg_assists,'FM999990.0')),'assistPrestigeReceivedPerGame',ps_avg_assist_recv,'assistPrestigeReceivedPerGameLabel',trim(to_char(ps_avg_assist_recv,'FM999990.0')),'supportStyle',mi_support_style,'bestSupportPartner',case when mi_best_partner_id is null then null else jsonb_build_object('playerId',mi_best_partner_id,'playerName',mi_best_partner_name,'winRate',mi_best_partner_winrate,'winRateLabel',concat(round(mi_best_partner_winrate*100)::int,'%'),'avgPrestige',mi_best_partner_prestige,'avgPrestigeLabel',trim(to_char(mi_best_partner_prestige,'FM999990.0')),'sampleSize',mi_best_partner_games,'sampleSizeLabel',format('%s games',mi_best_partner_games)) end,'mostCommonAssistTarget',case when mi_top_target_id is null then null else jsonb_build_object('playerId',mi_top_target_id,'playerName',mi_top_target_name,'assistsSent',mi_top_target_assists,'assistsSentLabel',format('%s assists',mi_top_target_assists),'sampleSize',mi_top_target_games,'sampleSizeLabel',format('%s games',mi_top_target_games)) end),
      'assistContext',jsonb_build_object('assistEventsCount',mi_assist_events,'assistEventsLabel',format('%s assists',mi_assist_events),'timedEventsCount',mi_assist_events,'timedAssistEventsLabel',format('%s timed assists',mi_assist_events),'trackedGamesLabel',format('%s tracked games',finished_game_count),'prestigeGained',mi_prestige_gained,'prestigeGainedLabel',trim(to_char(mi_prestige_gained,'FM999990.0')),'prestigePerAssist',case when mi_assist_events>0 then round(mi_prestige_gained/mi_assist_events,2) else 0 end,'prestigePerAssistLabel',trim(to_char(case when mi_assist_events>0 then round(mi_prestige_gained/mi_assist_events,2) else 0 end,'FM999990.0')),'assistGapToLeaderLabel',trim(to_char(round(personal_assist_leader_gap,2),'FM999990.0')),'assistGapToTargetLabel',trim(to_char(round(personal_assist_target_gap,2),'FM999990.0')),'importHealthLabel',case when mi_assist_events>0 then 'Exact assist timing' else 'No assist context' end,'importHealthTone',case when mi_assist_events>0 then 'green' else 'red' end,'importHealthSubLabel',case when mi_assist_events>0 then format('%s assists across %s tracked games.',mi_assist_events,finished_game_count) else 'No tracked assist data for this profile.' end)
    ) end,
    'analyticsHome',jsonb_build_object('generatedAt',generated_at,'daysSinceLastGame',days_since_last_game,'hero',jsonb_build_object('players',registered_player_count,'games',finished_game_count,'views',player_row_count),'cards',jsonb_build_array(jsonb_build_object('key','registered-players','title','Registered players','value',registered_player_count,'description','Active players available to analytics.'),jsonb_build_object('key','tracked-games','title','Tracked games','value',finished_game_count,'description','Finished games involving this profile.'),jsonb_build_object('key','player-rows','title','Player rows','value',player_row_count,'description','Saved participant rows available to summarize.'),jsonb_build_object('key','days-since-last-game','title','Days since last game','value',coalesce(days_since_last_game::text,'-'),'description','Calendar days since this player''s most recent game.')),'personalBests',jsonb_build_object('bestPrestige',pb_best_prestige,'bestScore',pb_best_score,'mostContractsGame',pb_most_contracts,'longestWinStreak',streak_longest_win,'perfectWins',pb_perfect_wins,'bestGroup',pb_best_group_name),'sessionCadence',jsonb_build_object('sessionCount',sc_session_count,'avgDaysBetweenSessions',sc_avg_gap,'longestGapDays',sc_longest_gap,'lastSessionDate',sc_last_session_date,'warmupSignal',session_tendency)),
    'statsScreen',jsonb_build_object('generatedAt',generated_at,'overview',jsonb_build_object('hero',jsonb_build_object('title','Stats overview','takeaway',case when finished_game_count>0 then 'Server-authored stats are available for this profile.' else 'No finished games are available for this profile yet.' end,'games',finished_game_count,'players',registered_player_count),'cards',jsonb_build_array(jsonb_build_object('key','games-played','title','Games played','value',finished_game_count),jsonb_build_object('key','players-seen','title','Players in network','value',registered_player_count)),'topSignals',top_signals,'streaks',jsonb_build_object('currentStreak',streak_current_len,'currentStreakIsWin',streak_current_is_win,'longestWinStreak',streak_longest_win,'longestLossStreak',streak_longest_loss),'positionStats',position_stats,'playerCountSplit',player_count_split,'halftimeProfile',halftime_profile,'sessionProfile',session_profile),'players',jsonb_build_object('options',player_options,'selectedPlayerId',target_profile_id,'detail',player_detail),'prestigeSources',prestige_sources,'paceProfile',jsonb_build_object('avgFirstHalf',pace_avg_first_half,'avgSecondHalf',pace_avg_second_half,'avgLateDelta',pace_avg_late_delta,'avgFirstHalfWin',pace_avg_first_half_win,'avgFirstHalfLose',pace_avg_first_half_lose,'avgOpeningTurns',pace_avg_opening_turns,'avgClosingTurns',pace_avg_closing_turns,'avgClosingTurnsWin',pace_avg_closing_turns_win,'avgClosingTurnsLoss',pace_avg_closing_turns_loss,'description',case when finished_game_count=0 then 'No games yet.' else concat('Avg prestige: ',pace_avg_first_half::text,' (first half) -> ',pace_avg_second_half::text,' (second half). Final 3 turns avg: ',pace_avg_closing_turns::text,' (',case when pace_avg_closing_turns>pace_avg_opening_turns+0.5 then 'strong closer' when pace_avg_opening_turns>pace_avg_closing_turns+0.5 then 'strong opener' else 'steady' end,').') end),'roundPhaseStats',round_phase_stats,'consistencyProfile',consistency_profile,'playstyle',jsonb_build_object('label',playstyle_label,'summary',playstyle_summary,'highlights',playstyle_highlights),'correlations',jsonb_build_object('summary',case when finished_game_count<3 then 'Need at least 3 games for meaningful correlation analysis.' else concat(jsonb_array_length(correlations_items)::text,' stats analyzed across ',finished_game_count::text,' games.') end,'items',correlations_items,'selectedKey',null),'games',jsonb_build_object('items',game_history,'totalCount',finished_game_count,'selectedGameId',null,'detail',null)),
    'insightsScreen',jsonb_build_object('generatedAt',generated_at,'meta',jsonb_build_object('games',finished_game_count,'playerRows',player_row_count),'topSignals',top_signals,'rivalries',head_to_head,'assistNetwork',jsonb_build_object('nodes',assist_network_nodes,'edges',assist_network_edges),'correlations',jsonb_build_object('summary',case when finished_game_count<2 then 'Need at least 2 games for insights.' else 'Outcome signals derived from your finished games.' end,'personal',personal_payload,'pairing',pairing_payload,'macro',macro_payload,'synergyPairs',synergy_payload,'players','[]'::jsonb,'items',correlations_items,'selectedKey',null,'winLoseSplit',correlations_items)));

  insert into public.personal_stats_rollups (profile_id,payload,updated_at) values (target_profile_id,analytics_payload,generated_at) on conflict (profile_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;
  insert into public.global_stats_rollups (key,payload,updated_at) values ('overview',jsonb_build_object('gamesPlayed',(select count(*) from public.games where public.games.status='finished'),'playersRegistered',(select count(*) from public.profiles where public.profiles.deleted_at is null),'lastGameId',(select public.games.id from public.games where public.games.status='finished' order by public.games.created_at desc,public.games.id desc limit 1)),now()) on conflict (key) do update set payload=excluded.payload,updated_at=excluded.updated_at;

  insert into public.group_stats_rollups (group_id,payload,updated_at)
  select g.id,jsonb_build_object('groupId',g.id,'name',g.name,'gamesPlayed',coalesce(gc.game_count,0),'lastGameId',gc.last_game_id,'memberCount',coalesce(mc.member_count,0),'memberStats',coalesce(ms.stats,'[]'::jsonb),'topWinner',ms.top_winner_name,'seatBias',coalesce(sb.stats,'[]'::jsonb),'sessionWarmup',jsonb_build_object('pattern',coalesce(sw.pattern,'Consistent'),'game1WinRate',coalesce(sw.g1wr,0),'game3PlusWinRate',coalesce(sw.g3wr,0))),now()
  from public.groups as g
  left join lateral (select count(*)::int as game_count,(array_agg(gg.id order by gg.created_at desc,gg.id desc))[1] as last_game_id from public.games as gg where gg.group_id=g.id and gg.status='finished') as gc on true
  left join lateral (select count(*)::int as member_count from public.group_members as gm where gm.group_id=g.id) as mc on true
  left join lateral (select coalesce(jsonb_agg(jsonb_build_object('profileId',p.id,'displayName',coalesce(nullif(p.display_name,''),p.player_name,'Player'),'games',ms_inner.games,'wins',ms_inner.wins,'winRate',case when ms_inner.games>0 then round(ms_inner.wins::numeric/ms_inner.games,3) else 0 end,'avgPrestige',ms_inner.avg_prestige,'avgScore',ms_inner.avg_score) order by ms_inner.wins desc,ms_inner.avg_prestige desc),'[]'::jsonb) as stats,(select coalesce(nullif(p2.display_name,''),p2.player_name) from public.profiles as p2 where p2.id=(select gp2.profile_id from public.game_participants as gp2 join public.games as gg2 on gg2.id=gp2.game_id and gg2.group_id=g.id and gg2.status='finished' where gp2.profile_id is not null group by gp2.profile_id order by count(*) filter (where gp2.is_winner) desc,count(*) desc limit 1)) as top_winner_name from (select gp.profile_id,count(distinct gp.game_id)::int as games,count(*) filter (where gp.is_winner)::int as wins,round(avg(gp.total_prestige),1) as avg_prestige,round(avg(gp.score),1) as avg_score from public.game_participants as gp join public.games as gg on gg.id=gp.game_id and gg.group_id=g.id and gg.status='finished' where gp.profile_id is not null group by gp.profile_id) as ms_inner join public.profiles as p on p.id=ms_inner.profile_id) as ms on true
  left join lateral (select coalesce(jsonb_agg(jsonb_build_object('seat',sd.start_order,'appearances',sd.appearances,'wins',sd.wins,'winRate',case when sd.appearances>0 then round(sd.wins::numeric/sd.appearances,3) else 0 end) order by sd.start_order),'[]'::jsonb) as stats from (select gp.start_order,count(*)::int as appearances,count(*) filter (where gp.is_winner)::int as wins from public.game_participants as gp join public.games as gg on gg.id=gp.game_id and gg.group_id=g.id and gg.status='finished' where gp.profile_id is not null group by gp.start_order) as sd) as sb on true
  left join lateral (with grp_sessions as (select gp.profile_id,gp.is_winner,row_number() over (partition by date(coalesce(gg.finished_at,gg.created_at)) order by coalesce(gg.finished_at,gg.created_at),gg.id) as game_in_session from public.game_participants as gp join public.games as gg on gg.id=gp.game_id and gg.group_id=g.id and gg.status='finished' where gp.profile_id is not null) select round(count(*) filter (where is_winner and game_in_session=1)::numeric/nullif(count(*) filter (where game_in_session=1),0),3) as g1wr,round(count(*) filter (where is_winner and game_in_session>=3)::numeric/nullif(count(*) filter (where game_in_session>=3),0),3) as g3wr,case when round(count(*) filter (where is_winner and game_in_session>=3)::numeric/nullif(count(*) filter (where game_in_session>=3),0),3)>round(count(*) filter (where is_winner and game_in_session=1)::numeric/nullif(count(*) filter (where game_in_session=1),0),3)+0.15 then 'Warms up' else 'Consistent' end as pattern from grp_sessions) as sw on true
  where coalesce(gc.game_count,0)>0
  on conflict (group_id) do update set payload=excluded.payload,updated_at=excluded.updated_at;

  return jsonb_build_object('refreshed',true,'profileId',target_profile_id,'generatedAt',generated_at);
end;
$$;

do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;

-- #1 + #5: get_player_profile_screen as rollup reader
create or replace function public.get_player_profile_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null
)
returns jsonb language plpgsql stable set search_path = 'public'
as $$
declare
  generated_at         timestamptz := now();
  elo_payload          jsonb := '{}'::jsonb;
  rollup_payload       jsonb;
  selected_player_id   uuid := null;
  selected_opponent_id uuid := null;
  selected_summary     jsonb := null;
  selected_player_opt  jsonb := null;
  player_options       jsonb := '[]'::jsonb;
  opponent_options     jsonb := '[]'::jsonb;
  top_opponent_options jsonb := '[]'::jsonb;
  top_cards            jsonb := '[]'::jsonb;
  tabs                 jsonb := '{}'::jsonb;
  tab_insights         jsonb := '{}'::jsonb;
  profile_insight      jsonb := null;
  active_insight       jsonb := null;
  recent_games         jsonb := '[]'::jsonb;
  hero                 jsonb := null;
  moonrakers_intel     jsonb := null;
  total_games          integer := 0;
  total_wins           integer := 0;
  win_rate             numeric := 0;
  current_elo          integer := 1000;
  peak_elo             integer := 1000;
  player_name          text    := 'Player';
  player_color         text    := null;
  player_card_art_idx  integer := null;
  opponent_name        text    := null;
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

  if selected_player_id is null then
    return jsonb_build_object(
      'generatedAt',generated_at,'selectedPlayerId',null,'selectedOpponentId',null,'playerOptions',player_options,
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

  player_name        := coalesce(nullif(selected_summary->>'name',''),nullif(selected_player_opt->>'name',''),nullif(selected_player_opt->>'label',''),'Player');
  player_color       := nullif(selected_player_opt->>'color','');
  player_card_art_idx:= nullif(selected_player_opt->>'assignedCardArtIndex','')::integer;
  current_elo        := coalesce(nullif(selected_summary->>'currentElo','')::integer,1000);
  peak_elo           := coalesce(nullif(selected_summary->>'peakElo','')::integer,current_elo);

  -- #1: moonrakersIntel from rollup; #5: recent_games from the full finished-game history
  select psr.payload into rollup_payload
  from public.personal_stats_rollups as psr where psr.profile_id=selected_player_id;

  if rollup_payload is not null then
    moonrakers_intel := rollup_payload->'moonrakersIntel';
    if selected_opponent_id is null then
      total_games  := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'games')::int,0);
      total_wins   := coalesce((rollup_payload->'statsScreen'->'players'->'detail'->'stats'->>'wins')::int,0);
      win_rate     := case when total_games>0 then total_wins::numeric/total_games else 0 end;
    end if;
  end if;

  -- Live totals path: opponent filter or missing rollup
  if selected_opponent_id is not null or rollup_payload is null then
    select count(*)::int, count(*) filter (where gp.is_winner)::int,
      coalesce(count(*) filter (where gp.is_winner)::numeric/nullif(count(*)::numeric,0),0)::numeric
    into total_games, total_wins, win_rate
    from public.game_participants as gp join public.games as g on g.id=gp.game_id
    where gp.profile_id=selected_player_id and g.status='finished'
      and (selected_opponent_id is null or exists (
        select 1 from public.game_participants as ogp where ogp.game_id=gp.game_id and ogp.profile_id=selected_opponent_id
      ));

    if selected_opponent_id is not null then
      select coalesce(nullif(p.display_name,''),p.player_name,'Player')
      into opponent_name from public.profiles as p where p.id=selected_opponent_id limit 1;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',g.id,'gameId',g.id,'createdAt',g.created_at,'finishedAt',g.finished_at,
    'winnerId',g.winner_profile_id,'groupId',g.group_id,'groupName',g.group_name_snapshot,
    'players',coalesce(pp.players,'[]'::jsonb)
  ) order by coalesce(g.finished_at,g.created_at) desc,g.id desc),'[]'::jsonb)
  into recent_games
  from public.games as g
  join public.game_participants as focus_gp on focus_gp.game_id=g.id and focus_gp.profile_id=selected_player_id
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',gp.profile_id,'profileId',gp.profile_id,'name',coalesce(nullif(gp.display_name_snapshot,''),gp.player_name_snapshot,'Player'),'color',gp.color_snapshot,'assignedCardArtIndex',gp.assigned_card_art_index_snapshot,'startOrder',gp.start_order,'isWinner',gp.is_winner,'totalPrestige',gp.total_prestige) order by gp.start_order asc,gp.profile_id asc) as players
    from public.game_participants as gp where gp.game_id=g.id
  ) as pp on true
  where g.status='finished'
    and (selected_opponent_id is null or exists (
      select 1 from public.game_participants as ogp where ogp.game_id=g.id and ogp.profile_id=selected_opponent_id
    ))
  order by coalesce(g.finished_at,g.created_at) desc,g.id desc limit 60;

  if moonrakers_intel is null then
    moonrakers_intel:=jsonb_build_object('hasData',false,'emptyTitle','Not enough Moonrakers data yet','emptyBody','Finish a few more games to unlock player-specific playstyle reads.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',shared.opponent_id,'name',shared.opponent_name,'label',shared.opponent_name,
    'displayName',shared.opponent_display_name,'playerName',shared.opponent_player_name,
    'color',shared.favorite_color,'assignedCardArtIndex',shared.assigned_card_art_index,
    'gamesPlayed',shared.games_together,'currentElo',coalesce(nullif(shared.current_elo_text,'')::integer,1000)
  ) order by shared.games_together desc,lower(shared.opponent_name) asc,shared.opponent_id),'[]'::jsonb)
  into opponent_options
  from (
    select other_profile.id as opponent_id,coalesce(nullif(other_profile.display_name,''),other_profile.player_name,'Player') as opponent_name,
      nullif(other_profile.display_name,'') as opponent_display_name,other_profile.player_name as opponent_player_name,
      other_profile.favorite_color,other_profile.assigned_card_art_index,
      count(distinct g.id)::int as games_together,max(player_option->>'currentElo') as current_elo_text
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_participants as other_gp on other_gp.game_id=gp.game_id and other_gp.profile_id is not null and other_gp.profile_id<>gp.profile_id
    join public.profiles as other_profile on other_profile.id=other_gp.profile_id
    left join lateral jsonb_array_elements(player_options) as player_option on nullif(player_option->>'id','')::uuid=other_profile.id
    where gp.profile_id=selected_player_id
    group by other_profile.id,other_profile.display_name,other_profile.player_name,other_profile.favorite_color,other_profile.assigned_card_art_index
  ) as shared;

  select coalesce(jsonb_agg(entry order by ordinality),'[]'::jsonb) into top_opponent_options
  from (select entry,ordinality from jsonb_array_elements(opponent_options) with ordinality as entry(entry,ordinality) order by coalesce(nullif(entry->>'gamesPlayed','')::integer,0) desc,lower(coalesce(entry->>'label',entry->>'name','player')) asc limit 4) as top_entries;

  hero:=jsonb_build_object('id',selected_player_id,'name',player_name,'color',player_color,'assignedCardArtIndex',player_card_art_idx,'currentElo',current_elo,'peakElo',peak_elo,'winRate',win_rate,'totalWins',total_wins,'totalGames',total_games);
  profile_insight:=jsonb_build_object(
    'title',case when total_games=0 then 'Awaiting tracked results' when selected_opponent_id is not null and opponent_name is not null then format('Context against %s',opponent_name) when win_rate>=0.6 then 'Winning profile' when win_rate<=0.35 then 'Recovery window' else 'Balanced profile' end,
    'body',case when total_games=0 then 'This player is in the shared directory, but there are no finished games in the published Moonrakers history yet.' when selected_opponent_id is not null and opponent_name is not null then format('%s has %s wins across %s shared games against %s in the published Supabase record.',player_name,total_wins,total_games,opponent_name) when win_rate>=0.6 then format('%s is converting %s%% of finished games with a current ELO of %s.',player_name,round(win_rate*100)::int,current_elo) when win_rate<=0.35 then format('%s is below break-even right now, so the current profile is more about stabilizing form than protecting peak rating.',player_name) else format('%s is operating near the league middle, with enough history to compare momentum, context, and projection in one place.',player_name) end);
  active_insight:=coalesce(tab_insights->'Leaderboard',jsonb_build_object('title','Profile insight','body',format('%s now has a full server-authored analytics profile.',player_name)));

  return jsonb_build_object(
    'generatedAt',generated_at,'selectedPlayerId',selected_player_id,'selectedOpponentId',selected_opponent_id,
    'playerOptions',player_options,'hero',hero,
    'quickActions',jsonb_build_object('compareLabel','Compare with...','chartsLabel','Open charts','recentGamesLabel','Recent games'),
    'topCards',top_cards,'activeInsight',active_insight,'profileInsight',profile_insight,
    'tabs',tabs,'tabInsights',tab_insights,'moonrakersIntel',moonrakers_intel,
    'opponentOptions',opponent_options,'topOpponentOptions',top_opponent_options,'recentGames',recent_games,
    'emptyState',case when total_games>0 then null else jsonb_build_object('title','No player analytics yet','description','Track or import a few finished games so the full profile contract has live history to summarize.') end
  );
end;
$$;

-- #4: get_achievements
create or replace function public.get_achievements(profile_id uuid default auth.uid())
returns jsonb language plpgsql stable set search_path = 'public'
as $$
begin
  if profile_id is null or profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;
  return coalesce(
    (select psr.payload->'achievements' from public.personal_stats_rollups as psr where psr.profile_id=get_achievements.profile_id),
    '[]'::jsonb
  );
end;
$$;
;
