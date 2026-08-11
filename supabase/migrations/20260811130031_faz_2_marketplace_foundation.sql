-- FAZ 2 marketplace foundation.
-- Additive only: preserves all FAZ 1 tables and data.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.neighborhoods
  add column settlement_type text not null default 'NEIGHBORHOOD',
  add column is_active boolean not null default true,
  add constraint neighborhoods_settlement_type_check
    check (settlement_type in ('NEIGHBORHOOD', 'VILLAGE'));

create index idx_neighborhoods_active_district_name
  on public.neighborhoods (district_id, name)
  where is_active;

alter table public.stores
  add column platform_status text not null default 'PENDING_ONBOARDING',
  add column published_at timestamptz,
  add constraint stores_platform_status_check
    check (platform_status in ('PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED'));

create index idx_stores_public_listing
  on public.stores (platform_status, is_active)
  where platform_status = 'ACTIVE' and is_active;

-- Legacy label columns remain for compatibility. The FK is canonical in FAZ 2.
do $$
begin
  if exists (select 1 from public.store_neighborhoods limit 1) then
    raise exception
      'FAZ 2 precondition failed: store_neighborhoods contains rows; reconcile legacy labels before adding neighborhood_id';
  end if;
end
$$;

alter table public.store_neighborhoods
  add column neighborhood_id uuid not null
    references public.neighborhoods(id) on delete restrict,
  add column is_primary boolean not null default false,
  add column is_active boolean not null default false,
  add column delivery_fee_override numeric(12,2),
  add column activated_at timestamptz,
  add constraint store_neighborhoods_delivery_fee_override_check
    check (delivery_fee_override is null or delivery_fee_override >= 0),
  add constraint store_neighborhoods_store_neighborhood_key
    unique (store_id, neighborhood_id),
  add constraint store_neighborhoods_id_store_key
    unique (id, store_id);

create unique index uq_store_neighborhoods_primary
  on public.store_neighborhoods (store_id)
  where is_primary;

create index idx_store_neighborhoods_active_lookup
  on public.store_neighborhoods (neighborhood_id, store_id)
  where is_active;

create table public.seller_registration_intents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  seller_type text not null,
  business_name text not null,
  authorized_full_name text not null,
  phone text not null,
  kvkk_version text not null,
  kvkk_accepted_at timestamptz not null,
  status text not null default 'PENDING_OTP',
  auth_user_id uuid unique references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  email_verified_at timestamptz,
  role_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_registration_intents_email_normalized_check
    check (email = lower(btrim(email)) and position('@' in email) > 1),
  constraint seller_registration_intents_seller_type_check
    check (seller_type in ('NUT_STORE', 'WHOLESALE_SELLER')),
  constraint seller_registration_intents_status_check
    check (status in ('PENDING_OTP', 'EMAIL_VERIFIED', 'ROLE_ASSIGNED', 'EXPIRED', 'CANCELLED')),
  constraint seller_registration_intents_kvkk_check check (btrim(kvkk_version) <> ''),
  constraint seller_registration_intents_business_name_check check (btrim(business_name) <> ''),
  constraint seller_registration_intents_authorized_name_check check (btrim(authorized_full_name) <> ''),
  constraint seller_registration_intents_phone_check check (btrim(phone) <> ''),
  constraint seller_registration_intents_expiry_check check (expires_at > created_at)
);

create unique index uq_seller_registration_intents_email
  on public.seller_registration_intents (lower(email));
create index idx_seller_registration_intents_status_expires
  on public.seller_registration_intents (status, expires_at);

create table public.seller_onboardings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  store_id uuid unique references public.stores(id) on delete set null,
  seller_type text not null,
  business_name text not null,
  authorized_full_name text not null,
  phone text not null,
  kvkk_version text not null,
  kvkk_accepted_at timestamptz not null,
  status text not null default 'IN_PROGRESS',
  current_step text not null default 'STORE_PROFILE',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_onboardings_seller_type_check
    check (seller_type in ('NUT_STORE', 'WHOLESALE_SELLER')),
  constraint seller_onboardings_status_check
    check (status in ('IN_PROGRESS', 'READY_TO_PUBLISH', 'COMPLETED', 'CANCELLED')),
  constraint seller_onboardings_step_check
    check (current_step in (
      'STORE_PROFILE', 'PRIMARY_SERVICE_AREA', 'DELIVERY_AND_PAYMENT',
      'CATALOG', 'REVIEW', 'COMPLETED'
    )),
  constraint seller_onboardings_completion_check
    check ((status = 'COMPLETED') = (completed_at is not null)),
  constraint seller_onboardings_business_name_check check (btrim(business_name) <> ''),
  constraint seller_onboardings_authorized_name_check check (btrim(authorized_full_name) <> ''),
  constraint seller_onboardings_phone_check check (btrim(phone) <> '')
);

create index idx_seller_onboardings_status_step
  on public.seller_onboardings (status, current_step);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan_group text not null default 'SERVICE_AREA',
  name text not null,
  billing_interval text not null,
  price numeric(12,2) not null,
  currency text not null default 'TRY',
  max_active_service_areas integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_code_check check (code ~ '^[A-Z0-9_]+$'),
  constraint subscription_plans_group_check check (plan_group = 'SERVICE_AREA'),
  constraint subscription_plans_interval_check check (billing_interval in ('NONE', 'MONTH', 'YEAR')),
  constraint subscription_plans_price_check check (price >= 0),
  constraint subscription_plans_currency_check check (currency = 'TRY'),
  constraint subscription_plans_area_limit_check check (max_active_service_areas >= 1)
);

insert into public.subscription_plans
  (code, name, billing_interval, price, currency, max_active_service_areas)
values
  ('FREE', 'İlk Mahalle Ücretsiz', 'NONE', 0, 'TRY', 1),
  ('MULTI_MONTHLY', 'Çoklu Mahalle Aylık', 'MONTH', 899, 'TRY', 10),
  ('MULTI_YEARLY', 'Çoklu Mahalle Yıllık', 'YEAR', 8990, 'TRY', 10);

create table public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'FREE',
  provider text,
  external_subscription_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  activated_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_subscriptions_status_check
    check (status in ('FREE', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  constraint seller_subscriptions_period_check
    check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint seller_subscriptions_active_check
    check (status <> 'ACTIVE' or activated_at is not null),
  constraint seller_subscriptions_provider_check
    check (external_subscription_id is null or provider is not null)
);

create index idx_seller_subscriptions_plan_id
  on public.seller_subscriptions (plan_id);
create index idx_seller_subscriptions_status_period
  on public.seller_subscriptions (status, starts_at, ends_at);
create index idx_seller_subscriptions_activated_by
  on public.seller_subscriptions (activated_by)
  where activated_by is not null;

create table public.store_delivery_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  minimum_order_amount numeric(12,2) not null default 0,
  standard_delivery_fee numeric(12,2) not null default 0,
  free_delivery_threshold numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_delivery_settings_minimum_check
    check (minimum_order_amount >= 0),
  constraint store_delivery_settings_fee_check
    check (standard_delivery_fee >= 0),
  constraint store_delivery_settings_free_threshold_check
    check (
      free_delivery_threshold is null
      or free_delivery_threshold >= minimum_order_amount
    )
);

create table public.store_payment_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  cash_on_delivery boolean not null default true,
  card_on_delivery boolean not null default false,
  bank_transfer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_payment_settings_at_least_one_check
    check (cash_on_delivery or card_on_delivery or bank_transfer)
);

-- IBAN never participates in public listing policies. It is returned only by a
-- controlled server-side checkout flow after store and payment validation.
create table public.store_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  account_holder_name text not null,
  iban text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_bank_accounts_holder_check
    check (btrim(account_holder_name) <> ''),
  constraint store_bank_accounts_iban_check
    check (iban ~ '^TR[0-9]{24}$'),
  constraint store_bank_accounts_store_id_id_key
    unique (store_id, id)
);

create unique index uq_store_bank_accounts_active_default
  on public.store_bank_accounts (store_id)
  where is_active and is_default;

create index idx_store_bank_accounts_store_active
  on public.store_bank_accounts (store_id, is_active);

-- A cart is deliberately bound to exactly one store and one of that store's
-- service areas.
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  store_neighborhood_id uuid not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_status_check
    check (status in ('ACTIVE', 'CONVERTED', 'ABANDONED')),
  constraint carts_service_area_store_fkey
    foreign key (store_neighborhood_id, store_id)
    references public.store_neighborhoods(id, store_id)
    on delete restrict
);

create unique index uq_carts_customer_active
  on public.carts (customer_id)
  where status = 'ACTIVE';
create index idx_carts_store_status
  on public.carts (store_id, status);
create index idx_carts_service_area
  on public.carts (store_neighborhood_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  retail_product_id uuid references public.retail_products(id) on delete cascade,
  package_id uuid references public.packages(id) on delete cascade,
  item_quantity numeric(12,3) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_single_source_check
    check (num_nonnulls(retail_product_id, package_id) = 1),
  constraint cart_items_quantity_check
    check (item_quantity > 0)
);

create unique index uq_cart_items_retail_product
  on public.cart_items (cart_id, retail_product_id)
  where retail_product_id is not null;
create unique index uq_cart_items_package
  on public.cart_items (cart_id, package_id)
  where package_id is not null;
create index idx_cart_items_retail_product_id
  on public.cart_items (retail_product_id)
  where retail_product_id is not null;
create index idx_cart_items_package_id
  on public.cart_items (package_id)
  where package_id is not null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('F360-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  customer_id uuid references public.profiles(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_neighborhood_id uuid not null,
  source_cart_id uuid unique references public.carts(id) on delete set null,
  status text not null default 'PENDING',
  payment_method text not null,
  payment_status text not null default 'PENDING',
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  customer_note text,
  subtotal_amount numeric(12,2) not null,
  delivery_fee_amount numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  currency text not null default 'TRY',
  bank_account_id uuid,
  bank_account_holder_snapshot text,
  bank_iban_snapshot text,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_service_area_store_fkey
    foreign key (store_neighborhood_id, store_id)
    references public.store_neighborhoods(id, store_id)
    on delete restrict,
  constraint orders_bank_account_store_fkey
    foreign key (store_id, bank_account_id)
    references public.store_bank_accounts(store_id, id)
    on delete restrict,
  constraint orders_status_check
    check (status in ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  constraint orders_payment_method_check
    check (payment_method in ('CASH_ON_DELIVERY', 'CARD_ON_DELIVERY', 'BANK_TRANSFER')),
  constraint orders_payment_status_check
    check (payment_status in ('PENDING', 'AWAITING_TRANSFER', 'PAID', 'FAILED', 'CANCELLED')),
  constraint orders_customer_name_check check (btrim(customer_name) <> ''),
  constraint orders_customer_phone_check check (btrim(customer_phone) <> ''),
  constraint orders_delivery_address_check check (btrim(delivery_address) <> ''),
  constraint orders_amounts_check
    check (
      subtotal_amount >= 0
      and delivery_fee_amount >= 0
      and total_amount = subtotal_amount + delivery_fee_amount
    ),
  constraint orders_currency_check check (currency = 'TRY'),
  constraint orders_bank_transfer_snapshot_check
    check (
      (
        payment_method = 'BANK_TRANSFER'
        and bank_account_id is not null
        and bank_account_holder_snapshot is not null
        and bank_iban_snapshot is not null
      )
      or (
        payment_method <> 'BANK_TRANSFER'
        and bank_account_id is null
        and bank_account_holder_snapshot is null
        and bank_iban_snapshot is null
      )
    )
);

create index idx_orders_customer_created
  on public.orders (customer_id, created_at desc)
  where customer_id is not null;
create index idx_orders_store_status_created
  on public.orders (store_id, status, created_at desc);
create index idx_orders_service_area
  on public.orders (store_neighborhood_id);
create index idx_orders_bank_account
  on public.orders (bank_account_id)
  where bank_account_id is not null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  source_type text not null,
  retail_product_id uuid references public.retail_products(id) on delete set null,
  package_id uuid references public.packages(id) on delete set null,
  item_name_snapshot text not null,
  unit_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null,
  item_quantity numeric(12,3) not null,
  line_total_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_source_type_check
    check (source_type in ('RETAIL_PRODUCT', 'PACKAGE')),
  constraint order_items_source_reference_check
    check (
      num_nonnulls(retail_product_id, package_id) <= 1
      and (retail_product_id is null or source_type = 'RETAIL_PRODUCT')
      and (package_id is null or source_type = 'PACKAGE')
    ),
  constraint order_items_name_check check (btrim(item_name_snapshot) <> ''),
  constraint order_items_unit_check check (btrim(unit_snapshot) <> ''),
  constraint order_items_amounts_check
    check (
      unit_price_snapshot >= 0
      and item_quantity > 0
      and line_total_amount = round(unit_price_snapshot * item_quantity, 2)
    )
);

create index idx_order_items_order_id
  on public.order_items (order_id);
create index idx_order_items_retail_product_id
  on public.order_items (retail_product_id)
  where retail_product_id is not null;
create index idx_order_items_package_id
  on public.order_items (package_id)
  where package_id is not null;

create or replace function public.sync_store_neighborhood_labels()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select p.name, d.name, n.name
    into new.province, new.district, new.neighborhood
  from public.neighborhoods n
  join public.districts d on d.id = n.district_id
  join public.provinces p on p.id = d.province_id
  where n.id = new.neighborhood_id
    and n.is_active;

  if not found then
    raise exception 'Selected neighborhood or village is not active';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_store_neighborhood_labels() from public;
revoke all on function public.sync_store_neighborhood_labels() from anon, authenticated, service_role;

create trigger trg_store_neighborhoods_sync_labels
before insert or update of neighborhood_id
on public.store_neighborhoods
for each row execute function public.sync_store_neighborhood_labels();

create or replace function private.validate_store_neighborhood_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area_limit integer := 1;
  v_active_count integer;
  v_has_primary boolean;
begin
  -- Serialize area changes for the same store so concurrent requests cannot
  -- exceed the plan entitlement.
  perform 1
  from public.stores s
  where s.id = new.store_id
  for update;

  if not found then
    raise exception 'Store not found';
  end if;

  if tg_op = 'UPDATE'
     and old.is_primary
     and old.is_active
     and not new.is_active
     and exists (
       select 1
       from public.store_neighborhoods sn
       where sn.store_id = old.store_id
         and sn.id <> old.id
         and sn.is_active
     ) then
    raise exception 'The primary service area cannot be deactivated while additional areas are active';
  end if;

  if not new.is_active then
    return new;
  end if;

  select sp.max_active_service_areas
    into v_area_limit
  from public.seller_subscriptions ss
  join public.subscription_plans sp on sp.id = ss.plan_id
  where ss.store_id = new.store_id
    and ss.status = 'ACTIVE'
    and sp.is_active
    and sp.max_active_service_areas > 1
    and (ss.starts_at is null or ss.starts_at <= now())
    and (ss.ends_at is null or ss.ends_at > now())
  limit 1;

  v_area_limit := coalesce(v_area_limit, 1);

  if not new.is_primary then
    select exists (
      select 1
      from public.store_neighborhoods sn
      where sn.store_id = new.store_id
        and sn.is_primary
        and sn.is_active
        and sn.id <> new.id
    )
    into v_has_primary;

    if not v_has_primary then
      raise exception 'An active primary service area is required before an additional area can be activated';
    end if;
  end if;

  select count(*)::integer
    into v_active_count
  from public.store_neighborhoods sn
  where sn.store_id = new.store_id
    and sn.is_active
    and sn.id <> new.id;

  if v_active_count >= v_area_limit then
    raise exception 'Active service area limit exceeded for the current subscription plan';
  end if;

  new.activated_at := coalesce(new.activated_at, now());
  return new;
end;
$$;

revoke all on function private.validate_store_neighborhood_entitlement() from public;
revoke all on function private.validate_store_neighborhood_entitlement() from anon, authenticated, service_role;

create trigger trg_store_neighborhoods_validate_entitlement
before insert or update of store_id, neighborhood_id, is_primary, is_active
on public.store_neighborhoods
for each row execute function private.validate_store_neighborhood_entitlement();

create or replace function private.is_service_area_effectively_active(
  p_store_neighborhood_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_neighborhoods sn
    join public.stores s on s.id = sn.store_id
    where sn.id = p_store_neighborhood_id
      and sn.is_active
      and s.is_active
      and s.platform_status = 'ACTIVE'
      and (
        sn.is_primary
        or exists (
          select 1
          from public.seller_subscriptions ss
          join public.subscription_plans sp on sp.id = ss.plan_id
          where ss.store_id = sn.store_id
            and ss.status = 'ACTIVE'
            and sp.is_active
            and sp.max_active_service_areas > 1
            and (ss.starts_at is null or ss.starts_at <= now())
            and (ss.ends_at is null or ss.ends_at > now())
        )
      )
  );
$$;

revoke all on function private.is_service_area_effectively_active(uuid) from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_service_area_effectively_active(uuid)
  to anon, authenticated, service_role;

-- Called only from a server endpoint after Supabase OTP verification. The
-- existing FAZ 1 profile-role guard remains the client-side escalation barrier.
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Seller role assignment requires the service role';
  end if;

  select lower(u.email)
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
      set role = v_intent.seller_type
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
    case
      when v_intent.seller_type = 'NUT_STORE' then 'STORE_PROFILE'
      else 'CATALOG'
    end
  )
  on conflict (user_id) do nothing
  returning id into v_onboarding_id;

  if v_onboarding_id is null then
    select so.id
      into v_onboarding_id
    from public.seller_onboardings so
    where so.user_id = p_user_id;
  end if;

  return v_onboarding_id;
end;
$$;

revoke all on function public.complete_seller_registration(uuid) from public;
revoke all on function public.complete_seller_registration(uuid) from anon, authenticated;
grant execute on function public.complete_seller_registration(uuid) to service_role;

create or replace function private.validate_cart_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cart_id uuid := case when tg_op = 'DELETE' then old.cart_id else new.cart_id end;
  v_store_id uuid;
  v_status text;
begin
  select c.store_id, c.status
    into v_store_id, v_status
  from public.carts c
  where c.id = v_cart_id
  for update;

  if not found then
    raise exception 'Cart not found';
  end if;

  if v_status <> 'ACTIVE' then
    raise exception 'Only an active cart can be changed';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.retail_product_id is not null and not exists (
    select 1
    from public.retail_products rp
    where rp.id = new.retail_product_id
      and rp.store_id = v_store_id
      and rp.is_active
      and rp.is_in_stock
  ) then
    raise exception 'Retail product is not available from the cart store';
  end if;

  if new.package_id is not null and not exists (
    select 1
    from public.packages p
    where p.id = new.package_id
      and p.store_id = v_store_id
      and p.is_active
  ) then
    raise exception 'Package is not available from the cart store';
  end if;

  if new.package_id is not null and new.item_quantity <> trunc(new.item_quantity) then
    raise exception 'Package quantity must be a whole number';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_cart_item() from public;
revoke all on function private.validate_cart_item() from anon, authenticated, service_role;

create trigger trg_cart_items_validate
before insert or update or delete
on public.cart_items
for each row execute function private.validate_cart_item();

create or replace function public.calculate_cart_totals(
  p_cart_id uuid,
  p_customer_id uuid
)
returns table (
  subtotal_amount numeric,
  delivery_fee_amount numeric,
  total_amount numeric,
  minimum_order_amount numeric,
  free_delivery_threshold numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_store_neighborhood_id uuid;
  v_subtotal numeric(12,2);
  v_delivery_fee numeric(12,2);
  v_minimum numeric(12,2);
  v_free_threshold numeric(12,2);
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Cart totals require the service role';
  end if;

  select c.store_id, c.store_neighborhood_id
    into v_store_id, v_store_neighborhood_id
  from public.carts c
  join public.profiles p on p.id = c.customer_id
  where c.id = p_cart_id
    and c.customer_id = p_customer_id
    and c.status = 'ACTIVE'
    and p.role = 'CUSTOMER';

  if not found then
    raise exception 'Active customer cart not found';
  end if;

  if not private.is_service_area_effectively_active(v_store_neighborhood_id) then
    raise exception 'The store does not currently deliver to this service area';
  end if;

  if not exists (
    select 1 from public.cart_items ci where ci.cart_id = p_cart_id
  ) then
    raise exception 'Cart is empty';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    left join public.retail_products rp on rp.id = ci.retail_product_id
    left join public.packages p on p.id = ci.package_id
    where ci.cart_id = p_cart_id
      and (
        (
          ci.retail_product_id is not null
          and (
            rp.id is null
            or rp.store_id <> v_store_id
            or not rp.is_active
            or not rp.is_in_stock
          )
        )
        or (
          ci.package_id is not null
          and (
            p.id is null
            or p.store_id <> v_store_id
            or not p.is_active
          )
        )
      )
  ) then
    raise exception 'Cart contains an unavailable or cross-store item';
  end if;

  select round(sum(
    case
      when ci.retail_product_id is not null then rp.price * ci.item_quantity
      else p.price * ci.item_quantity
    end
  ), 2)
    into v_subtotal
  from public.cart_items ci
  left join public.retail_products rp on rp.id = ci.retail_product_id
  left join public.packages p on p.id = ci.package_id
  where ci.cart_id = p_cart_id;

  select
      ds.minimum_order_amount,
      coalesce(sn.delivery_fee_override, ds.standard_delivery_fee),
      ds.free_delivery_threshold
    into v_minimum, v_delivery_fee, v_free_threshold
  from public.store_delivery_settings ds
  join public.store_neighborhoods sn
    on sn.id = v_store_neighborhood_id
   and sn.store_id = ds.store_id
  where ds.store_id = v_store_id;

  if not found then
    raise exception 'Store delivery settings are incomplete';
  end if;

  if v_subtotal < v_minimum then
    raise exception 'Minimum order amount has not been reached';
  end if;

  if v_free_threshold is not null and v_subtotal >= v_free_threshold then
    v_delivery_fee := 0;
  end if;

  return query
  select
    v_subtotal,
    v_delivery_fee,
    v_subtotal + v_delivery_fee,
    v_minimum,
    v_free_threshold;
end;
$$;

revoke all on function public.calculate_cart_totals(uuid, uuid) from public;
revoke all on function public.calculate_cart_totals(uuid, uuid) from anon, authenticated;
grant execute on function public.calculate_cart_totals(uuid, uuid) to service_role;

create or replace function public.create_order_from_cart(
  p_cart_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_customer_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_store_neighborhood_id uuid;
  v_totals record;
  v_payment public.store_payment_settings%rowtype;
  v_bank public.store_bank_accounts%rowtype;
  v_order_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Order creation requires the service role';
  end if;

  if btrim(coalesce(p_customer_name, '')) = ''
     or btrim(coalesce(p_customer_phone, '')) = ''
     or btrim(coalesce(p_delivery_address, '')) = '' then
    raise exception 'Customer delivery details are required';
  end if;

  select c.store_id, c.store_neighborhood_id
    into v_store_id, v_store_neighborhood_id
  from public.carts c
  where c.id = p_cart_id
    and c.customer_id = p_customer_id
    and c.status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'Active customer cart not found';
  end if;

  select *
    into v_totals
  from public.calculate_cart_totals(p_cart_id, p_customer_id);

  select ps.*
    into v_payment
  from public.store_payment_settings ps
  where ps.store_id = v_store_id;

  if not found then
    raise exception 'Store payment settings are incomplete';
  end if;

  if p_payment_method = 'CASH_ON_DELIVERY' and not v_payment.cash_on_delivery then
    raise exception 'Cash on delivery is not accepted by this store';
  elsif p_payment_method = 'CARD_ON_DELIVERY' and not v_payment.card_on_delivery then
    raise exception 'Card on delivery is not accepted by this store';
  elsif p_payment_method = 'BANK_TRANSFER' and not v_payment.bank_transfer then
    raise exception 'Bank transfer is not accepted by this store';
  elsif p_payment_method not in ('CASH_ON_DELIVERY', 'CARD_ON_DELIVERY', 'BANK_TRANSFER') then
    raise exception 'Unsupported payment method';
  end if;

  if p_payment_method = 'BANK_TRANSFER' then
    select ba.*
      into v_bank
    from public.store_bank_accounts ba
    where ba.store_id = v_store_id
      and ba.is_active
      and ba.is_default
    limit 1;

    if not found then
      raise exception 'The store has no active default bank account';
    end if;
  end if;

  insert into public.orders (
    customer_id,
    store_id,
    store_neighborhood_id,
    source_cart_id,
    payment_method,
    payment_status,
    customer_name,
    customer_phone,
    delivery_address,
    customer_note,
    subtotal_amount,
    delivery_fee_amount,
    total_amount,
    bank_account_id,
    bank_account_holder_snapshot,
    bank_iban_snapshot
  )
  values (
    p_customer_id,
    v_store_id,
    v_store_neighborhood_id,
    p_cart_id,
    p_payment_method,
    case when p_payment_method = 'BANK_TRANSFER' then 'AWAITING_TRANSFER' else 'PENDING' end,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_delivery_address),
    nullif(btrim(p_customer_note), ''),
    v_totals.subtotal_amount,
    v_totals.delivery_fee_amount,
    v_totals.total_amount,
    v_bank.id,
    v_bank.account_holder_name,
    v_bank.iban
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    source_type,
    retail_product_id,
    package_id,
    item_name_snapshot,
    unit_snapshot,
    unit_price_snapshot,
    item_quantity,
    line_total_amount
  )
  select
    v_order_id,
    'RETAIL_PRODUCT',
    rp.id,
    null,
    rp.name,
    rp.unit,
    rp.price,
    ci.item_quantity,
    round(rp.price * ci.item_quantity, 2)
  from public.cart_items ci
  join public.retail_products rp on rp.id = ci.retail_product_id
  where ci.cart_id = p_cart_id
  union all
  select
    v_order_id,
    'PACKAGE',
    null,
    p.id,
    p.name,
    'paket',
    p.price,
    ci.item_quantity,
    round(p.price * ci.item_quantity, 2)
  from public.cart_items ci
  join public.packages p on p.id = ci.package_id
  where ci.cart_id = p_cart_id;

  update public.carts
    set status = 'CONVERTED'
  where id = p_cart_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_from_cart(uuid, uuid, text, text, text, text, text)
  from public;
revoke all on function public.create_order_from_cart(uuid, uuid, text, text, text, text, text)
  from anon, authenticated;
grant execute on function public.create_order_from_cart(uuid, uuid, text, text, text, text, text)
  to service_role;

create or replace function private.protect_store_platform_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    if tg_op = 'INSERT'
       and (new.platform_status <> 'PENDING_ONBOARDING' or new.published_at is not null) then
      raise exception 'Store platform status is managed by the platform';
    end if;

    if tg_op = 'UPDATE'
       and (
         new.platform_status is distinct from old.platform_status
         or new.published_at is distinct from old.published_at
       ) then
      raise exception 'Store platform status is managed by the platform';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_store_platform_fields() from public;
revoke all on function private.protect_store_platform_fields() from anon, authenticated, service_role;

create trigger trg_stores_protect_platform_fields
before insert or update of platform_status, published_at
on public.stores
for each row execute function private.protect_store_platform_fields();

create or replace function public.initialize_store_marketplace_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free_plan_id uuid;
begin
  select sp.id
    into v_free_plan_id
  from public.subscription_plans sp
  where sp.code = 'FREE'
    and sp.is_active;

  if v_free_plan_id is null then
    raise exception 'FREE subscription plan is missing';
  end if;

  insert into public.seller_subscriptions (store_id, plan_id, status)
  values (new.id, v_free_plan_id, 'FREE')
  on conflict (store_id) do nothing;

  insert into public.store_delivery_settings (store_id)
  values (new.id)
  on conflict (store_id) do nothing;

  insert into public.store_payment_settings (store_id)
  values (new.id)
  on conflict (store_id) do nothing;

  return new;
end;
$$;

revoke all on function public.initialize_store_marketplace_settings() from public;
revoke all on function public.initialize_store_marketplace_settings()
  from anon, authenticated, service_role;

create trigger trg_stores_initialize_marketplace
after insert on public.stores
for each row execute function public.initialize_store_marketplace_settings();

-- Safe backfill for a project that may receive a store between review and
-- migration application.
insert into public.seller_subscriptions (store_id, plan_id, status)
select s.id, sp.id, 'FREE'
from public.stores s
cross join public.subscription_plans sp
where sp.code = 'FREE'
on conflict (store_id) do nothing;

insert into public.store_delivery_settings (store_id)
select s.id
from public.stores s
on conflict (store_id) do nothing;

insert into public.store_payment_settings (store_id)
select s.id
from public.stores s
on conflict (store_id) do nothing;

-- Reuse the hardened FAZ 1 updated_at trigger function.
create trigger trg_seller_registration_intents_updated_at
before update on public.seller_registration_intents
for each row execute function public.set_updated_at();

create trigger trg_seller_onboardings_updated_at
before update on public.seller_onboardings
for each row execute function public.set_updated_at();

create trigger trg_subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

create trigger trg_seller_subscriptions_updated_at
before update on public.seller_subscriptions
for each row execute function public.set_updated_at();

create trigger trg_store_delivery_settings_updated_at
before update on public.store_delivery_settings
for each row execute function public.set_updated_at();

create trigger trg_store_payment_settings_updated_at
before update on public.store_payment_settings
for each row execute function public.set_updated_at();

create trigger trg_store_bank_accounts_updated_at
before update on public.store_bank_accounts
for each row execute function public.set_updated_at();

create trigger trg_carts_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.seller_registration_intents enable row level security;
alter table public.seller_onboardings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.seller_subscriptions enable row level security;
alter table public.store_delivery_settings enable row level security;
alter table public.store_payment_settings enable row level security;
alter table public.store_bank_accounts enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Tighten existing public catalog policies so draft/suspended stores and their
-- catalog cannot leak into consumer discovery.
drop policy if exists stores_select_visible on public.stores;
create policy stores_select_visible
  on public.stores for select
  to anon, authenticated
  using (
    (is_active and platform_status = 'ACTIVE')
    or owner_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

drop policy if exists store_neighborhoods_select_public on public.store_neighborhoods;
create policy store_neighborhoods_select_public
  on public.store_neighborhoods for select
  to anon, authenticated
  using (
    private.is_service_area_effectively_active(id)
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

drop policy if exists retail_products_select_visible on public.retail_products;
create policy retail_products_select_visible
  on public.retail_products for select
  to anon, authenticated
  using (
    (
      is_active
      and exists (
        select 1
        from public.stores s
        where s.id = store_id
          and s.is_active
          and s.platform_status = 'ACTIVE'
      )
    )
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

drop policy if exists packages_select_visible on public.packages;
create policy packages_select_visible
  on public.packages for select
  to anon, authenticated
  using (
    (
      is_active
      and exists (
        select 1
        from public.stores s
        where s.id = store_id
          and s.is_active
          and s.platform_status = 'ACTIVE'
      )
    )
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

drop policy if exists package_items_select_visible on public.package_items;
create policy package_items_select_visible
  on public.package_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.packages pkg
      join public.stores s on s.id = pkg.store_id
      where pkg.id = package_id
        and (
          (pkg.is_active and s.is_active and s.platform_status = 'ACTIVE')
          or s.owner_id = (select auth.uid())
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

drop policy if exists provinces_select_authenticated on public.provinces;
drop policy if exists districts_select_authenticated on public.districts;
drop policy if exists neighborhoods_select_authenticated on public.neighborhoods;

create policy provinces_select_public
  on public.provinces for select
  to anon, authenticated
  using (true);

create policy districts_select_public
  on public.districts for select
  to anon, authenticated
  using (true);

create policy neighborhoods_select_public_active
  on public.neighborhoods for select
  to anon, authenticated
  using (
    is_active
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
      and p.role = 'ADMIN'
    )
  );

create policy seller_onboardings_select_related
  on public.seller_onboardings for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy subscription_plans_select_active
  on public.subscription_plans for select
  to anon, authenticated
  using (
    is_active
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy seller_subscriptions_select_related
  on public.seller_subscriptions for select
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy store_delivery_settings_select_visible
  on public.store_delivery_settings for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and (
          (s.is_active and s.platform_status = 'ACTIVE')
          or s.owner_id = (select auth.uid())
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy store_delivery_settings_insert_owner
  on public.store_delivery_settings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_delivery_settings_update_owner
  on public.store_delivery_settings for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_payment_settings_select_visible
  on public.store_payment_settings for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and (
          (s.is_active and s.platform_status = 'ACTIVE')
          or s.owner_id = (select auth.uid())
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy store_payment_settings_insert_owner
  on public.store_payment_settings for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_payment_settings_update_owner
  on public.store_payment_settings for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_bank_accounts_select_owner
  on public.store_bank_accounts for select
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy store_bank_accounts_insert_owner
  on public.store_bank_accounts for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_bank_accounts_update_owner
  on public.store_bank_accounts for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_bank_accounts_delete_owner
  on public.store_bank_accounts for delete
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy carts_select_own
  on public.carts for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'CUSTOMER'
    )
  );

create policy carts_insert_own
  on public.carts for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'ACTIVE'
    and private.is_service_area_effectively_active(store_neighborhood_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'CUSTOMER'
    )
  );

create policy carts_update_own
  on public.carts for update
  to authenticated
  using (
    customer_id = (select auth.uid())
    and status in ('ACTIVE', 'ABANDONED')
  )
  with check (
    customer_id = (select auth.uid())
    and status in ('ACTIVE', 'ABANDONED')
    and private.is_service_area_effectively_active(store_neighborhood_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'CUSTOMER'
    )
  );

create policy carts_delete_own
  on public.carts for delete
  to authenticated
  using (
    customer_id = (select auth.uid())
    and status in ('ACTIVE', 'ABANDONED')
  );

create policy cart_items_select_own
  on public.cart_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      join public.profiles p on p.id = c.customer_id
      where c.id = cart_id
        and c.customer_id = (select auth.uid())
        and p.role = 'CUSTOMER'
    )
  );

create policy cart_items_insert_own
  on public.cart_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.carts c
      join public.profiles p on p.id = c.customer_id
      where c.id = cart_id
        and c.customer_id = (select auth.uid())
        and c.status = 'ACTIVE'
        and p.role = 'CUSTOMER'
    )
  );

create policy cart_items_update_own
  on public.cart_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_id
        and c.customer_id = (select auth.uid())
        and c.status = 'ACTIVE'
    )
  )
  with check (
    exists (
      select 1
      from public.carts c
      join public.profiles p on p.id = c.customer_id
      where c.id = cart_id
        and c.customer_id = (select auth.uid())
        and c.status = 'ACTIVE'
        and p.role = 'CUSTOMER'
    )
  );

create policy cart_items_delete_own
  on public.cart_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_id
        and c.customer_id = (select auth.uid())
        and c.status = 'ACTIVE'
    )
  );

create policy orders_select_related
  on public.orders for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'ADMIN'
    )
  );

create policy order_items_select_related
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = (select auth.uid())
          or exists (
            select 1
            from public.stores s
            where s.id = o.store_id
              and s.owner_id = (select auth.uid())
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'ADMIN'
          )
        )
      )
  );

-- Explicit API privileges complement RLS. Sensitive/write-only tables are not
-- exposed to anon; order creation and seller/admin state transitions remain
-- service-role server operations.
revoke all on table
  public.seller_registration_intents,
  public.seller_onboardings,
  public.subscription_plans,
  public.seller_subscriptions,
  public.store_delivery_settings,
  public.store_payment_settings,
  public.store_bank_accounts,
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items
from anon, authenticated;

grant select on table
  public.provinces,
  public.districts,
  public.neighborhoods,
  public.stores,
  public.store_neighborhoods,
  public.retail_products,
  public.packages,
  public.package_items,
  public.subscription_plans,
  public.store_delivery_settings,
  public.store_payment_settings
to anon;

grant select on table
  public.provinces,
  public.districts,
  public.neighborhoods,
  public.stores,
  public.store_neighborhoods,
  public.retail_products,
  public.packages,
  public.package_items,
  public.seller_onboardings,
  public.subscription_plans,
  public.seller_subscriptions,
  public.store_delivery_settings,
  public.store_payment_settings,
  public.store_bank_accounts,
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items
to authenticated;

grant insert, update on table
  public.store_delivery_settings,
  public.store_payment_settings
to authenticated;

grant insert, update, delete on table
  public.store_bank_accounts,
  public.carts,
  public.cart_items
to authenticated;

grant all privileges on table
  public.seller_registration_intents,
  public.seller_onboardings,
  public.subscription_plans,
  public.seller_subscriptions,
  public.store_delivery_settings,
  public.store_payment_settings,
  public.store_bank_accounts,
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items
to service_role;

commit;
