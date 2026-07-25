do $$
declare function_sql text;
begin
  select pg_get_functiondef('public.consume_analysis_quota(integer)'::regprocedure)
  into function_sql;
  function_sql := replace(function_sql, 'then 2000 else 1000 end', 'then 2000 else 500 end');
  execute function_sql;

  select pg_get_functiondef('public.save_analysis_batch(jsonb)'::regprocedure)
  into function_sql;
  function_sql := replace(function_sql, 'then 2000 else 1000 end', 'then 2000 else 500 end');
  execute function_sql;
end;
$$;
