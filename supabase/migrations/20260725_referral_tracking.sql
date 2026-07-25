create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer uuid;
  submitted_code text := upper(coalesce(new.raw_user_meta_data->>'referral_code', ''));
begin
  if submitted_code <> '' then
    select id into referrer from public.profiles where referral_code = submitted_code limit 1;
  end if;

  insert into public.profiles(id, display_name, referred_by)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    referrer
  );

  if referrer is not null then
    insert into public.affiliate_events(referrer_id, referred_user_id, event_type)
    values(referrer, new.id, 'signup');
  end if;
  return new;
end;
$$;
