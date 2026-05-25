do $$
declare
  target jsonb;
  target_function regprocedure;
  function_sql text;
  patched_function_sql text;
begin
  for target in
    select *
    from jsonb_array_elements(
      jsonb_build_array(
        jsonb_build_object(
          'signature', 'public.get_analytics_home(uuid)',
          'pattern', E'if rollup_payload is null then\\s+perform public\\.refresh_server_authored_analytics\\(get_analytics_home\\.profile_id\\);\\s+\\s*select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_analytics_home\\.profile_id;\\s+end if;',
          'already_safe_pattern', E'select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_analytics_home\\.profile_id;',
          'replacement', E'select rollup.payload\n  into rollup_payload\n  from public.personal_stats_rollups as rollup\n  where rollup.profile_id = get_analytics_home.profile_id;'
        ),
        jsonb_build_object(
          'signature', 'public.get_stats_screen(uuid)',
          'pattern', E'if rollup_payload is null then\\s+perform public\\.refresh_server_authored_analytics\\(get_stats_screen\\.profile_id\\);\\s+\\s*select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_stats_screen\\.profile_id;\\s+end if;',
          'already_safe_pattern', E'select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_stats_screen\\.profile_id;',
          'replacement', E'select rollup.payload\n  into rollup_payload\n  from public.personal_stats_rollups as rollup\n  where rollup.profile_id = get_stats_screen.profile_id;'
        ),
        jsonb_build_object(
          'signature', 'public.get_insights_screen(uuid)',
          'pattern', E'if rollup_payload is null then\\s+perform public\\.refresh_server_authored_analytics\\(get_insights_screen\\.profile_id\\);\\s+\\s*select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_insights_screen\\.profile_id;\\s+end if;',
          'already_safe_pattern', E'select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_insights_screen\\.profile_id;',
          'replacement', E'select rollup.payload\n  into rollup_payload\n  from public.personal_stats_rollups as rollup\n  where rollup.profile_id = get_insights_screen.profile_id;'
        ),
        jsonb_build_object(
          'signature', 'public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)',
          'pattern', E'if rollup_payload is null then\\s+perform public\\.refresh_server_authored_analytics\\(get_chart_dataset\\.profile_id\\);\\s+\\s*select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_chart_dataset\\.profile_id;\\s+end if;',
          'already_safe_pattern', E'select rollup\\.payload\\s+into rollup_payload\\s+from public\\.personal_stats_rollups as rollup\\s+where rollup\\.profile_id = get_chart_dataset\\.profile_id;',
          'replacement', E'select rollup.payload\n  into rollup_payload\n  from public.personal_stats_rollups as rollup\n  where rollup.profile_id = get_chart_dataset.profile_id;'
        )
      )
    )
  loop
    target_function := (target->>'signature')::regprocedure;
    function_sql := pg_get_functiondef(target_function);

    patched_function_sql := regexp_replace(
      function_sql,
      target->>'pattern',
      target->>'replacement',
      'n'
    );

    if patched_function_sql = function_sql then
      if function_sql ~ (target->>'already_safe_pattern') then
        continue;
      end if;

      raise exception 'Could not restore read-only-safe analytics RPC for %.', target_function::text;
    end if;

    patched_function_sql := regexp_replace(patched_function_sql, ';\s*$', '');

    execute patched_function_sql;
  end loop;
end;
$$;
