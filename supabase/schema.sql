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
  id text primary key,
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
  referred_by uuid references profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table usage_monthly (
  user_id uuid references auth.users(id) on delete cascade, month date not null,
  analyzed_hands integer not null default 0, practice_hands integer not null default 0,
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
begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create index profiles_stripe_customer_idx on profiles(stripe_customer_id);
