alter table public.hands add column if not exists storage_id uuid default gen_random_uuid();
update public.hands set storage_id = gen_random_uuid() where storage_id is null;
alter table public.hands alter column storage_id set not null;
alter table public.hands drop constraint if exists hands_pkey;
alter table public.hands add constraint hands_pkey primary key (storage_id);
alter table public.hands drop constraint if exists hands_user_hand_unique;
alter table public.hands add constraint hands_user_hand_unique unique (user_id, id);

create or replace function public.save_analysis_batch(hand_rows jsonb)
returns table(allowed boolean, used_hands integer, limit_hands integer, saved_hands integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan text;
  registered_at timestamptz;
  current_usage integer;
  plan_limit integer;
  elapsed_months integer;
  current_cycle date;
  requested_hands integer;
  hand_row jsonb;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(hand_rows) <> 'array' then raise exception 'hand_rows must be an array'; end if;
  if jsonb_array_length(hand_rows) = 0 or jsonb_array_length(hand_rows) > 10000 then raise exception 'invalid hand count'; end if;

  select plan, created_at into current_plan, registered_at
  from public.profiles where id = current_user_id;
  registered_at := coalesce(registered_at, now());
  elapsed_months := greatest(0,
    (extract(year from now())::integer - extract(year from registered_at)::integer) * 12
    + extract(month from now())::integer - extract(month from registered_at)::integer
  );
  if registered_at + make_interval(months => elapsed_months) > now() then
    elapsed_months := greatest(0, elapsed_months - 1);
  end if;
  current_cycle := (registered_at + make_interval(months => elapsed_months))::date;
  plan_limit := case when current_plan in ('standard', 'pro') then 2000 else 1000 end;

  insert into public.usage_monthly(user_id, month, analyzed_hands)
  values(current_user_id, current_cycle, 0)
  on conflict (user_id, month) do nothing;
  select analyzed_hands into current_usage from public.usage_monthly
  where user_id = current_user_id and month = current_cycle for update;

  select count(*)::integer into requested_hands
  from (
    select distinct item->>'id' as hand_id
    from jsonb_array_elements(hand_rows) as items(item)
    where nullif(item->>'id', '') is not null
  ) incoming
  where not exists (
    select 1 from public.hands existing
    where existing.user_id = current_user_id and existing.id = incoming.hand_id
  );

  if current_usage + requested_hands > plan_limit then
    return query select false, current_usage, plan_limit, 0;
    return;
  end if;

  for hand_row in select value from jsonb_array_elements(hand_rows)
  loop
    if nullif(hand_row->>'id', '') is null then raise exception 'hand id is required'; end if;
    insert into public.hands(
      id, user_id, played_at, position, stakes, hole_cards, board, pot, result,
      actions, recommendation, decision_score, issue, explanation, raw_data
    ) values (
      hand_row->>'id',
      current_user_id,
      nullif(hand_row->>'playedAt', '')::timestamptz,
      hand_row->>'position',
      hand_row->>'stakes',
      array(select jsonb_array_elements_text(coalesce(hand_row->'holeCards', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(hand_row->'board', '[]'::jsonb))),
      coalesce((hand_row->>'pot')::numeric, 0),
      coalesce((hand_row->>'result')::numeric, 0),
      coalesce(hand_row->'actions', '[]'::jsonb),
      coalesce(hand_row->'recommendation', '{}'::jsonb),
      coalesce((hand_row->>'score')::integer, 0),
      nullif(hand_row->>'issue', ''),
      nullif(hand_row->>'explanation', ''),
      hand_row
    )
    on conflict (user_id, id) do update set
      played_at = excluded.played_at,
      position = excluded.position,
      stakes = excluded.stakes,
      hole_cards = excluded.hole_cards,
      board = excluded.board,
      pot = excluded.pot,
      result = excluded.result,
      actions = excluded.actions,
      recommendation = excluded.recommendation,
      decision_score = excluded.decision_score,
      issue = excluded.issue,
      explanation = excluded.explanation,
      raw_data = excluded.raw_data;
  end loop;

  update public.usage_monthly
  set analyzed_hands = analyzed_hands + requested_hands
  where user_id = current_user_id and month = current_cycle
  returning analyzed_hands into current_usage;

  return query select true, current_usage, plan_limit, jsonb_array_length(hand_rows);
end;
$$;

revoke all on function public.save_analysis_batch(jsonb) from public;
grant execute on function public.save_analysis_batch(jsonb) to authenticated;
