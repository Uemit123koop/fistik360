-- Enables phone-based signups (SMS OTP, currently in test_otp mode — see
-- supabase/config.toml [auth.sms.test_otp]) to work alongside the existing
-- email-based flow. Without this, a phone-only auth.users insert fails the
-- handle_new_auth_user trigger because profiles.email was NOT NULL.

alter table public.profiles
  add column if not exists phone text,
  alter column email drop not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, full_name, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      case when new.email is not null then pg_catalog.split_part(new.email, '@', 1) else new.phone end
    ),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
