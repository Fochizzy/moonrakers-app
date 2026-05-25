create or replace function private.get_or_refresh_personal_stats_rollup(target_profile_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  if rollup_payload is not null then
    return rollup_payload;
  end if;

  perform private.refresh_server_authored_analytics(target_profile_id);

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  return coalesce(rollup_payload, '{}'::jsonb);
end;
$$;

revoke all on function private.get_or_refresh_personal_stats_rollup(uuid) from public;
revoke all on function private.get_or_refresh_personal_stats_rollup(uuid) from anon;
revoke all on function private.get_or_refresh_personal_stats_rollup(uuid) from authenticated;

do $$
declare
  target jsonb;
  target_function regprocedure;
  replacement_sql text;
  function_sql text;
  patched_function_sql text;
begin
  for target in
    select *
    from jsonb_array_elements(
      jsonb_build_array(
        jsonb_build_object(
          'signature', 'public.get_analytics_home(uuid)',
          'replacement', E'select private.get_or_refresh_personal_stats_rollup(get_analytics_home.profile_id)\n  into rollup_payload;'
        ),
        jsonb_build_object(
          'signature', 'public.get_stats_screen(uuid)',
          'replacement', E'select private.get_or_refresh_personal_stats_rollup(get_stats_screen.profile_id)\n  into rollup_payload;'
        ),
        jsonb_build_object(
          'signature', 'public.get_insights_screen(uuid)',
          'replacement', E'select private.get_or_refresh_personal_stats_rollup(get_insights_screen.profile_id)\n  into rollup_payload;'
        ),
        jsonb_build_object(
          'signature', 'public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)',
          'replacement', E'select private.get_or_refresh_personal_stats_rollup(get_chart_dataset.profile_id)\n  into rollup_payload;'
        )
      )
    )
  loop
    target_function := (target->>'signature')::regprocedure;
    replacement_sql := target->>'replacement';
    function_sql := pg_get_functiondef(target_function);

    patched_function_sql := regexp_replace(
      function_sql,
      'select rollup\.payload\s+into rollup_payload\s+from public\.personal_stats_rollups as rollup\s+where rollup\.profile_id = [^;]+;',
      replacement_sql,
      'n'
    );

    if patched_function_sql = function_sql then
      raise exception 'Could not patch % for analytics rollup self-heal.', target_function::text;
    end if;

    patched_function_sql := regexp_replace(patched_function_sql, ';\s*$', '');

    execute patched_function_sql;
  end loop;
end;
$$;
