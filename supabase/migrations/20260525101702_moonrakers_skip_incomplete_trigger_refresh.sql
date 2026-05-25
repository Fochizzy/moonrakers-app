-- Recovered from live supabase_migrations.schema_migrations on 2026-05-25 to reconcile local migration history.

-- #1a: Trigger checks session variable ? skips wasted incomplete refresh during save_completed_game
create or replace function private.trigger_refresh_participant_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- save_completed_game sets app.skip_rollup_trigger = 'true' (LOCAL to its transaction)
  -- then calls admin_refresh_analytics for all participants after rounds are fully inserted.
  -- Without this check, each participant INSERT fires a rollup with 0 round data ? wasted work.
  if current_setting('app.skip_rollup_trigger', true) = 'true' then
    return new;
  end if;
  if new.profile_id is not null then
    perform private.admin_refresh_analytics(new.profile_id);
  end if;
  return new;
end;
$$;


-- #1b: save_completed_game sets the skip flag before inserting participants
create or replace function public.save_completed_game(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  new_game_id uuid;
  host_profile_id uuid;
  saved_group_id uuid;
  winner_profile_id uuid;
  participant_count int;
begin
  host_profile_id    := nullif(payload->>'host_profile_id', '')::uuid;
  saved_group_id     := nullif(payload->>'group_id', '')::uuid;
  winner_profile_id  := nullif(payload->>'winner_profile_id', '')::uuid;
  participant_count  := coalesce(jsonb_array_length(coalesce(payload->'participants', '[]'::jsonb)), 0);

  if host_profile_id is null or host_profile_id <> (select auth.uid()) then
    raise exception 'host_profile_id must match the authenticated profile';
  end if;

  if participant_count < 2 or participant_count > 5 then
    raise exception 'games must have between 2 and 5 participants';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant_row(item)
    where nullif(participant_row.item->>'profile_id', '') is null
  ) then
    raise exception 'all new-game participants are registered';
  end if;

  -- #1: Suppress the AFTER INSERT trigger on game_participants for this transaction.
  -- The trigger fires before rounds exist, producing incomplete rollups. We call
  -- admin_refresh_analytics for all participants at the end of this function (with full data).
  perform set_config('app.skip_rollup_trigger', 'true', true);

  insert into public.games (
    host_profile_id, group_id, group_name_snapshot, status, created_at, finished_at, winner_profile_id
  ) values (
    host_profile_id, saved_group_id,
    nullif(payload->>'group_name_snapshot', ''),
    'finished',
    case when nullif(payload->>'created_at', '') is null then now() else (payload->>'created_at')::timestamptz end,
    now(),
    winner_profile_id
  ) returning id into new_game_id;

  with participant_rows as (
    select row_number() over () as row_num, item
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant_row(item)
  )
  insert into public.game_participants (
    game_id, profile_id, player_name_snapshot, display_name_snapshot,
    color_snapshot, assigned_card_art_index_snapshot, start_order,
    total_prestige, direct_prestige, assist_prestige_received, objective_prestige,
    score, assists, failures, contracts, is_winner
  )
  select
    new_game_id,
    nullif(participant_rows.item->>'profile_id', '')::uuid,
    coalesce(nullif(participant_rows.item->>'player_name_snapshot', ''), 'Unknown Player'),
    nullif(participant_rows.item->>'display_name_snapshot', ''),
    nullif(participant_rows.item->>'color_snapshot', ''),
    case when jsonb_typeof(participant_rows.item->'assigned_card_art_index_snapshot') = 'number' then (participant_rows.item->>'assigned_card_art_index_snapshot')::int else null end,
    coalesce((participant_rows.item->>'start_order')::int, participant_rows.row_num - 1),
    coalesce((participant_rows.item->>'total_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'direct_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'assist_prestige_received')::numeric, 0),
    coalesce((participant_rows.item->>'objective_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'score')::numeric, 0),
    coalesce((participant_rows.item->>'assists')::int, 0),
    coalesce((participant_rows.item->>'failures')::int, 0),
    coalesce((participant_rows.item->>'contracts')::int, 0),
    coalesce(nullif(participant_rows.item->>'profile_id', '')::uuid = winner_profile_id, false)
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
    coalesce(round_rows.item->'assist_recipients', '{}'::jsonb),
    coalesce(round_rows.item->'assist_prestige_recipients', '{}'::jsonb),
    coalesce((round_rows.item->>'objective_count')::int, 0),
    coalesce((round_rows.item->>'objective_prestige')::numeric, 0),
    now()
  from jsonb_array_elements(coalesce(payload->'rounds', '[]'::jsonb)) as round_rows(item)
  join public.game_participants as participants
    on participants.game_id = new_game_id
   and participants.profile_id = nullif(round_rows.item->>'participant_id', '')::uuid;

  -- Refresh all registered participant rollups now that rounds are fully inserted.
  perform private.admin_refresh_analytics(gp.profile_id)
  from public.game_participants as gp
  where gp.game_id = new_game_id and gp.profile_id is not null;

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values ('overview', jsonb_build_object(
    'gamesPlayed',      (select count(*) from public.games where public.games.status = 'finished'),
    'playersRegistered',(select count(*) from public.profiles where public.profiles.deleted_at is null),
    'lastGameId',        new_game_id), now())
  on conflict (key) do update set payload = excluded.payload, updated_at = excluded.updated_at;

  if saved_group_id is not null then
    insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
    values (saved_group_id, jsonb_build_object(
      'groupId', saved_group_id,
      'gamesPlayed', (select count(*) from public.games where public.games.group_id = saved_group_id),
      'lastGameId', new_game_id), now())
    on conflict (group_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
  end if;

  return new_game_id;
end;
$$;


-- #2: Partial index on finished games ordered by created_at.
-- Covers: ELO replay ORDER BY, game history ORDER BY, all target_games CTEs in insights.
create index if not exists games_finished_created_at_idx
  on public.games(created_at asc)
  where status = 'finished';


-- #4: get_stats_screen ? remove permanently dead live-compute fallback.
-- All rollups have playstyle.label; the fallback (9KB) never ran and omits
-- newer fields (sessionProfile, totalScore, totalPrestige, totalCount, etc.).
-- New shape: pure rollup read with a minimal empty state for new profiles.
create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
set search_path = 'public'
as $$
declare
  target_profile_id uuid := coalesce(profile_id, auth.uid());
  rollup_stats jsonb;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select psr.payload->'statsScreen'
  into rollup_stats
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_profile_id;

  if rollup_stats is not null then
    return rollup_stats;
  end if;

  -- No rollup yet (new profile, no finished games).
  -- admin_refresh_analytics populates it at the end of the first save_completed_game.
  return jsonb_build_object(
    'generatedAt', now(),
    'emptyState', jsonb_build_object(
      'title',       'No data yet',
      'description', 'Stats will appear after your first finished game.'
    )
  );
end;
$$;

