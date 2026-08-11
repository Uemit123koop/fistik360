-- FAZ 2: seller signup compliance and wholesale seller storefronts.
-- Additive migration; existing marketplace tables are preserved.

alter table public.seller_registration_intents
  add column privacy_version text,
  add column privacy_accepted_at timestamptz,
  add column invoice_receipt_declared_at timestamptz,
  add column product_categories text[] not null default '{}'::text[];

alter table public.seller_onboardings
  add column privacy_version text,
  add column privacy_accepted_at timestamptz,
  add column invoice_receipt_declared_at timestamptz,
  add column product_categories text[] not null default '{}'::text[];

alter table public.seller_registration_intents
  add constraint seller_registration_intents_privacy_version_check
    check (privacy_version is null or btrim(privacy_version) <> '');

alter table public.seller_onboardings
  add constraint seller_onboardings_privacy_version_check
    check (privacy_version is null or btrim(privacy_version) <> '');

alter table public.seller_registration_intents
  add constraint seller_registration_intents_categories_check
    check (cardinality(product_categories) <= 12);

alter table public.seller_onboardings
  add constraint seller_onboardings_categories_check
    check (cardinality(product_categories) <= 12);

create table public.wholesale_seller_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  description text,
  phone text,
  product_categories text[] not null default '{}'::text[],
  logo_url text,
  cover_url text,
  is_active boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_seller_profiles_business_name_check check (btrim(business_name) <> ''),
  constraint wholesale_seller_profiles_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint wholesale_seller_profiles_categories_check check (cardinality(product_categories) between 1 and 12),
  constraint wholesale_seller_profiles_publish_check
    check ((is_active = true and published_at is not null) or is_active = false)
);

create index idx_wholesale_seller_profiles_active
  on public.wholesale_seller_profiles (is_active, business_name);

create trigger trg_wholesale_seller_profiles_updated_at
before update on public.wholesale_seller_profiles
for each row execute function public.set_updated_at();

alter table public.wholesale_seller_profiles enable row level security;

create policy wholesale_seller_profiles_select_authorized
  on public.wholesale_seller_profiles
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (
          p.role = 'ADMIN'
          or (
            wholesale_seller_profiles.is_active = true
            and p.role in ('NUT_STORE', 'WHOLESALE_SELLER')
          )
        )
    )
  );

create policy wholesale_seller_profiles_insert_owner
  on public.wholesale_seller_profiles
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  );

create policy wholesale_seller_profiles_update_owner
  on public.wholesale_seller_profiles
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  );

grant select, insert, update on public.wholesale_seller_profiles to authenticated;
grant all on public.wholesale_seller_profiles to service_role;

create or replace function public.complete_seller_registration(
  p_user_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text;
  v_current_role text;
  v_intent public.seller_registration_intents%rowtype;
  v_onboarding_id uuid;
  v_store_id uuid;
  v_slug_base text;
  v_slug text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Seller role assignment requires the service role';
  end if;

  select pg_catalog.lower(u.email)
    into v_email
  from auth.users u
  where u.id = p_user_id
    and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'A confirmed auth user is required';
  end if;

  select sri.*
    into v_intent
  from public.seller_registration_intents sri
  where sri.email = v_email
    and sri.status in ('PENDING_OTP', 'EMAIL_VERIFIED', 'ROLE_ASSIGNED')
  for update;

  if not found then
    raise exception 'A valid seller registration intent was not found';
  end if;

  if v_intent.status <> 'ROLE_ASSIGNED' and v_intent.expires_at <= now() then
    update public.seller_registration_intents
      set status = 'EXPIRED'
    where id = v_intent.id;
    raise exception 'Seller registration intent has expired';
  end if;

  if v_intent.privacy_version is null
    or v_intent.privacy_accepted_at is null
    or v_intent.invoice_receipt_declared_at is null then
    raise exception 'Seller compliance declarations are required';
  end if;

  if v_intent.auth_user_id is not null and v_intent.auth_user_id <> p_user_id then
    raise exception 'Seller registration intent is already bound to another user';
  end if;

  select p.role
    into v_current_role
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profile was not created by the auth trigger';
  end if;

  if v_current_role not in ('CUSTOMER', v_intent.seller_type) then
    raise exception 'Existing profile role is incompatible with seller intent';
  end if;

  if v_current_role = 'CUSTOMER' then
    update public.profiles
      set role = v_intent.seller_type,
          full_name = coalesce(nullif(btrim(full_name), ''), v_intent.authorized_full_name)
    where id = p_user_id;
  end if;

  update public.seller_registration_intents
    set auth_user_id = p_user_id,
        status = 'ROLE_ASSIGNED',
        email_verified_at = coalesce(email_verified_at, now()),
        role_assigned_at = coalesce(role_assigned_at, now())
  where id = v_intent.id;

  insert into public.seller_onboardings (
    user_id,
    seller_type,
    business_name,
    authorized_full_name,
    phone,
    kvkk_version,
    kvkk_accepted_at,
    privacy_version,
    privacy_accepted_at,
    invoice_receipt_declared_at,
    product_categories,
    current_step
  )
  values (
    p_user_id,
    v_intent.seller_type,
    v_intent.business_name,
    v_intent.authorized_full_name,
    v_intent.phone,
    v_intent.kvkk_version,
    v_intent.kvkk_accepted_at,
    v_intent.privacy_version,
    v_intent.privacy_accepted_at,
    v_intent.invoice_receipt_declared_at,
    v_intent.product_categories,
    case
      when v_intent.seller_type = 'NUT_STORE' then 'STORE_PROFILE'
      else 'CATALOG'
    end
  )
  on conflict (user_id) do update
    set business_name = excluded.business_name,
        authorized_full_name = excluded.authorized_full_name,
        phone = excluded.phone,
        kvkk_version = excluded.kvkk_version,
        kvkk_accepted_at = excluded.kvkk_accepted_at,
        privacy_version = excluded.privacy_version,
        privacy_accepted_at = excluded.privacy_accepted_at,
        invoice_receipt_declared_at = excluded.invoice_receipt_declared_at,
        product_categories = excluded.product_categories
  returning id, store_id into v_onboarding_id, v_store_id;

  v_slug_base := pg_catalog.btrim(pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.translate(
      v_intent.business_name,
      'ÇĞİÖŞÜçğıöşü',
      'CGIOSUcgiosu'
    )),
    '[^a-z0-9]+',
    '-',
    'g'
  ), '-');
  if v_slug_base = '' then
    v_slug_base := 'satici';
  end if;
  v_slug := v_slug_base || '-' || pg_catalog.substr(pg_catalog.replace(p_user_id::text, '-', ''), 1, 8);

  if v_intent.seller_type = 'NUT_STORE' then
    if v_store_id is null then
      select s.id
        into v_store_id
      from public.stores s
      where s.owner_id = p_user_id
      order by s.created_at
      limit 1;

      if v_store_id is null then
        insert into public.stores (
          owner_id, name, slug, phone, is_active, platform_status
        )
        values (
          p_user_id, v_intent.business_name, v_slug, v_intent.phone, false, 'PENDING_ONBOARDING'
        )
        returning id into v_store_id;
      else
        update public.stores
          set name = v_intent.business_name,
              phone = v_intent.phone
        where id = v_store_id;
      end if;

      update public.seller_onboardings
        set store_id = v_store_id
      where id = v_onboarding_id;
    end if;
  else
    insert into public.wholesale_seller_profiles (
      owner_id, business_name, slug, phone, product_categories
    )
    values (
      p_user_id, v_intent.business_name, v_slug, v_intent.phone, v_intent.product_categories
    )
    on conflict (owner_id) do update
      set business_name = excluded.business_name,
          phone = excluded.phone,
          product_categories = excluded.product_categories;
  end if;

  return v_onboarding_id;
end;
$$;

revoke all on function public.complete_seller_registration(uuid) from public;
revoke all on function public.complete_seller_registration(uuid) from anon, authenticated;
grant execute on function public.complete_seller_registration(uuid) to service_role;
