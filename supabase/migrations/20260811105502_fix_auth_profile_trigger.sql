-- Fix the auth profile trigger without weakening its hardened security settings.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      pg_catalog.split_part(new.email, '@', 1)
    ),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;
