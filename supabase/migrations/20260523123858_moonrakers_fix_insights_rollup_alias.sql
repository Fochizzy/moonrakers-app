create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_profile_id uuid := profile_id;
  rollup_payload jsonb;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
    return rollup_payload->'insightsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'meta', jsonb_build_object(
      'games', 0,
      'playerRows', 0
    ),
    'topSignals', '[]'::jsonb,
    'assistNetwork', jsonb_build_object(
      'nodes', '[]'::jsonb,
      'edges', '[]'::jsonb
    ),
    'correlations', jsonb_build_object(
      'summary', 'No insight correlations are available yet.',
      'items', '[]'::jsonb,
      'selectedKey', null
    )
  );
end;
$$;
