create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.refresh_rollups_after_legacy_import(target_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  refreshed_group_count int := 0;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values (
    'overview',
    jsonb_build_object(
      'gamesPlayed', (
        select count(*)
        from public.games
        where public.games.status = 'finished'
      ),
      'playersRegistered', (
        select count(*)
        from public.profiles
      ),
      'lastGameId', (
        select public.games.id
        from public.games
        where public.games.status = 'finished'
        order by public.games.created_at desc, public.games.id desc
        limit 1
      )
    ),
    now()
  )
  on conflict (key) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
  select
    public.groups.id,
    jsonb_build_object(
      'groupId', public.groups.id,
      'name', public.groups.name,
      'gamesPlayed', count(public.games.id),
      'lastGameId', (
        select latest_game.id
        from public.games as latest_game
        where latest_game.group_id = public.groups.id
          and latest_game.status = 'finished'
        order by latest_game.created_at desc, latest_game.id desc
        limit 1
      )
    ),
    now()
  from public.groups
  left join public.games
    on public.games.group_id = public.groups.id
   and public.games.status = 'finished'
  where public.groups.created_by = target_profile_id
  group by public.groups.id, public.groups.name
  on conflict (group_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  get diagnostics refreshed_group_count = row_count;

  return jsonb_build_object(
    'globalRefreshed', true,
    'groupCount', refreshed_group_count
  );
end;
$$;

revoke all on function private.refresh_rollups_after_legacy_import(uuid) from public;
revoke all on function private.refresh_rollups_after_legacy_import(uuid) from anon;
revoke all on function private.refresh_rollups_after_legacy_import(uuid) from authenticated;

create or replace function public.refresh_rollups_after_legacy_import(target_profile_id uuid)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.refresh_rollups_after_legacy_import(target_profile_id);
$$;

grant execute on function public.refresh_rollups_after_legacy_import(uuid) to authenticated;
