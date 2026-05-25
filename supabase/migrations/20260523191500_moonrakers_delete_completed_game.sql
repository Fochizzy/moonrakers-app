create or replace function private.delete_completed_game(target_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_game_id uuid;
  deleted_group_id uuid;
  deleted_host_profile_id uuid;
  latest_finished_game_id uuid;
  latest_group_game_id uuid;
begin
  if target_game_id is null then
    raise exception 'target_game_id is required';
  end if;

  select
    public.games.id,
    public.games.group_id,
    public.games.host_profile_id
  into
    deleted_game_id,
    deleted_group_id,
    deleted_host_profile_id
  from public.games
  where public.games.id = target_game_id;

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

  select public.games.id
  into latest_finished_game_id
  from public.games
  where public.games.status = 'finished'
  order by public.games.created_at desc, public.games.id desc
  limit 1;

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values (
    'overview',
    jsonb_build_object(
      'gamesPlayed', (select count(*) from public.games where public.games.status = 'finished'),
      'playersRegistered', (select count(*) from public.profiles),
      'lastGameId', latest_finished_game_id
    ),
    now()
  )
  on conflict (key) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  if deleted_group_id is not null then
    select public.games.id
    into latest_group_game_id
    from public.games
    where public.games.group_id = deleted_group_id
    order by public.games.created_at desc, public.games.id desc
    limit 1;

    if latest_group_game_id is null then
      delete from public.group_stats_rollups
      where public.group_stats_rollups.group_id = deleted_group_id;
    else
      insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
      values (
        deleted_group_id,
        jsonb_build_object(
          'groupId', deleted_group_id,
          'gamesPlayed', (
            select count(*)
            from public.games
            where public.games.group_id = deleted_group_id
          ),
          'lastGameId', latest_group_game_id
        ),
        now()
      )
      on conflict (group_id) do update
        set payload = excluded.payload,
            updated_at = excluded.updated_at;
    end if;
  end if;

  perform private.refresh_server_authored_analytics((select auth.uid()));

  return deleted_game_id;
end;
$$;

revoke all on function private.delete_completed_game(uuid) from public;
revoke all on function private.delete_completed_game(uuid) from anon;
revoke all on function private.delete_completed_game(uuid) from authenticated;

create or replace function public.delete_completed_game(target_game_id uuid)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select private.delete_completed_game(target_game_id);
$$;

revoke all on function public.delete_completed_game(uuid) from public;
revoke all on function public.delete_completed_game(uuid) from anon;

grant execute on function public.delete_completed_game(uuid) to authenticated;
