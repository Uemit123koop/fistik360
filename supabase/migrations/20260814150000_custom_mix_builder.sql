-- "Kendi karışımını oluştur": müşterinin birden çok perakende ürünü kendi
-- belirlediği gramajlarla karıştırıp tek bir sepet satırı olarak satın
-- alabilmesi. Fiyat, karışım oluşturulduğu anda gerçek retail_products
-- price/quantity/unit'ten sunucu tarafında hesaplanıp burada snapshot'lanır
-- (bir karışımın "canlı" kaynak satırı yok, bu yüzden guest-cart-server.ts'teki
-- ilkeyle aynı: istemciden fiyat kabul edilmez, snapshot tek doğruluk kaynağı).

create table public.cart_custom_mixes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name_snapshot text not null,
  total_weight_grams numeric(12,2) not null,
  total_price_amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint cart_custom_mixes_weight_check check (total_weight_grams > 0),
  constraint cart_custom_mixes_price_check check (total_price_amount >= 0),
  constraint cart_custom_mixes_name_check check (btrim(name_snapshot) <> '')
);

create table public.cart_custom_mix_items (
  id uuid primary key default gen_random_uuid(),
  custom_mix_id uuid not null references public.cart_custom_mixes(id) on delete cascade,
  retail_product_id uuid not null references public.retail_products(id) on delete restrict,
  product_name_snapshot text not null,
  grams numeric(12,2) not null,
  unit_price_snapshot numeric(12,2) not null,
  line_price_amount numeric(12,2) not null,
  constraint cart_custom_mix_items_grams_check check (grams > 0),
  constraint cart_custom_mix_items_price_check check (unit_price_snapshot >= 0 and line_price_amount >= 0)
);

create index idx_cart_custom_mix_items_mix on public.cart_custom_mix_items (custom_mix_id);
create index idx_cart_custom_mixes_store on public.cart_custom_mixes (store_id);

-- Bu tablolara yalnız service_role (POST /api/custom-mixes, admin client) yazar
-- ve okur; misafir müşteriler de karışım oluşturabilsin diye anon/authenticated
-- için RLS policy'si yok (RLS açık, policy'siz = varsayılan olarak erişim yok).
alter table public.cart_custom_mixes enable row level security;
alter table public.cart_custom_mix_items enable row level security;
grant all on public.cart_custom_mixes to service_role;
grant all on public.cart_custom_mix_items to service_role;

-- ─── cart_items: üçüncü kaynak türü ──────────────────────────────────────────

alter table public.cart_items
  add column custom_mix_id uuid references public.cart_custom_mixes(id) on delete cascade;

alter table public.cart_items drop constraint cart_items_single_source_check;
alter table public.cart_items add constraint cart_items_single_source_check
  check (num_nonnulls(retail_product_id, package_id, custom_mix_id) = 1);

create unique index uq_cart_items_custom_mix
  on public.cart_items (cart_id, custom_mix_id)
  where custom_mix_id is not null;
create index idx_cart_items_custom_mix_id
  on public.cart_items (custom_mix_id)
  where custom_mix_id is not null;

-- ─── order_items: üçüncü kaynak türü ─────────────────────────────────────────

alter table public.order_items
  add column custom_mix_id uuid references public.cart_custom_mixes(id) on delete set null;

alter table public.order_items drop constraint order_items_source_type_check;
alter table public.order_items add constraint order_items_source_type_check
  check (source_type in ('RETAIL_PRODUCT', 'PACKAGE', 'CUSTOM_MIX'));

alter table public.order_items drop constraint order_items_source_reference_check;
alter table public.order_items add constraint order_items_source_reference_check
  check (
    num_nonnulls(retail_product_id, package_id, custom_mix_id) <= 1
    and (retail_product_id is null or source_type = 'RETAIL_PRODUCT')
    and (package_id is null or source_type = 'PACKAGE')
    and (custom_mix_id is null or source_type = 'CUSTOM_MIX')
  );

-- ─── validate_cart_item(): custom_mix dalı eklendi ───────────────────────────

create or replace function private.validate_cart_item()
returns trigger
language plpgsql
security invoker
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

  if new.custom_mix_id is not null and not exists (
    select 1
    from public.cart_custom_mixes cmx
    where cmx.id = new.custom_mix_id
      and cmx.store_id = v_store_id
  ) then
    raise exception 'Custom mix is not available from the cart store';
  end if;

  if new.package_id is not null and new.item_quantity <> trunc(new.item_quantity) then
    raise exception 'Package quantity must be a whole number';
  end if;

  if new.custom_mix_id is not null and new.item_quantity <> trunc(new.item_quantity) then
    raise exception 'Custom mix quantity must be a whole number';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_cart_item() from public;
revoke all on function private.validate_cart_item() from anon, authenticated, service_role;

-- ─── calculate_cart_totals(): custom_mix dalı eklendi ────────────────────────

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
    left join public.cart_custom_mixes cmx on cmx.id = ci.custom_mix_id
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
        or (
          ci.custom_mix_id is not null
          and (
            cmx.id is null
            or cmx.store_id <> v_store_id
          )
        )
      )
  ) then
    raise exception 'Cart contains an unavailable or cross-store item';
  end if;

  select round(sum(
    case
      when ci.retail_product_id is not null then rp.price * ci.item_quantity
      when ci.package_id is not null then p.price * ci.item_quantity
      else cmx.total_price_amount * ci.item_quantity
    end
  ), 2)
    into v_subtotal
  from public.cart_items ci
  left join public.retail_products rp on rp.id = ci.retail_product_id
  left join public.packages p on p.id = ci.package_id
  left join public.cart_custom_mixes cmx on cmx.id = ci.custom_mix_id
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

-- ─── create_order_from_cart(): custom_mix dalı eklendi ───────────────────────

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
    custom_mix_id,
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
    null,
    p.name,
    'paket',
    p.price,
    ci.item_quantity,
    round(p.price * ci.item_quantity, 2)
  from public.cart_items ci
  join public.packages p on p.id = ci.package_id
  where ci.cart_id = p_cart_id
  union all
  select
    v_order_id,
    'CUSTOM_MIX',
    null,
    null,
    cmx.id,
    cmx.name_snapshot,
    'paket',
    cmx.total_price_amount,
    ci.item_quantity,
    round(cmx.total_price_amount * ci.item_quantity, 2)
  from public.cart_items ci
  join public.cart_custom_mixes cmx on cmx.id = ci.custom_mix_id
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
