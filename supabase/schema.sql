create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_file_name text not null,
  played_at timestamptz,
  hand_count integer default 0,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create table hands (
  storage_id uuid primary key default gen_random_uuid(),
  id text not null,
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  played_at timestamptz, position text, stakes text,
  hole_cards text[], board text[], pot numeric, result numeric,
  actions jsonb not null default '[]'::jsonb,
  recommendation jsonb not null default '{}'::jsonb,
  decision_score integer, issue text, explanation text,
  is_saved boolean default false, raw_data jsonb,
  created_at timestamptz default now()
);
alter table hands add constraint hands_user_hand_unique unique (user_id, id);
alter table sessions enable row level security;
alter table hands enable row level security;
create policy "own sessions" on sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own hands" on hands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index hands_session_id_idx on hands(session_id);
create index hands_review_idx on hands(user_id, decision_score);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, plan text not null default 'free' check (plan in ('free','standard','pro')),
  stripe_customer_id text unique, stripe_subscription_id text unique,
  subscription_status text not null default 'inactive', current_period_end timestamptz,
  referral_code text unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  bonus_hands_balance integer not null default 0 check (bonus_hands_balance >= 0),
  referred_by uuid references profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table usage_monthly (
  user_id uuid references auth.users(id) on delete cascade, month date not null,
  analyzed_hands integer not null default 0, practice_hands integer not null default 0,
  bonus_hands_used integer not null default 0 check (bonus_hands_used >= 0),
  primary key (user_id, month)
);
create table affiliate_events (
  id uuid primary key default gen_random_uuid(), referrer_id uuid not null references profiles(id) on delete cascade,
  referred_user_id uuid references profiles(id) on delete set null,
  event_type text not null check (event_type in ('signup','paid')),
  reward_status text not null default 'pending', created_at timestamptz not null default now()
);
alter table profiles enable row level security;
alter table usage_monthly enable row level security;
alter table affiliate_events enable row level security;
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own usage" on usage_monthly for select using (auth.uid() = user_id);
create policy "own affiliate events" on affiliate_events for select using (auth.uid() = referrer_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare referrer uuid; submitted_code text := upper(coalesce(new.raw_user_meta_data->>'referral_code',''));
begin
 if submitted_code<>'' then select id into referrer from public.profiles where referral_code=submitted_code limit 1; end if;
 insert into public.profiles(id,display_name,referred_by) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),referrer);
 if referrer is not null then insert into public.affiliate_events(referrer_id,referred_user_id,event_type) values(referrer,new.id,'signup'); end if;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create index profiles_stripe_customer_idx on profiles(stripe_customer_id);

create or replace function public.consume_analysis_quota(requested_hands integer)
returns table(allowed boolean, used_hands integer, limit_hands integer)
language plpgsql security definer set search_path=public as $$
declare
  current_user_id uuid := auth.uid(); current_plan text; registered_at timestamptz; current_usage integer;
  plan_limit integer; elapsed_months integer; current_month date;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if requested_hands <= 0 or requested_hands > 10000 then raise exception 'invalid requested_hands'; end if;
  select plan, created_at into current_plan, registered_at from public.profiles where id=current_user_id;
  registered_at := coalesce(registered_at, now());
  elapsed_months := greatest(0,
    (extract(year from now())::integer - extract(year from registered_at)::integer) * 12
    + extract(month from now())::integer - extract(month from registered_at)::integer
  );
  if registered_at + make_interval(months => elapsed_months) > now() then
    elapsed_months := greatest(0, elapsed_months - 1);
  end if;
  current_month := (registered_at + make_interval(months => elapsed_months))::date;
  plan_limit := case when current_plan in ('standard','pro') then 2000 else 500 end;
  insert into public.usage_monthly(user_id,month,analyzed_hands) values(current_user_id,current_month,0)
  on conflict (user_id,month) do nothing;
  select analyzed_hands into current_usage from public.usage_monthly
  where user_id=current_user_id and month=current_month for update;
  if current_usage + requested_hands > plan_limit then
    return query select false,current_usage,plan_limit; return;
  end if;
  update public.usage_monthly set analyzed_hands=analyzed_hands+requested_hands
  where user_id=current_user_id and month=current_month returning analyzed_hands into current_usage;
  return query select true,current_usage,plan_limit;
end; $$;
revoke all on function public.consume_analysis_quota(integer) from public;
grant execute on function public.consume_analysis_quota(integer) to authenticated;
