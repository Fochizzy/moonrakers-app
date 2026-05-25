
-- #1: delete_completed_game — refresh ALL registered participants, not just the host.
-- Captures participant IDs before deletion (CASCADE removes rows), then calls
-- admin_refresh_analytics for each. SECURITY DEFINER allows calling admin_refresh_analytics
-- for profiles other than the caller.
create or replace function private.delete_completed_game(target_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_game_id       uuid;
  deleted_group_id      uuid;
  deleted_host_profile_id uuid;
  latest_finished_game_id uuid;
  latest_group_game_id  uuid;
  participant_ids       uuid[];   -- captured before DELETE cascades them away
begin
  if target_game_id is null then
    raise exception 'target_game_id is required';
  end if;

  -- Capture participant IDs BEFORE deletion so we can refresh their rollups after.
  select array_agg(distinct gp.profile_id) filter (where gp.profile_id is not null)
  into participant_ids
  from public.game_participants as gp
  where gp.game_id = target_game_id;

  select public.games.id, public.games.group_id, public.games.host_profile_id
  into deleted_game_id, deleted_group_id, deleted_host_profile_id
  from public.games where public.games.id = target_game_id;

  if deleted_game_id is null then
    raise exception 'game not found';
  end if;

  if deleted_host_profile_id <> (select auth.uid()) then
    raise exception 'only the host can delete this game';
  end if;

  delete from public.games
  where public.games.id = target_game_id
    and public.games.host_profile_id = (select auth.uid());

  if not found then
    raise exception 'game delete failed';
  end if;

  select public.games.id into latest_finished_game_id
  from public.games where public.games.status = 'finished'
  order by public.games.created_at desc, public.games.id desc limit 1;

  insert into public.global_stats_rollups (key, payload, updated_at)
  values ('overview', jsonb_build_object(
    'gamesPlayed',      (select count(*) from public.games where public.games.status = 'finished'),
    'playersRegistered',(select count(*) from public.profiles where public.profiles.deleted_at is null),
    'lastGameId',        latest_finished_game_id), now())
  on conflict (key) do update set payload = excluded.payload, updated_at = excluded.updated_at;

  if deleted_group_id is not null then
    select public.games.id into latest_group_game_id
    from public.games where public.games.group_id = deleted_group_id
    order by public.games.created_at desc, public.games.id desc limit 1;

    if latest_group_game_id is null then
      delete from public.group_stats_rollups where group_stats_rollups.group_id = deleted_group_id;
    else
      insert into public.group_stats_rollups (group_id, payload, updated_at)
      values (deleted_group_id, jsonb_build_object(
        'groupId',     deleted_group_id,
        'gamesPlayed', (select count(*) from public.games where public.games.group_id = deleted_group_id),
        'lastGameId',  latest_group_game_id), now())
      on conflict (group_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
    end if;
  end if;

  -- Refresh ALL registered participants (admin_refresh_analytics has no auth gate)
  if participant_ids is not null then
    perform private.admin_refresh_analytics(pid)
    from unnest(participant_ids) as pid;
  end if;

  return deleted_game_id;
end;
$$;


-- #2a: delete_my_profile — stop nullifying winner_profile_id.
-- Nullifying it turns historical wins into draws in the ELO replay for all other players,
-- silently corrupting their ratings. The UUID can remain as a tombstone reference.
-- The ELO replay (updated in the next migration) detects winner-not-in-participants
-- and treats those games as draws, which is far more accurate.
create or replace function public.delete_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  current_profile_id uuid := (select auth.uid());
  replacement_name   constant text := 'Mx. Doe';
begin
  if current_profile_id is null then
    raise exception 'authenticated profile required';
  end if;

  if not exists (
    select 1 from public.profiles
    where profiles.id = current_profile_id and profiles.deleted_at is null
  ) then
    raise exception 'active profile not found';
  end if;

  delete from public.group_members where group_members.profile_id = current_profile_id;
  delete from public.groups       where groups.created_by          = current_profile_id;

  -- Anonymise participant rows. Setting profile_id → null means the ELO replay
  -- excludes this player from future recalculations while preserving game structure.
  update public.game_participants
  set profile_id                    = null,
      player_name_snapshot          = replacement_name,
      display_name_snapshot         = replacement_name,
      color_snapshot                = null,
      assigned_card_art_index_snapshot = null
  where game_participants.profile_id = current_profile_id;

  -- winner_profile_id is intentionally NOT cleared.
  -- The UUID stays as a tombstone so the ELO replay can detect "winner not in
  -- active participants" and apply a draw score rather than scoring everyone 0.

  update public.games set host_profile_id = null
  where games.host_profile_id = current_profile_id;

  update public.profiles
  set player_name          = concat('deleted-', replace(current_profile_id::text, '-', '')),
      display_name         = replacement_name,
      favorite_color       = null,
      assigned_card_art_index = null,
      deleted_at           = now(),
      updated_at           = now()
  where profiles.id = current_profile_id;

  delete from auth.users where auth.users.id = current_profile_id;

  return jsonb_build_object(
    'status',               'ok',
    'replacement_name',     replacement_name,
    'deleted_auth_user_id', current_profile_id);
end;
$$;
;
