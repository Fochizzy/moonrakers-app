do $$
declare
  target jsonb;
  target_function regprocedure;
  function_sql text;
  replacement_sql text;
begin
  for target in
    select *
    from jsonb_array_elements(
      jsonb_build_array(
        jsonb_build_object(
          'signature', 'public.get_analytics_home(uuid)',
          'pattern', 'select private\.get_or_refresh_personal_stats_rollup\(get_analytics_home\.profile_id\)\s+into rollup_payload;',
          'replacement', E'if rollup_payload is null then\n    perform public.refresh_server_authored_analytics(get_analytics_home.profile_id);\n\n    select rollup.payload\n    into rollup_payload\n    from public.personal_stats_rollups as rollup\n    where rollup.profile_id = get_analytics_home.profile_id;\n  end if;'
        ),
        jsonb_build_object(
          'signature', 'public.get_stats_screen(uuid)',
          'pattern', 'select private\.get_or_refresh_personal_stats_rollup\(get_stats_screen\.profile_id\)\s+into rollup_payload;',
          'replacement', E'if rollup_payload is null then\n    perform public.refresh_server_authored_analytics(get_stats_screen.profile_id);\n\n    select rollup.payload\n    into rollup_payload\n    from public.personal_stats_rollups as rollup\n    where rollup.profile_id = get_stats_screen.profile_id;\n  end if;'
        ),
        jsonb_build_object(
          'signature', 'public.get_insights_screen(uuid)',
          'pattern', 'select private\.get_or_refresh_personal_stats_rollup\(get_insights_screen\.profile_id\)\s+into rollup_payload;',
          'replacement', E'if rollup_payload is null then\n    perform public.refresh_server_authored_analytics(get_insights_screen.profile_id);\n\n    select rollup.payload\n    into rollup_payload\n    from public.personal_stats_rollups as rollup\n    where rollup.profile_id = get_insights_screen.profile_id;\n  end if;'
        ),
        jsonb_build_object(
          'signature', 'public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)',
          'pattern', 'select private\.get_or_refresh_personal_stats_rollup\(get_chart_dataset\.profile_id\)\s+into rollup_payload;',
          'replacement', E'if rollup_payload is null then\n    perform public.refresh_server_authored_analytics(get_chart_dataset.profile_id);\n\n    select rollup.payload\n    into rollup_payload\n    from public.personal_stats_rollups as rollup\n    where rollup.profile_id = get_chart_dataset.profile_id;\n  end if;'
        )
      )
    )
  loop
    target_function := (target->>'signature')::regprocedure;
    function_sql := pg_get_functiondef(target_function);

    if function_sql !~ (target->>'pattern') then
      continue;
    end if;

    replacement_sql := target->>'replacement';
    function_sql := regexp_replace(
      function_sql,
      target->>'pattern',
      replacement_sql,
      'n'
    );
    function_sql := regexp_replace(function_sql, ';\s*$', '');

    execute function_sql;
  end loop;
end;
$$;
