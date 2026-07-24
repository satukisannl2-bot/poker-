create or replace function public.consume_analysis_quota(requested_hands integer)
returns table(allowed boolean, used_hands integer, limit_hands integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan text;
  current_usage integer;
  plan_limit integer;
  current_month date := date_trunc('month', now())::date;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if requested_hands <= 0 or requested_hands > 10000 then raise exception 'invalid requested_hands'; end if;
  select plan into current_plan from public.profiles where id = current_user_id;
  plan_limit := case when current_plan in ('standard', 'pro') then 2000 else 50 end;
  insert into public.usage_monthly(user_id, month, analyzed_hands)
  values(current_user_id, current_month, 0) on conflict (user_id, month) do nothing;
  select analyzed_hands into current_usage from public.usage_monthly
  where user_id = current_user_id and month = current_month for update;
  if current_usage + requested_hands > plan_limit then
    return query select false, current_usage, plan_limit; return;
  end if;
  update public.usage_monthly set analyzed_hands = analyzed_hands + requested_hands
  where user_id = current_user_id and month = current_month returning analyzed_hands into current_usage;
  return query select true, current_usage, plan_limit;
end;
$$;
revoke all on function public.consume_analysis_quota(integer) from public;
grant execute on function public.consume_analysis_quota(integer) to authenticated;
