alter table public.profiles
  add column if not exists bonus_hands_balance integer not null default 0
  check (bonus_hands_balance >= 0);

alter table public.usage_monthly
  add column if not exists bonus_hands_used integer not null default 0
  check (bonus_hands_used >= 0);

create or replace function public.consume_analysis_quota(requested_hands integer)
returns table(allowed boolean, used_hands integer, limit_hands integer)
language plpgsql security definer set search_path=public as $$
declare
  current_user_id uuid := auth.uid(); current_plan text; registered_at timestamptz;
  current_usage integer; current_bonus_used integer; bonus_balance integer;
  plan_limit integer; displayed_limit integer; bonus_needed integer;
  elapsed_months integer; current_month date;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if requested_hands <= 0 or requested_hands > 10000 then raise exception 'invalid requested_hands'; end if;

  select plan, created_at, bonus_hands_balance
  into current_plan, registered_at, bonus_balance
  from public.profiles where id=current_user_id for update;

  registered_at := coalesce(registered_at, now());
  bonus_balance := coalesce(bonus_balance, 0);
  elapsed_months := greatest(0,
    (extract(year from now())::integer - extract(year from registered_at)::integer) * 12
    + extract(month from now())::integer - extract(month from registered_at)::integer
  );
  if registered_at + make_interval(months => elapsed_months) > now() then
    elapsed_months := greatest(0, elapsed_months - 1);
  end if;
  current_month := (registered_at + make_interval(months => elapsed_months))::date;
  plan_limit := case when current_plan in ('standard','pro') then 2000 else 500 end;

  insert into public.usage_monthly(user_id,month,analyzed_hands,bonus_hands_used)
  values(current_user_id,current_month,0,0) on conflict (user_id,month) do nothing;
  select analyzed_hands, bonus_hands_used into current_usage, current_bonus_used
  from public.usage_monthly where user_id=current_user_id and month=current_month for update;

  displayed_limit := plan_limit + current_bonus_used + bonus_balance;
  if current_usage + requested_hands > displayed_limit then
    return query select false,current_usage,displayed_limit; return;
  end if;

  bonus_needed := greatest(0, current_usage + requested_hands - plan_limit - current_bonus_used);
  if bonus_needed > 0 then
    update public.profiles set bonus_hands_balance=bonus_hands_balance-bonus_needed
    where id=current_user_id;
  end if;
  update public.usage_monthly
  set analyzed_hands=analyzed_hands+requested_hands,
      bonus_hands_used=bonus_hands_used+bonus_needed
  where user_id=current_user_id and month=current_month
  returning analyzed_hands into current_usage;

  return query select true,current_usage,displayed_limit;
end; $$;

create or replace function public.save_analysis_batch(hand_rows jsonb)
returns table(allowed boolean, used_hands integer, limit_hands integer, saved_hands integer)
language plpgsql security definer set search_path=public as $$
declare
  current_user_id uuid := auth.uid(); current_plan text; registered_at timestamptz;
  current_usage integer; current_bonus_used integer; bonus_balance integer;
  plan_limit integer; displayed_limit integer; bonus_needed integer;
  elapsed_months integer; current_cycle date; requested_hands integer;
  hand_row jsonb; total_user_hands integer; qualifying_event uuid; qualifying_referrer uuid;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(hand_rows) <> 'array' then raise exception 'hand_rows must be an array'; end if;
  if jsonb_array_length(hand_rows)=0 or jsonb_array_length(hand_rows)>10000 then raise exception 'invalid hand count'; end if;

  select plan,created_at,bonus_hands_balance into current_plan,registered_at,bonus_balance
  from public.profiles where id=current_user_id for update;
  registered_at := coalesce(registered_at,now()); bonus_balance := coalesce(bonus_balance,0);
  elapsed_months := greatest(0,
    (extract(year from now())::integer-extract(year from registered_at)::integer)*12
    + extract(month from now())::integer-extract(month from registered_at)::integer);
  if registered_at+make_interval(months=>elapsed_months)>now() then elapsed_months:=greatest(0,elapsed_months-1); end if;
  current_cycle := (registered_at+make_interval(months=>elapsed_months))::date;
  plan_limit := case when current_plan in ('standard','pro') then 2000 else 500 end;

  insert into public.usage_monthly(user_id,month,analyzed_hands,bonus_hands_used)
  values(current_user_id,current_cycle,0,0) on conflict(user_id,month) do nothing;
  select analyzed_hands,bonus_hands_used into current_usage,current_bonus_used
  from public.usage_monthly where user_id=current_user_id and month=current_cycle for update;

  select count(*)::integer into requested_hands from (
    select distinct item->>'id' hand_id from jsonb_array_elements(hand_rows) items(item)
    where nullif(item->>'id','') is not null
  ) incoming where not exists (
    select 1 from public.hands existing
    where existing.user_id=current_user_id and existing.id=incoming.hand_id);

  displayed_limit := plan_limit+current_bonus_used+bonus_balance;
  if current_usage+requested_hands>displayed_limit then
    return query select false,current_usage,displayed_limit,0; return;
  end if;
  bonus_needed := greatest(0,current_usage+requested_hands-plan_limit-current_bonus_used);

  for hand_row in select value from jsonb_array_elements(hand_rows) loop
    if nullif(hand_row->>'id','') is null then raise exception 'hand id is required'; end if;
    insert into public.hands(
      id,user_id,played_at,position,stakes,hole_cards,board,pot,result,
      actions,recommendation,decision_score,issue,explanation,raw_data
    ) values (
      hand_row->>'id',current_user_id,nullif(hand_row->>'playedAt','')::timestamptz,
      hand_row->>'position',hand_row->>'stakes',
      array(select jsonb_array_elements_text(coalesce(hand_row->'holeCards','[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(hand_row->'board','[]'::jsonb))),
      coalesce((hand_row->>'pot')::numeric,0),coalesce((hand_row->>'result')::numeric,0),
      coalesce(hand_row->'actions','[]'::jsonb),coalesce(hand_row->'recommendation','{}'::jsonb),
      coalesce((hand_row->>'score')::integer,0),nullif(hand_row->>'issue',''),
      nullif(hand_row->>'explanation',''),hand_row
    ) on conflict(user_id,id) do update set
      played_at=excluded.played_at,position=excluded.position,stakes=excluded.stakes,
      hole_cards=excluded.hole_cards,board=excluded.board,pot=excluded.pot,result=excluded.result,
      actions=excluded.actions,recommendation=excluded.recommendation,
      decision_score=excluded.decision_score,issue=excluded.issue,
      explanation=excluded.explanation,raw_data=excluded.raw_data;
  end loop;

  if bonus_needed>0 then
    update public.profiles set bonus_hands_balance=bonus_hands_balance-bonus_needed where id=current_user_id;
  end if;
  update public.usage_monthly set
    analyzed_hands=analyzed_hands+requested_hands,
    bonus_hands_used=bonus_hands_used+bonus_needed
  where user_id=current_user_id and month=current_cycle returning analyzed_hands into current_usage;

  select count(*)::integer into total_user_hands from public.hands where user_id=current_user_id;
  if total_user_hands>=100 then
    select id,referrer_id into qualifying_event,qualifying_referrer
    from public.affiliate_events
    where referred_user_id=current_user_id and event_type='signup' and reward_status='pending'
    order by created_at limit 1 for update skip locked;
    if qualifying_event is not null and qualifying_referrer<>current_user_id then
      update public.affiliate_events set reward_status='earned' where id=qualifying_event;
      update public.profiles set bonus_hands_balance=bonus_hands_balance+500
      where id=qualifying_referrer;
    end if;
  end if;

  return query select true,current_usage,displayed_limit,jsonb_array_length(hand_rows);
end; $$;

revoke all on function public.consume_analysis_quota(integer) from public;
grant execute on function public.consume_analysis_quota(integer) to authenticated;
revoke all on function public.save_analysis_batch(jsonb) from public;
grant execute on function public.save_analysis_batch(jsonb) to authenticated;
