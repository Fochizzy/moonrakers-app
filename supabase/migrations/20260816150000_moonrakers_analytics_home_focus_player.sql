-- The dashboard topbar can focus any player, but public.get_analytics_home only
-- ever accepted the caller's own id and raised on anything else. The web app
-- worked around that by passing the focused player as `profile_id`, so focusing
-- a team mate took the Home and Data routes straight to the error boundary.
--
-- Give the RPC the same shape get_stats_screen already uses: `profile_id` stays
-- the authenticated requester, `focus_player_id` says whose rollup to publish,
-- and a private security-definer helper does the cross-profile read so the
-- private schema stays closed to the authenticated role.

create or replace function private.get_analytics_home_rollup(target_player_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select psr.payload->'analyticsHome'
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_player_id
  limit 1;
$$;

revoke all on function private.get_analytics_home_rollup(uuid) from public;
revoke all on function private.get_analytics_home_rollup(uuid) from anon;
revoke all on function private.get_analytics_home_rollup(uuid) from authenticated;

drop function if exists public.get_analytics_home(uuid);

create or replace function public.get_analytics_home(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester_profile_id uuid := coalesce(profile_id, (select auth.uid()));
  effective_focus_player_id uuid := null;
  rollup_home jsonb := null;
begin
  if requester_profile_id is null
    or requester_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  effective_focus_player_id := requester_profile_id;

  -- An unknown or soft-deleted focus id falls back to the requester rather than
  -- failing the route, matching how get_stats_screen resolves the same input.
  if focus_player_id is not null then
    select p.id
    into effective_focus_player_id
    from public.profiles as p
    where p.id = focus_player_id
      and p.deleted_at is null
    limit 1;

    if effective_focus_player_id is null then
      effective_focus_player_id := requester_profile_id;
    end if;
  end if;

  rollup_home := private.get_analytics_home_rollup(effective_focus_player_id);

  if rollup_home is not null then
    return rollup_home;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'hero', jsonb_build_object(
      'players', 0,
      'games', 0,
      'views', 0
    ),
    'cards', '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_analytics_home(uuid, uuid) from public;
revoke all on function public.get_analytics_home(uuid, uuid) from anon;
grant execute on function public.get_analytics_home(uuid, uuid) to authenticated;
grant execute on function public.get_analytics_home(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
