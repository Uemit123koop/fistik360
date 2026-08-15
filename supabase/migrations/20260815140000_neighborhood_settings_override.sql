-- Mahalle bazlı teslimat/ödeme ayarı: her store_neighborhood isteğe bağlı olarak
-- kendi teslimat ve ödeme ayarını taşıyabilir (satır yoksa mağaza varsayılanı
-- store_delivery_settings/store_payment_settings geçerli kalır — additive,
-- geriye dönük hiçbir mağazayı etkilemez). Satıcı "Uygula" ile bir mahallenin
-- ayarını diğerlerine kopyalayabilir ya da tek tek mahalleye girip kendi
-- ayarını yapabilir.

create table public.store_neighborhood_settings (
  store_neighborhood_id uuid primary key references public.store_neighborhoods(id) on delete cascade,
  minimum_order_amount numeric(12,2) not null default 0,
  standard_delivery_fee numeric(12,2) not null default 0,
  free_delivery_threshold numeric(12,2),
  cash_on_delivery boolean not null default true,
  card_on_delivery boolean not null default false,
  bank_transfer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_neighborhood_settings_minimum_check check (minimum_order_amount >= 0),
  constraint store_neighborhood_settings_fee_check check (standard_delivery_fee >= 0),
  constraint store_neighborhood_settings_free_threshold_check
    check (free_delivery_threshold is null or free_delivery_threshold >= minimum_order_amount),
  constraint store_neighborhood_settings_at_least_one_check
    check (cash_on_delivery or card_on_delivery or bank_transfer)
);

alter table public.store_neighborhood_settings enable row level security;

-- Satıcı yalnız kendi mağazasının mahalle ayarını okuyabilir/yazabilir.
create policy store_neighborhood_settings_owner_select
  on public.store_neighborhood_settings for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_neighborhoods sn
      join public.stores s on s.id = sn.store_id
      where sn.id = store_neighborhood_settings.store_neighborhood_id
        and s.owner_id = auth.uid()
    )
  );

create policy store_neighborhood_settings_owner_write
  on public.store_neighborhood_settings for all
  to authenticated
  using (
    exists (
      select 1
      from public.store_neighborhoods sn
      join public.stores s on s.id = sn.store_id
      where sn.id = store_neighborhood_settings.store_neighborhood_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_neighborhoods sn
      join public.stores s on s.id = sn.store_id
      where sn.id = store_neighborhood_settings.store_neighborhood_id
        and s.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.store_neighborhood_settings to authenticated;
grant all on public.store_neighborhood_settings to service_role;

-- ─── calculate_cart_totals: mahalle override'ı store-wide ayarın önüne al ────

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
      coalesce(nbs.minimum_order_amount, ds.minimum_order_amount),
      coalesce(nbs.standard_delivery_fee, sn.delivery_fee_override, ds.standard_delivery_fee),
      coalesce(nbs.free_delivery_threshold, ds.free_delivery_threshold)
    into v_minimum, v_delivery_fee, v_free_threshold
  from public.store_delivery_settings ds
  join public.store_neighborhoods sn
    on sn.id = v_store_neighborhood_id
   and sn.store_id = ds.store_id
  left join public.store_neighborhood_settings nbs
    on nbs.store_neighborhood_id = sn.id
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

-- ─── create_order_from_cart: ödeme yöntemi kabulünü mahalle override'ına göre kontrol et ─

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
  v_cash_ok boolean;
  v_card_ok boolean;
  v_bank_ok boolean;
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

  select
      coalesce(nbs.cash_on_delivery, ps.cash_on_delivery),
      coalesce(nbs.card_on_delivery, ps.card_on_delivery),
      coalesce(nbs.bank_transfer, ps.bank_transfer)
    into v_cash_ok, v_card_ok, v_bank_ok
  from public.store_payment_settings ps
  left join public.store_neighborhood_settings nbs
    on nbs.store_neighborhood_id = v_store_neighborhood_id
  where ps.store_id = v_store_id;

  if not found then
    raise exception 'Store payment settings are incomplete';
  end if;

  if p_payment_method = 'CASH_ON_DELIVERY' and not v_cash_ok then
    raise exception 'Cash on delivery is not accepted by this store';
  elsif p_payment_method = 'CARD_ON_DELIVERY' and not v_card_ok then
    raise exception 'Card on delivery is not accepted by this store';
  elsif p_payment_method = 'BANK_TRANSFER' and not v_bank_ok then
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
    null::uuid,
    null::uuid,
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
    null::uuid,
    p.id,
    null::uuid,
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
    null::uuid,
    null::uuid,
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
