-- Recovered from live supabase_migrations.schema_migrations on 2026-05-25 to reconcile local migration history.

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
  ps_avg_direct numeric := 0;
  ps_avg_assist_recv numeric := 0;
  ps_avg_objective numeric := 0;
  ps_avg_direct_win numeric := 0;
  ps_avg_assist_recv_win numeric := 0;
  ps_avg_objective_win numeric := 0;
  ps_avg_direct_lose numeric := 0;
  ps_avg_assist_recv_lose numeric := 0;
  ps_avg_objective_lose numeric := 0;
  ps_total numeric := 1;
  prestige_sources jsonb := '{}'::jsonb;
  corr_avg_obj_win numeric := 0;
  corr_avg_obj_lose numeric := 0;
  corr_avg_assists_win numeric := 0;
  corr_avg_assists_lose numeric := 0;
  corr_avg_failures_win numeric := 0;
  corr_avg_failures_lose numeric := 0;
  correlations_items jsonb := '[]'::jsonb;
  pace_avg_first_half numeric := 0;
  pace_avg_second_half numeric := 0;
  pace_avg_late_delta numeric := 0;
  pace_avg_first_half_win numeric := 0;
  pace_avg_first_half_lose numeric := 0;
  rps_prestige_early numeric := 0;
  rps_prestige_mid numeric := 0;
  rps_prestige_late numeric := 0;
  rps_contracts_early numeric := 0;
  rps_contracts_mid numeric := 0;
  rps_contracts_late numeric := 0;
  rps_failures_early numeric := 0;
  rps_failures_mid numeric := 0;
  rps_failures_late numeric := 0;
  round_phase_stats jsonb := '{}'::jsonb;
  consistency_zero_pct numeric := 0;
  consistency_zero_pct_win numeric := 0;
  consistency_best_round numeric := 0;
  consistency_profile jsonb := '{}'::jsonb;
  top_signals jsonb := '[]'::jsonb;
  streak_longest_win integer := 0;
  streak_longest_loss integer := 0;
  streak_current_is_win boolean := false;
  streak_current_len integer := 0;
  head_to_head jsonb := '[]'::jsonb;
  position_stats jsonb := '[]'::jsonb;
  game_history jsonb := '[]'::jsonb;
  player_count_split jsonb := '[]'::jsonb;
  ht_total integer := 0;
  ht_lead_count integer := 0;
  ht_lead_win_count integer := 0;
  ht_trail_win_count integer := 0;
  halftime_profile jsonb := '{}'::jsonb;
  playstyle_label text := 'Direct-driven';
  playstyle_summary text := '';
  playstyle_highlights jsonb := '[]'::jsonb;
  player_options jsonb := '[]'::jsonb;
  player_detail jsonb := '{}'::jsonb;
  analytics_payload jsonb;
  target_player_name text := null;
  target_display_name text := null;
begin
  select public.profiles.player_name, nullif(public.profiles.display_name, '')
  into target_player_name, target_display_name
  from public.profiles where public.profiles.id = target_profile_id;

  select count(*) into registered_player_count from public.profiles;

  select count(*) into player_row_count
  from public.game_participants where public.game_participants.profile_id = target_profile_id;

  select (extract(epoch from (now() - max(coalesce(public.games.finished_at, public.games.created_at)))) / 86400)::int
  into days_since_last_game
  from public.games where public.games.status = 'finished';

  -- Consolidated participant query: signal stats + prestige sources + correlations in one pass
  select
    count(distinct gp.game_id)::int,
    count(*) filter (where gp.is_winner)::int,
    coalesce(avg(gp.assists), 0)::numeric,
    coalesce(avg(gp.failures), 0)::numeric,
    coalesce(sum(gp.contracts)::numeric / nullif(sum(gp.contracts + gp.failures), 0), 0)::numeric,
    coalesce(round(avg(gp.direct_prestige), 2), 0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received), 2), 0)::numeric,
    coalesce(round(avg(gp.objective_prestige), 2), 0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received) filter (where gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.objective_prestige)       filter (where gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.direct_prestige)         filter (where not gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.assist_prestige_received) filter (where not gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.objective_prestige)       filter (where not gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.assists)  filter (where gp.is_winner),     2), 0)::numeric,
    coalesce(round(avg(gp.assists)  filter (where not gp.is_winner), 2), 0)::numeric,
    coalesce(round(avg(gp.failures) filter (where gp.is_winner),     2), 0)::numeric,
    coalesce(round(avg(gp.failures) filter (where not gp.is_winner), 2), 0)::numeric
  into
    finished_game_count,
    signal_win_count, signal_avg_assists, signal_avg_failures, signal_contract_conversion,
    ps_avg_direct, ps_avg_assist_recv, ps_avg_objective,
    ps_avg_direct_win,  ps_avg_assist_recv_win,  ps_avg_objective_win,
    ps_avg_direct_lose, ps_avg_assist_recv_lose, ps_avg_objective_lose,
    corr_avg_assists_win, corr_avg_assists_lose,
    corr_avg_failures_win, corr_avg_failures_lose
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  where gp.profile_id = target_profile_id;

  signal_win_rate   := case when finished_game_count > 0 then signal_win_count::numeric / finished_game_count else 0 end;
  corr_avg_obj_win  := ps_avg_objective_win;
  corr_avg_obj_lose := ps_avg_objective_lose;
  ps_total          := greatest(ps_avg_direct + ps_avg_assist_recv + ps_avg_objective, 0.01);

  -- Consolidated round query: pace + phases + #4 consistency in a single game_rounds scan.
  -- Fix: move *100.0 inside avg() so filter can attach directly to the aggregate.
  select
    coalesce(round(avg(fp), 1), 0)::numeric,
    coalesce(round(avg(sp), 1), 0)::numeric,
    coalesce(round(avg(sp - fp), 1), 0)::numeric,
    coalesce(round(avg(fp) filter (where is_win),     1), 0)::numeric,
    coalesce(round(avg(fp) filter (where not is_win), 1), 0)::numeric,
    coalesce(round(sum(ep)::numeric / nullif(sum(er), 0), 2), 0)::numeric,
    coalesce(round(sum(mp)::numeric / nullif(sum(mr), 0), 2), 0)::numeric,
    coalesce(round(sum(lp)::numeric / nullif(sum(lr), 0), 2), 0)::numeric,
    coalesce(round(sum(ec)::numeric / nullif(sum(er), 0), 2), 0)::numeric,
    coalesce(round(sum(mc)::numeric / nullif(sum(mr), 0), 2), 0)::numeric,
    coalesce(round(sum(lc)::numeric / nullif(sum(lr), 0), 2), 0)::numeric,
    coalesce(round(sum(ef)::numeric / nullif(sum(er), 0), 2), 0)::numeric,
    coalesce(round(sum(mf)::numeric / nullif(sum(mr), 0), 2), 0)::numeric,
    coalesce(round(sum(lf)::numeric / nullif(sum(lr), 0), 2), 0)::numeric,
    -- consistency: *100.0 is inside avg() so FILTER attaches cleanly to the aggregate
    coalesce(round(avg(zero_r::numeric / nullif(er + mr + lr, 0) * 100.0),                     1), 0)::numeric,
    coalesce(round(avg(zero_r::numeric / nullif(er + mr + lr, 0) * 100.0) filter (where is_win), 1), 0)::numeric,
    coalesce(max(peak_r), 0)::numeric
  into
    pace_avg_first_half, pace_avg_second_half, pace_avg_late_delta,
    pace_avg_first_half_win, pace_avg_first_half_lose,
    rps_prestige_early, rps_prestige_mid, rps_prestige_late,
    rps_contracts_early, rps_contracts_mid, rps_contracts_late,
    rps_failures_early, rps_failures_mid, rps_failures_late,
    consistency_zero_pct, consistency_zero_pct_win, consistency_best_round
  from (
    select
      gp.is_winner as is_win,
      coalesce(sum(gr.prestige) filter (where gr.round_index <  mri.max_ri / 2.0), 0) as fp,
      coalesce(sum(gr.prestige) filter (where gr.round_index >= mri.max_ri / 2.0), 0) as sp,
      coalesce(sum(gr.prestige)  filter (where gr.round_index <= 6), 0)              as ep,
      count(*)                   filter (where gr.round_index <= 6)                   as er,
      coalesce(sum(gr.contracts) filter (where gr.round_index <= 6), 0)              as ec,
      coalesce(sum(gr.failures)  filter (where gr.round_index <= 6), 0)              as ef,
      coalesce(sum(gr.prestige)  filter (where gr.round_index between 7 and 14), 0) as mp,
      count(*)                   filter (where gr.round_index between 7 and 14)      as mr,
      coalesce(sum(gr.contracts) filter (where gr.round_index between 7 and 14), 0) as mc,
      coalesce(sum(gr.failures)  filter (where gr.round_index between 7 and 14), 0) as mf,
      coalesce(sum(gr.prestige)  filter (where gr.round_index >= 15), 0)             as lp,
      count(*)                   filter (where gr.round_index >= 15)                  as lr,
      coalesce(sum(gr.contracts) filter (where gr.round_index >= 15), 0)             as lc,
      coalesce(sum(gr.failures)  filter (where gr.round_index >= 15), 0)             as lf,
      count(*)                   filter (where gr.prestige = 0)                       as zero_r,
      max(gr.prestige)                                                                 as peak_r
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    join public.game_rounds as gr on gr.participant_id = gp.id
    join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id = gp.id) as mri on true
    where gp.profile_id = target_profile_id
    group by gp.id, gp.is_winner
  ) as per_game;

  prestige_sources := jsonb_build_object(
    'avgDirect', ps_avg_direct, 'avgAssistReceived', ps_avg_assist_recv, 'avgObjective', ps_avg_objective,
    'directPct',         round(100.0 * ps_avg_direct       / ps_total, 1),
    'assistReceivedPct', round(100.0 * ps_avg_assist_recv  / ps_total, 1),
    'objectivePct',      round(100.0 * ps_avg_objective    / ps_total, 1),
    'whenWin',  jsonb_build_object('avgDirect', ps_avg_direct_win,  'avgAssistReceived', ps_avg_assist_recv_win,  'avgObjective', ps_avg_objective_win),
    'whenLose', jsonb_build_object('avgDirect', ps_avg_direct_lose, 'avgAssistReceived', ps_avg_assist_recv_lose, 'avgObjective', ps_avg_objective_lose),
    'description', case when finished_game_count = 0 then 'No games yet.'
      else concat(round(100.0 * ps_avg_direct / ps_total, 0)::int::text, '% direct, ',
                  round(100.0 * ps_avg_assist_recv / ps_total, 0)::int::text, '% assist-received, ',
                  round(100.0 * ps_avg_objective / ps_total, 0)::int::text, '% objective.') end);

  round_phase_stats := jsonb_build_object(
    'early', jsonb_build_object('label', 'Early (rounds 0-6)',  'avgPrestigePerRound', rps_prestige_early, 'avgContractsPerRound', rps_contracts_early, 'avgFailuresPerRound', rps_failures_early),
    'mid',   jsonb_build_object('label', 'Mid (rounds 7-14)',   'avgPrestigePerRound', rps_prestige_mid,   'avgContractsPerRound', rps_contracts_mid,   'avgFailuresPerRound', rps_failures_mid),
    'late',  jsonb_build_object('label', 'Late (rounds 15+)',   'avgPrestigePerRound', rps_prestige_late,  'avgContractsPerRound', rps_contracts_late,  'avgFailuresPerRound', rps_failures_late));

  consistency_profile := jsonb_build_object(
    'scoringRoundPct',  round(100.0 - consistency_zero_pct, 1),
    'zeroRoundPct',     consistency_zero_pct,
    'zeroRoundPctWin',  consistency_zero_pct_win,
    'bestSingleRound',  consistency_best_round,
    'description', case when finished_game_count = 0 then 'No games yet.'
      else concat(round(100.0 - consistency_zero_pct, 0)::int::text, '% of rounds score prestige (best single round: ', consistency_best_round::text, ').') end);

  -- #6 Playstyle label, summary, highlights ? computed from real stats in rollup
  if finished_game_count > 0 then
    playstyle_label := case
      when ps_avg_assist_recv / ps_total >= 0.12 then 'Support-oriented'
      when ps_avg_objective   / ps_total >= 0.15 then 'Objective-focused'
      when signal_contract_conversion    >= 0.85 then 'Contract specialist'
      when signal_win_rate               >= 0.55 then 'Well-rounded winner'
      else 'Direct-driven'
    end;
    playstyle_summary := concat(
      playstyle_label, ' across ', finished_game_count::text, ' game',
      case when finished_game_count = 1 then '' else 's' end, '. ',
      round(100.0 * ps_avg_direct       / ps_total, 0)::int::text, '% direct, ',
      round(100.0 * ps_avg_assist_recv  / ps_total, 0)::int::text, '% assist-received, ',
      round(100.0 * ps_avg_objective    / ps_total, 0)::int::text, '% objective. ',
      'Contract conversion: ', round(signal_contract_conversion * 100, 0)::int::text, '%. ',
      'Win rate: ', round(signal_win_rate * 100, 0)::int::text, '%.');
    playstyle_highlights := jsonb_build_array(
      jsonb_build_object('key', 'win-rate',                'label', 'Win rate',                'value', concat(round(signal_win_rate * 100), '%')),
      jsonb_build_object('key', 'direct-prestige-per-game','label', 'Direct prestige / game',  'value', round(ps_avg_direct, 1)),
      jsonb_build_object('key', 'assists-per-game',        'label', 'Assists / game',           'value', round(signal_avg_assists, 1)),
      jsonb_build_object('key', 'objective-share',         'label', 'Objective share',          'value', concat(round(100.0 * ps_avg_objective / ps_total, 0)::int, '%')));
  end if;

  -- Streaks
  select
    coalesce(max(streak_len) filter (where is_winner),      0)::int,
    coalesce(max(streak_len) filter (where not is_winner),  0)::int,
    coalesce((array_agg(is_winner order by last_rn desc))[1], false),
    coalesce((array_agg(streak_len order by last_rn desc))[1], 0)::int
  into streak_longest_win, streak_longest_loss, streak_current_is_win, streak_current_len
  from (
    select is_winner, count(*)::int as streak_len, max(rn) as last_rn
    from (
      select gp.is_winner,
        row_number() over (order by g.created_at asc, g.id asc) as rn,
        row_number() over (order by g.created_at asc, g.id asc)
          - row_number() over (partition by gp.is_winner order by g.created_at asc, g.id asc) as grp
      from public.game_participants as gp
      join public.games as g on g.id = gp.game_id and g.status = 'finished'
      where gp.profile_id = target_profile_id
    ) as tagged
    group by is_winner, grp
  ) as streaks;

  -- Top signals
  if finished_game_count >= 3 then
    if signal_win_rate >= 0.60 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','dominant-win-rate','label','Dominant win conversion','value',concat(round(signal_win_rate*100)::text,'% win rate'),'tone','green'));
    elsif signal_win_rate <= 0.25 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','low-win-rate','label','Low win conversion','value',concat(round(signal_win_rate*100)::text,'% win rate'),'tone','danger'));
    end if;
    if signal_avg_assists >= 1.5 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','high-assists','label','High assist volume','value',concat(round(signal_avg_assists,1)::text,' assists/game'),'tone','blue'));
    end if;
    if signal_avg_failures >= 1.2 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','elevated-failures','label','Elevated failure rate','value',concat(round(signal_avg_failures,1)::text,' failures/game'),'tone','danger'));
    end if;
    if signal_contract_conversion >= 0.80 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','strong-contracts','label','Strong contract execution','value',concat(round(signal_contract_conversion*100)::text,'% conversion'),'tone','green'));
    end if;
    if signal_avg_assists >= 1.2 and signal_win_rate < 0.40 then
      top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','support-low-conversion','label','Support-heavy, low conversion','value',concat(round(signal_avg_assists,1)::text,' assists, ',round(signal_win_rate*100)::text,'% wins'),'tone','accent'));
    end if;
    if streak_current_len >= 3 then
      if streak_current_is_win then
        top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','win-streak','label',concat(streak_current_len::text,'-game win streak'),'value',concat('Wx',streak_current_len::text),'tone','green'));
      else
        top_signals := top_signals || jsonb_build_array(jsonb_build_object('key','loss-streak','label',concat(streak_current_len::text,'-game losing streak'),'value',concat('Lx',streak_current_len::text),'tone','danger'));
      end if;
    end if;
  end if;

  -- Correlations
  if finished_game_count >= 3 then
    correlations_items := jsonb_build_array(
      jsonb_build_object('key','objectives-vs-wins','label','Objective prestige','whenWin',corr_avg_obj_win,'whenLose',corr_avg_obj_lose,'delta',round(corr_avg_obj_win-corr_avg_obj_lose,2),
        'direction',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then 'positive' when corr_avg_obj_win<corr_avg_obj_lose-0.1 then 'negative' else 'neutral' end,
        'description',case when corr_avg_obj_win>corr_avg_obj_lose+0.1 then concat('Avg ',corr_avg_obj_win::text,' in wins vs ',corr_avg_obj_lose::text,' in losses -- objectives track with winning') when corr_avg_obj_win<corr_avg_obj_lose-0.1 then concat('More objectives in losses (',corr_avg_obj_lose::text,') than wins (',corr_avg_obj_win::text,') -- wins come from other sources') else 'Objective prestige does not meaningfully differ between wins and losses' end),
      jsonb_build_object('key','assists-vs-wins','label','Assists','whenWin',corr_avg_assists_win,'whenLose',corr_avg_assists_lose,'delta',round(corr_avg_assists_win-corr_avg_assists_lose,2),
        'direction',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then 'positive' when corr_avg_assists_win<corr_avg_assists_lose-0.1 then 'negative' else 'neutral' end,
        'description',case when corr_avg_assists_win>corr_avg_assists_lose+0.1 then concat('More assists in wins (',corr_avg_assists_win::text,') than losses (',corr_avg_assists_lose::text,')') when corr_avg_assists_win<corr_avg_assists_lose-0.1 then concat('Fewer assists when winning (',corr_avg_assists_win::text,') -- wins rely less on assist-based prestige') else 'Assist volume is similar across wins and losses' end),
      jsonb_build_object('key','failures-vs-wins','label','Failures','whenWin',corr_avg_failures_win,'whenLose',corr_avg_failures_lose,'delta',round(corr_avg_failures_win-corr_avg_failures_lose,2),
        'direction',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then 'positive' when corr_avg_failures_win>corr_avg_failures_lose+0.1 then 'negative' else 'neutral' end,
        'description',case when corr_avg_failures_win<corr_avg_failures_lose-0.1 then concat('Fewer failures when winning (',corr_avg_failures_win::text,' vs ',corr_avg_failures_lose::text,') -- clean play correlates with wins') when corr_avg_failures_win>corr_avg_failures_lose+0.1 then concat('More failures in wins (',corr_avg_failures_win::text,') than losses (',corr_avg_failures_lose::text,') -- aggressive play still converts') else 'Failure count does not meaningfully differ between wins and losses' end));
  end if;

  -- Head-to-head
  select coalesce(jsonb_agg(jsonb_build_object('opponentId',opponent_id,'opponentName',opponent_name,'gamesTogether',games_together,'wins',wins,'losses',losses,'draws',games_together-wins-losses) order by games_together desc, opponent_name asc),'[]'::jsonb)
  into head_to_head
  from (
    select other_p.id as opponent_id, coalesce(nullif(other_p.display_name,''),other_p.player_name,'Player') as opponent_name,
      count(distinct g.id)::int as games_together,
      count(distinct g.id) filter (where g.winner_profile_id=target_profile_id)::int as wins,
      count(distinct g.id) filter (where g.winner_profile_id=other_p.id)::int as losses
    from public.profiles as other_p
    join public.game_participants as gpa on gpa.profile_id=other_p.id
    join public.game_participants as gpb on gpb.game_id=gpa.game_id and gpb.profile_id=target_profile_id
    join public.games as g on g.id=gpa.game_id and g.status='finished'
    where other_p.id<>target_profile_id and other_p.deleted_at is null
    group by other_p.id, other_p.display_name, other_p.player_name
  ) as h;

  -- Position stats
  select coalesce(jsonb_agg(jsonb_build_object('position',start_order,'appearances',appearances,'wins',wins,'winRate',case when appearances>0 then round(wins::numeric/appearances,3) else 0::numeric end,'avgPrestige',avg_prestige) order by start_order asc),'[]'::jsonb)
  into position_stats
  from (select gp.start_order, count(*)::int as appearances, count(*) filter (where gp.is_winner)::int as wins, round(avg(gp.total_prestige),1) as avg_prestige from public.game_participants as gp join public.games as g on g.id=gp.game_id and g.status='finished' where gp.profile_id=target_profile_id group by gp.start_order) as pos_data;

  -- #1 Player count split
  select coalesce(jsonb_agg(jsonb_build_object('playerCount',player_count,'games',games,'wins',wins,'winRate',case when games>0 then round(wins::numeric/games,3) else 0::numeric end,'avgPrestige',avg_prestige,'avgAssists',avg_assists,'avgFailures',avg_failures) order by player_count asc),'[]'::jsonb)
  into player_count_split
  from (
    select pc.player_count, count(distinct g.id)::int as games, count(*) filter (where gp.is_winner)::int as wins,
      round(avg(gp.total_prestige),1) as avg_prestige, round(avg(gp.assists),1) as avg_assists, round(avg(gp.failures),1) as avg_failures
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join lateral (select count(*)::int as player_count from public.game_participants as c where c.game_id=g.id) as pc on true
    where gp.profile_id=target_profile_id group by pc.player_count
  ) as splits;

  -- #2 Halftime profile: was the target player leading at the midpoint of each game?
  with target_halftimes as (
    select gp.game_id, gp.is_winner,
      coalesce(sum(gr.prestige) filter (where gr.round_index < mri.max_ri / 2.0), 0) as my_half
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.game_rounds as gr on gr.participant_id=gp.id
    join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=gp.id) as mri on true
    where gp.profile_id=target_profile_id
    group by gp.game_id, gp.id, gp.is_winner
  ),
  game_max_other as (
    select other_gp.game_id, max(coalesce(oh.prestige,0)) as max_other_half
    from target_halftimes as th
    join public.game_participants as other_gp on other_gp.game_id=th.game_id and other_gp.profile_id<>target_profile_id and other_gp.profile_id is not null
    join lateral (
      select coalesce(sum(gr.prestige) filter (where gr.round_index < mri.max_ri / 2.0),0) as prestige
      from public.game_rounds as gr
      join lateral (select max(round_index)::float as max_ri from public.game_rounds where participant_id=other_gp.id) as mri on true
      where gr.participant_id=other_gp.id
    ) as oh on true
    group by other_gp.game_id
  )
  select count(*)::int,
    count(*) filter (where th.my_half >= coalesce(gmo.max_other_half,0))::int,
    count(*) filter (where th.my_half >= coalesce(gmo.max_other_half,0) and th.is_winner)::int,
    count(*) filter (where th.my_half <  coalesce(gmo.max_other_half,0) and th.is_winner)::int
  into ht_total, ht_lead_count, ht_lead_win_count, ht_trail_win_count
  from target_halftimes as th
  left join game_max_other as gmo on gmo.game_id=th.game_id;

  halftime_profile := jsonb_build_object(
    'totalGames', ht_total, 'leadCount', ht_lead_count,
    'leadRate',       case when ht_total>0             then round(ht_lead_count::numeric/ht_total,3)             else 0::numeric end,
    'leadToWinRate',  case when ht_lead_count>0         then round(ht_lead_win_count::numeric/ht_lead_count,3)    else 0::numeric end,
    'trailToWinRate', case when (ht_total-ht_lead_count)>0 then round(ht_trail_win_count::numeric/(ht_total-ht_lead_count),3) else 0::numeric end,
    'description', case when ht_total=0 then 'No games yet.'
      else concat('Led at halftime in ',ht_lead_count::text,' of ',ht_total::text,' games (',
        round(100.0*ht_lead_count/ht_total,0)::int::text,'%). ',
        case when ht_lead_count>0 then concat('Win rate from lead: ',round(100.0*ht_lead_win_count/ht_lead_count,0)::int::text,'%.') else '' end) end);

  -- Game history
  select coalesce(jsonb_agg(jsonb_build_object('gameId',game_id,'finishedAt',finished_at,'groupName',group_name,'playerCount',player_count,'isWinner',is_winner,'prestige',total_prestige,'prestigeSpread',prestige_spread,'winnerName',winner_name,'assists',assists,'failures',failures,'contracts',contracts) order by finished_at desc, game_id desc),'[]'::jsonb)
  into game_history
  from (
    select g.id as game_id, coalesce(g.finished_at,g.created_at) as finished_at, g.group_name_snapshot as group_name,
      ga.player_count, ga.prestige_spread, gp.is_winner, gp.total_prestige, gp.assists, gp.failures, gp.contracts,
      coalesce(nullif(wp.display_name,''),wp.player_name,'Unknown') as winner_name
    from public.game_participants as gp
    join public.games as g on g.id=gp.game_id and g.status='finished'
    join public.profiles as wp on wp.id=g.winner_profile_id
    join lateral (select count(*)::int as player_count,(max(a.total_prestige)-min(a.total_prestige))::int as prestige_spread from public.game_participants as a where a.game_id=g.id) as ga on true
    where gp.profile_id=target_profile_id
  ) as gd;

  player_options := jsonb_build_array(jsonb_build_object('id',target_profile_id,'label',coalesce(target_display_name,target_player_name,'Current player'),'playerName',target_player_name,'displayName',target_display_name));

  player_detail := jsonb_build_object(
    'playerId', target_profile_id,
    'label', coalesce(target_display_name,target_player_name,'Current player'),
    'summary', case when finished_game_count>0
      then concat('Server-authored player detail across ',finished_game_count::text,' finished game',case when finished_game_count=1 then '' else 's' end,'.')
      else 'No finished games are available for this player yet.' end,
    'stats', jsonb_build_object(
      'games', finished_game_count, 'wins', signal_win_count,
      'winRate', concat(round(signal_win_rate*100),'%'),
      'playerRows', player_row_count,
      'avgPrestige', round(ps_avg_direct+ps_avg_assist_recv+ps_avg_objective,1),
      'contractConversion', concat(round(signal_contract_conversion*100),'%')));

  -- Build payload. 'charts' key is intentionally absent (#3):
  -- get_chart_dataset already handles a missing 'charts' key via its fallback path,
  -- producing identical empty-array output. Removing it cuts payload size ~50%.
  analytics_payload := jsonb_build_object(
    'generatedAt', generated_at,
    'analyticsHome', jsonb_build_object(
      'generatedAt', generated_at, 'daysSinceLastGame', days_since_last_game,
      'hero', jsonb_build_object('players',registered_player_count,'games',finished_game_count,'views',player_row_count),
      'cards', jsonb_build_array(
        jsonb_build_object('key','registered-players','title','Registered players','value',registered_player_count,'description','Players currently available to analytics.'),
        jsonb_build_object('key','tracked-games','title','Tracked games','value',finished_game_count,'description','Finished games involving this profile.'),
        jsonb_build_object('key','player-rows','title','Player rows','value',player_row_count,'description','Saved participant rows available to summarize.'),
        jsonb_build_object('key','days-since-last-game','title','Days since last game','value',coalesce(days_since_last_game::text,'-'),'description','Calendar days since the most recent finished game.'))),
    'statsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'overview', jsonb_build_object(
        'hero', jsonb_build_object('title','Stats overview','takeaway',case when finished_game_count>0 then 'Server-authored stats are available for this profile.' else 'No finished games are available for this profile yet.' end,'games',finished_game_count,'players',registered_player_count),
        'cards', jsonb_build_array(jsonb_build_object('key','games-played','title','Games played','value',finished_game_count),jsonb_build_object('key','players-seen','title','Players in network','value',registered_player_count)),
        'topSignals', top_signals,
        'streaks', jsonb_build_object('currentStreak',streak_current_len,'currentStreakIsWin',streak_current_is_win,'longestWinStreak',streak_longest_win,'longestLossStreak',streak_longest_loss),
        'positionStats', position_stats,
        'playerCountSplit', player_count_split,
        'halftimeProfile', halftime_profile),
      'players', jsonb_build_object('options',player_options,'selectedPlayerId',target_profile_id,'detail',player_detail),
      'prestigeSources', prestige_sources,
      'paceProfile', jsonb_build_object('avgFirstHalf',pace_avg_first_half,'avgSecondHalf',pace_avg_second_half,'avgLateDelta',pace_avg_late_delta,'avgFirstHalfWin',pace_avg_first_half_win,'avgFirstHalfLose',pace_avg_first_half_lose,
        'description',case when finished_game_count=0 then 'No games yet.' else concat('Avg prestige: ',pace_avg_first_half::text,' (first half) -> ',pace_avg_second_half::text,' (second half), +',pace_avg_late_delta::text,'.') end),
      'roundPhaseStats', round_phase_stats,
      'consistencyProfile', consistency_profile,
      'playstyle', jsonb_build_object('label',playstyle_label,'summary',playstyle_summary,'highlights',playstyle_highlights),
      'correlations', jsonb_build_object(
        'summary',case when finished_game_count<3 then 'Need at least 3 games for meaningful correlation analysis.' else concat(jsonb_array_length(correlations_items)::text,' stats analyzed across ',finished_game_count::text,' games.') end,
        'items',correlations_items,'selectedKey',null),
      'games', jsonb_build_object('items',game_history,'selectedGameId',null,'detail',null)),
    'insightsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'meta', jsonb_build_object('games',finished_game_count,'playerRows',player_row_count),
      'topSignals', top_signals, 'rivalries', head_to_head,
      'assistNetwork', jsonb_build_object('nodes','[]'::jsonb,'edges','[]'::jsonb),
      'correlations', jsonb_build_object(
        'summary',case when finished_game_count<3 then 'Need at least 3 games for meaningful correlation analysis.' else 'Win/loss correlations across objectives, assists, and failures.' end,
        'items',correlations_items,'selectedKey',null)));

  insert into public.personal_stats_rollups (profile_id, payload, updated_at)
  values (target_profile_id, analytics_payload, generated_at)
  on conflict (profile_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;

  insert into public.global_stats_rollups (key, payload, updated_at)
  values ('overview', jsonb_build_object(
    'gamesPlayed',(select count(*) from public.games where public.games.status='finished'),
    'playersRegistered',(select count(*) from public.profiles),
    'lastGameId',(select public.games.id from public.games where public.games.status='finished' order by public.games.created_at desc, public.games.id desc limit 1)
  ), now())
  on conflict (key) do update set payload=excluded.payload, updated_at=excluded.updated_at;

  insert into public.group_stats_rollups (group_id, payload, updated_at)
  select g.id, jsonb_build_object('groupId',g.id,'name',g.name,'gamesPlayed',coalesce(gc.game_count,0),'lastGameId',gc.last_game_id,'memberCount',coalesce(mc.member_count,0)), now()
  from public.groups as g
  left join lateral (select count(*)::int as game_count,(array_agg(games.id order by games.created_at desc,games.id desc))[1] as last_game_id from public.games as games where games.group_id=g.id and games.status='finished') as gc on true
  left join lateral (select count(*)::int as member_count from public.group_members as gm where gm.group_id=g.id) as mc on true
  where coalesce(gc.game_count,0)>0
  on conflict (group_id) do update set payload=excluded.payload, updated_at=excluded.updated_at;

  return jsonb_build_object('refreshed',true,'profileId',target_profile_id,'generatedAt',generated_at);
end;
$$;

-- Backfill all profiles
do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null order by created_at asc loop
    perform private.admin_refresh_analytics(p.id);
  end loop;
end;
$$;

