
-- #1 + #5: post_process_analytics
-- Computes halftime closing signals and big-turn stats, patches rollup in place.
-- Called after admin_refresh_analytics in save_completed_game and delete_completed_game.
create or replace function private.post_process_analytics(target_profile_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  ht_lead_count    int     := 0;
  ht_total         int     := 0;
  ht_lead_win_rate numeric := 0;
  big_turn_rate    numeric := 0;
  big_turn_win_rate numeric := 0;
  existing_signals jsonb   := '[]'::jsonb;
  new_signals      jsonb   := '[]'::jsonb;
begin
  -- Read halftime stats and existing signals from the freshly-written rollup
  select
    coalesce((psr.payload->'statsScreen'->'overview'->'halftimeProfile'->>'leadCount')::int, 0),
    coalesce((psr.payload->'statsScreen'->'overview'->'halftimeProfile'->>'totalGames')::int, 0),
    coalesce((psr.payload->'statsScreen'->'overview'->'halftimeProfile'->>'leadToWinRate')::numeric, 0),
    coalesce(psr.payload->'statsScreen'->'overview'->'topSignals', '[]'::jsonb)
  into ht_lead_count, ht_total, ht_lead_win_rate, existing_signals
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_profile_id;

  -- Strip any previous halftime signals to avoid duplicates on re-run
  select coalesce(jsonb_agg(s), '[]'::jsonb) into new_signals
  from jsonb_array_elements(existing_signals) as s
  where (s->>'key') not in ('halftime-lead-no-convert', 'halftime-lead-low-convert');

  -- #1a: Never closes from a halftime lead (≥3 leads, 0% close rate)
  if ht_lead_count >= 3 and ht_lead_win_rate = 0 then
    new_signals := new_signals || jsonb_build_array(jsonb_build_object(
      'key',   'halftime-lead-no-convert',
      'label', 'Leads at half — never closes',
      'value', concat(ht_lead_count::text, ' half-leads, 0% close rate'),
      'tone',  'danger'
    ));
  -- #1b: Leads often but low close rate (≥5 leads, ≤50% close rate, but not 0%)
  elsif ht_lead_count >= 5 and ht_lead_win_rate > 0 and ht_lead_win_rate <= 0.50 then
    new_signals := new_signals || jsonb_build_array(jsonb_build_object(
      'key',   'halftime-lead-low-convert',
      'label', 'Leads often, struggles to close',
      'value', concat(
        round(100.0 * ht_lead_count / nullif(ht_total, 0))::int::text,
        '% half-lead rate, ',
        round(ht_lead_win_rate * 100)::int::text,
        '% close rate'
      ),
      'tone',  'accent'
    ));
  end if;

  -- #5: Fraction of all rounds where player scores ≥3 prestige in one turn
  select coalesce(round(
    count(*) filter (where gr.prestige >= 3)::numeric / nullif(count(*), 0), 3
  ), 0)
  into big_turn_rate
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  join public.game_rounds as gr on gr.participant_id = gp.id
  where gp.profile_id = target_profile_id;

  -- #5: Win rate in games that contained at least one big-turn round
  select coalesce(round(avg(gp.is_winner::int), 3), 0)
  into big_turn_win_rate
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  where gp.profile_id = target_profile_id
    and exists (
      select 1 from public.game_rounds as gr
      where gr.participant_id = gp.id and gr.prestige >= 3
    );

  -- Patch rollup: topSignals in statsScreen + insightsScreen; bigTurn in consistencyProfile
  update public.personal_stats_rollups
  set payload =
    payload
    || jsonb_build_object(
        'statsScreen',
        (payload->'statsScreen') || jsonb_build_object(
          'overview',
          (payload->'statsScreen'->'overview') || jsonb_build_object(
            'topSignals', new_signals
          ),
          'consistencyProfile',
          (payload->'statsScreen'->'consistencyProfile') || jsonb_build_object(
            'bigTurnRate',    big_turn_rate,
            'bigTurnWinRate', big_turn_win_rate
          )
        ),
        'insightsScreen',
        (payload->'insightsScreen') || jsonb_build_object('topSignals', new_signals)
      )
  where profile_id = target_profile_id;
end;
$$;


-- Updated save_completed_game: adds post_process_analytics + refresh_all_elo_snapshots
create or replace function public.save_completed_game(payload jsonb)
returns uuid language plpgsql security definer set search_path = 'public'
as $$
declare
  new_game_id        uuid;
  existing_game_id   uuid;
  host_profile_id    uuid;
  saved_group_id     uuid;
  winner_profile_id  uuid;
  client_game_id     uuid;
  participant_count  int;
begin
  host_profile_id   := nullif(payload->>'host_profile_id', '')::uuid;
  saved_group_id    := nullif(payload->>'group_id', '')::uuid;
  winner_profile_id := nullif(payload->>'winner_profile_id', '')::uuid;
  client_game_id    := nullif(payload->>'client_game_id', '')::uuid;
  participant_count := coalesce(jsonb_array_length(coalesce(payload->'participants','[]'::jsonb)), 0);

  if host_profile_id is null or host_profile_id <> (select auth.uid()) then
    raise exception 'host_profile_id must match the authenticated profile';
  end if;
  if participant_count < 2 or participant_count > 5 then
    raise exception 'games must have between 2 and 5 participants';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(payload->'participants','[]'::jsonb)) as r(item)
    where nullif(r.item->>'profile_id','') is null
  ) then
    raise exception 'all new-game participants are registered';
  end if;

  if client_game_id is not null then
    select id into existing_game_id
    from public.games
    where public.games.client_game_id = save_completed_game.client_game_id
      and public.games.host_profile_id = save_completed_game.host_profile_id;
    if existing_game_id is not null then return existing_game_id; end if;
  end if;

  perform set_config('app.skip_rollup_trigger', 'true', true);

  insert into public.games (
    host_profile_id, group_id, group_name_snapshot, status, created_at, finished_at,
    winner_profile_id, client_game_id
  ) values (
    host_profile_id, saved_group_id,
    nullif(payload->>'group_name_snapshot', ''),
    'finished',
    case when nullif(payload->>'created_at','') is null then now()
         else (payload->>'created_at')::timestamptz end,
    now(), winner_profile_id, client_game_id
  ) returning id into new_game_id;

  with participant_rows as (
    select row_number() over () as row_num, item
    from jsonb_array_elements(coalesce(payload->'participants','[]'::jsonb)) as r(item)
  )
  insert into public.game_participants (
    game_id, profile_id, player_name_snapshot, display_name_snapshot,
    color_snapshot, assigned_card_art_index_snapshot, start_order,
    total_prestige, direct_prestige, assist_prestige_received, objective_prestige,
    score, assists, failures, contracts, is_winner
  )
  select
    new_game_id,
    nullif(participant_rows.item->>'profile_id','')::uuid,
    coalesce(nullif(participant_rows.item->>'player_name_snapshot',''),'Unknown Player'),
    nullif(participant_rows.item->>'display_name_snapshot',''),
    nullif(participant_rows.item->>'color_snapshot',''),
    case when jsonb_typeof(participant_rows.item->'assigned_card_art_index_snapshot')='number'
         then (participant_rows.item->>'assigned_card_art_index_snapshot')::int else null end,
    coalesce((participant_rows.item->>'start_order')::int, participant_rows.row_num - 1),
    coalesce((participant_rows.item->>'total_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'direct_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'assist_prestige_received')::numeric, 0),
    coalesce((participant_rows.item->>'objective_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'score')::numeric, 0),
    coalesce((participant_rows.item->>'assists')::int, 0),
    coalesce((participant_rows.item->>'failures')::int, 0),
    coalesce((participant_rows.item->>'contracts')::int, 0),
    coalesce(nullif(participant_rows.item->>'profile_id','')::uuid = winner_profile_id, false)
  from participant_rows;

  insert into public.game_rounds (
    game_id, participant_id, round_index, prestige, contracts, failures,
    assist_recipients, assist_prestige_recipients, objective_count, objective_prestige, created_at
  )
  select
    new_game_id,
    participants.id,
    coalesce((round_rows.item->>'round_index')::int, 0),
    coalesce((round_rows.item->>'prestige')::numeric, 0),
    coalesce((round_rows.item->>'contracts')::int, 0),
    coalesce((round_rows.item->>'failures')::int, 0),
    coalesce(round_rows.item->'assist_recipients','{}'::jsonb),
    coalesce(round_rows.item->'assist_prestige_recipients','{}'::jsonb),
    coalesce((round_rows.item->>'objective_count')::int, 0),
    coalesce((round_rows.item->>'objective_prestige')::numeric, 0),
    now()
  from jsonb_array_elements(coalesce(payload->'rounds','[]'::jsonb)) as round_rows(item)
  join public.game_participants as participants
    on participants.game_id = new_game_id
   and participants.profile_id = nullif(round_rows.item->>'participant_id','')::uuid;

  -- Core per-player analytics rollup
  perform private.admin_refresh_analytics(gp.profile_id)
  from public.game_participants as gp
  where gp.game_id = new_game_id and gp.profile_id is not null;

  -- #1 + #5: Halftime signals + big-turn stats (post-process after rollup is written)
  perform private.post_process_analytics(gp.profile_id)
  from public.game_participants as gp
  where gp.game_id = new_game_id and gp.profile_id is not null;

  -- #3: Refresh ELO snapshot for all players (single replay, stored in rollup)
  perform private.refresh_all_elo_snapshots();

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values ('overview', jsonb_build_object(
    'gamesPlayed',       (select count(*) from public.games where public.games.status='finished'),
    'playersRegistered', (select count(*) from public.profiles where public.profiles.deleted_at is null),
    'lastGameId',        new_game_id), now())
  on conflict (key) do update set payload=excluded.payload, updated_at=excluded.updated_at;

  if saved_group_id is not null then
    insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
    values (saved_group_id, jsonb_build_object(
      'groupId',     saved_group_id,
      'gamesPlayed', (select count(*) from public.games where public.games.group_id=saved_group_id),
      'lastGameId',  new_game_id), now())
    on conflict (group_id) do update set payload=excluded.payload, updated_at=excluded.updated_at;
  end if;

  return new_game_id;
end;
$$;


-- Backfill: patch all existing rollups with halftime signals + big turn stats
do $$
declare p record;
begin
  for p in select id from public.profiles where deleted_at is null loop
    perform private.post_process_analytics(p.id);
  end loop;
end;
$$;
;
