-- create_order_from_cart() içindeki order_items UNION ALL'unda retail_product_id/
-- package_id/custom_mix_id kolonlarına yazılan çıplak `null`lar tipsiz kalıyordu.
-- Postgres ilk iki dalı (RETAIL_PRODUCT, PACKAGE) birleştirirken custom_mix_id
-- kolonunda iki taraf da tipsiz NULL olduğu için varsayılan olarak text seçiyor;
-- üçüncü dal (CUSTOM_MIX, cmx.id uuid) ile birleşince "UNION types text and uuid
-- cannot be matched" hatasıyla her siparişte patlıyordu. Çözüm: tüm null'ları
-- açıkça ::uuid olarak cast etmek.

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
