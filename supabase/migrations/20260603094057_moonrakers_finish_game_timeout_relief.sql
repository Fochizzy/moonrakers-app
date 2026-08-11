create or replace function private.refresh_completed_game_participant_rollup(
  target_game_id uuid,
  target_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_game_id uuid;
  resolved_host_profile_id uuid;
begin
  if target_game_id is null then
    raise exception 'target_game_id is required';
  end if;

  if target_profile_id is null then
    raise exception 'target_profile_id is required';
  end if;

  select
    public.games.id,
    public.games.host_profile_id
  into
    resolved_game_id,
    resolved_host_profile_id
  from public.games
  where public.games.id = target_game_id
    and public.games.status = 'finished';

  if resolved_game_id is null then
    raise exception 'finished game not found';
  end if;

  if resolved_host_profile_id <> (select auth.uid()) then
    raise exception 'only the host can refresh this game';
  end if;

  if not exists (
    select 1
    from public.game_participants
    where public.game_participants.game_id = target_game_id
      and public.game_participants.profile_id = target_profile_id
  ) then
    raise exception 'participant not found for game';
  end if;

  perform private.admin_refresh_analytics(target_profile_id);
  perform private.post_process_analytics(target_profile_id);

  return jsonb_build_object(
    'refreshed', true,
    'gameId', target_game_id,
    'profileId', target_profile_id,
    'generatedAt', now()
  );
end;
$$;

revoke all on function private.refresh_completed_game_participant_rollup(uuid, uuid) from public;
revoke all on function private.refresh_completed_game_participant_rollup(uuid, uuid) from anon;
revoke all on function private.refresh_completed_game_participant_rollup(uuid, uuid) from authenticated;

create or replace function public.refresh_completed_game_participant_rollup(
  target_game_id uuid,
  target_profile_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.refresh_completed_game_participant_rollup(
    target_game_id,
    target_profile_id
  );
$$;

revoke all on function public.refresh_completed_game_participant_rollup(uuid, uuid) from public;
revoke all on function public.refresh_completed_game_participant_rollup(uuid, uuid) from anon;
grant execute on function public.refresh_completed_game_participant_rollup(uuid, uuid) to authenticated;

create or replace function private.refresh_elo_rollups()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  perform private.refresh_all_elo_snapshots();

  return jsonb_build_object(
    'refreshed', true,
    'generatedAt', now()
  );
end;
$$;

revoke all on function private.refresh_elo_rollups() from public;
revoke all on function private.refresh_elo_rollups() from anon;
revoke all on function private.refresh_elo_rollups() from authenticated;

create or replace function public.refresh_elo_rollups()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.refresh_elo_rollups();
$$;

revoke all on function public.refresh_elo_rollups() from public;
revoke all on function public.refresh_elo_rollups() from anon;
grant execute on function public.refresh_elo_rollups() to authenticated;

create or replace function public.save_completed_game(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  new_game_id        uuid;
  existing_game_id   uuid;
  requested_host_profile_id   uuid;
  requested_group_id          uuid;
  requested_winner_profile_id uuid;
  requested_client_game_id    uuid;
  participant_count  int;
begin
  requested_host_profile_id   := nullif(payload->>'host_profile_id', '')::uuid;
  requested_group_id          := nullif(payload->>'group_id', '')::uuid;
  requested_winner_profile_id := nullif(payload->>'winner_profile_id', '')::uuid;
  requested_client_game_id    := nullif(payload->>'client_game_id', '')::uuid;
  participant_count := coalesce(jsonb_array_length(coalesce(payload->'participants','[]'::jsonb)), 0);

  if requested_host_profile_id is null or requested_host_profile_id <> (select auth.uid()) then
    raise exception 'host_profile_id must match the authenticated profile';
  end if;

  if participant_count < 2 or participant_count > 5 then
    raise exception 'games must have between 2 and 5 participants';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants','[]'::jsonb)) as r(item)
    where nullif(r.item->>'profile_id','') is null
  ) then
    raise exception 'all new-game participants are registered';
  end if;

  if requested_client_game_id is not null then
    select public.games.id
    into existing_game_id
    from public.games
    where public.games.client_game_id = requested_client_game_id
      and public.games.host_profile_id = requested_host_profile_id;

    if existing_game_id is not null then
      return existing_game_id;
    end if;
  end if;

  perform set_config('app.skip_rollup_trigger', 'true', true);

  insert into public.games (
    host_profile_id,
    group_id,
    group_name_snapshot,
    status,
    created_at,
    finished_at,
    winner_profile_id,
    client_game_id
  ) values (
    requested_host_profile_id,
    requested_group_id,
    nullif(payload->>'group_name_snapshot', ''),
    'finished',
    case
      when nullif(payload->>'created_at','') is null then now()
      else (payload->>'created_at')::timestamptz
    end,
    now(),
    requested_winner_profile_id,
    requested_client_game_id
  )
  returning id into new_game_id;

  with participant_rows as (
    select row_number() over () as row_num, item
    from jsonb_array_elements(coalesce(payload->'participants','[]'::jsonb)) as r(item)
  )
  insert into public.game_participants (
    game_id,
    profile_id,
    player_name_snapshot,
    display_name_snapshot,
    color_snapshot,
    assigned_card_art_index_snapshot,
    start_order,
    total_prestige,
    direct_prestige,
    assist_prestige_received,
    objective_prestige,
    score,
    assists,
    failures,
    contracts,
    is_winner
  )
  select
    new_game_id,
    nullif(participant_rows.item->>'profile_id','')::uuid,
    coalesce(nullif(participant_rows.item->>'player_name_snapshot',''),'Unknown Player'),
    nullif(participant_rows.item->>'display_name_snapshot',''),
    nullif(participant_rows.item->>'color_snapshot',''),
    case
      when jsonb_typeof(participant_rows.item->'assigned_card_art_index_snapshot')='number'
        then (participant_rows.item->>'assigned_card_art_index_snapshot')::int
      else null
    end,
    coalesce((participant_rows.item->>'start_order')::int, participant_rows.row_num - 1),
    coalesce((participant_rows.item->>'total_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'direct_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'assist_prestige_received')::numeric, 0),
    coalesce((participant_rows.item->>'objective_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'score')::numeric, 0),
    coalesce((participant_rows.item->>'assists')::int, 0),
    coalesce((participant_rows.item->>'failures')::int, 0),
    coalesce((participant_rows.item->>'contracts')::int, 0),
    coalesce(
      nullif(participant_rows.item->>'profile_id','')::uuid = requested_winner_profile_id,
      false
    )
  from participant_rows;

  insert into public.game_rounds (
    game_id,
    participant_id,
    round_index,
    prestige,
    contracts,
    failures,
    assist_recipients,
    assist_prestige_recipients,
    objective_count,
    objective_prestige,
    created_at
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

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values ('overview', jsonb_build_object(
    'gamesPlayed',       (select count(*) from public.games where public.games.status='finished'),
    'playersRegistered', (select count(*) from public.profiles where public.profiles.deleted_at is null),
    'lastGameId',        new_game_id
  ), now())
  on conflict (key) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  if requested_group_id is not null then
    insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
    values (requested_group_id, jsonb_build_object(
      'groupId',     requested_group_id,
      'gamesPlayed', (
        select count(*)
        from public.games
        where public.games.group_id = requested_group_id
      ),
      'lastGameId',  new_game_id
    ), now())
    on conflict (group_id) do update
      set payload = excluded.payload,
          updated_at = excluded.updated_at;
  end if;

  return new_game_id;
end;
$$;
