do $$
declare
  target_functions regprocedure[] := array[
    'public.get_analytics_home(uuid)'::regprocedure,
    'public.get_stats_screen(uuid)'::regprocedure,
    'public.get_insights_screen(uuid)'::regprocedure,
    'public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)'::regprocedure
  ];
  target_function regprocedure;
  function_sql text;
  bad_reference constant text := 'select public.personal_stats_rollups.payload';
begin
  foreach target_function in array target_functions loop
    function_sql := pg_get_functiondef(target_function);

    if position(bad_reference in function_sql) = 0 then
      continue;
    end if;

    function_sql := replace(function_sql, bad_reference, 'select rollup.payload');
    function_sql := regexp_replace(function_sql, ';\s*$', '');

    execute function_sql;
  end loop;
end;
$$;
