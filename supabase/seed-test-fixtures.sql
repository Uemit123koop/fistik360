-- ---------------------------------------------------------------------------
-- Local/geliştirme test fixture'ı — sipariş hattını uçtan uca denemek için.
--
-- NE YAPAR
--   1. Verilen e-postaya sahip profili NUT_STORE rolüne alır
--   2. Ona yayında (platform_status = ACTIVE) bir mağaza kurar
--   3. Ankara / Çankaya / Kavaklıdere'yi ana hizmet mahallesi yapar
--   4. Katalogdan 5 ürün + 1 paket fiyatlar
--   5. Teslimat kurallarını ve ödeme yöntemlerini doldurur (havale IBAN'ı dahil)
--   6. İkinci e-postayı CUSTOMER rolüne alır
--
-- NASIL ÇALIŞTIRILIR
--   · Önce iki hesabı uygulamadan (/giris) normal şekilde kaydet.
--   · Aşağıdaki iki e-postayı kendi test hesaplarınla değiştir.
--   · Supabase Studio → SQL Editor'a yapıştırıp çalıştır.
--     (Local Supabase kullanıyorsan `supabase db reset` sonrası psql ile de olur.)
--
-- Tekrar çalıştırılabilir (idempotent). Şemaya dokunmaz; yalnız veri yazar.
-- ---------------------------------------------------------------------------

do $$
declare
  -- ↓↓↓ BUNLARI DEĞİŞTİR ↓↓↓
  v_seller_email   text := 'satici@example.com';
  v_customer_email text := 'musteri@example.com';
  -- ↑↑↑ BUNLARI DEĞİŞTİR ↑↑↑

  v_seller_id       uuid;
  v_customer_id     uuid;
  v_store_id        uuid;
  v_neighborhood_id uuid;
  v_area_id         uuid;
  v_catalog         record;
  v_price           numeric(10,2);
  v_index           integer := 0;
begin
  select id into v_seller_id from public.profiles where email = v_seller_email;
  if v_seller_id is null then
    raise exception 'Satıcı profili bulunamadı: %. Önce bu e-postayla kayıt ol.', v_seller_email;
  end if;

  select id into v_customer_id from public.profiles where email = v_customer_email;
  if v_customer_id is null then
    raise exception 'Müşteri profili bulunamadı: %. Önce bu e-postayla kayıt ol.', v_customer_email;
  end if;

  -- 1) Roller. `block_profile_role_updates` tetikleyicisi yalnız auth.uid()
  --    doluyken (yani istemci oturumundan) engeller; SQL editöründen serbesttir.
  update public.profiles set role = 'NUT_STORE' where id = v_seller_id;
  update public.profiles set role = 'CUSTOMER'  where id = v_customer_id;

  -- 2) Mağaza. Yayın alanlarını yalnız postgres/service_role yazabilir.
  select id into v_store_id from public.stores where owner_id = v_seller_id order by created_at limit 1;
  if v_store_id is null then
    insert into public.stores (
      owner_id, name, slug, description, phone, address,
      province, district, neighborhood,
      is_active, platform_status, published_at
    )
    values (
      v_seller_id,
      'Test Kuruyemiş',
      'test-kuruyemis-' || substr(replace(v_seller_id::text, '-', ''), 1, 8),
      'Sipariş hattını denemek için kurulmuş test mağazası.',
      '05001112233',
      'Kavaklıdere Mah. Test Sok. No:1',
      'Ankara', 'Çankaya', 'Kavaklıdere',
      true, 'ACTIVE', now()
    )
    returning id into v_store_id;
  else
    update public.stores
       set is_active = true, platform_status = 'ACTIVE', published_at = coalesce(published_at, now())
     where id = v_store_id;
  end if;

  -- 3) Ana hizmet mahallesi. Etiketler neighborhood_id'den tetikleyiciyle dolar.
  select n.id into v_neighborhood_id
  from public.neighborhoods n
  join public.districts d on d.id = n.district_id
  join public.provinces p on p.id = d.province_id
  where p.name = 'Ankara' and d.name = 'Çankaya' and n.name = 'Kavaklıdere' and n.is_active
  limit 1;

  if v_neighborhood_id is null then
    raise exception 'Kavaklıdere mahallesi bulunamadı. Önce supabase/seed.sql çalıştırılmalı.';
  end if;

  select id into v_area_id
  from public.store_neighborhoods
  where store_id = v_store_id and neighborhood_id = v_neighborhood_id;

  if v_area_id is null then
    insert into public.store_neighborhoods (
      store_id, neighborhood_id, province, district, neighborhood, is_primary, is_active
    )
    values (v_store_id, v_neighborhood_id, 'Ankara', 'Çankaya', 'Kavaklıdere', true, true)
    returning id into v_area_id;
  else
    update public.store_neighborhoods set is_primary = true, is_active = true where id = v_area_id;
  end if;

  -- 4) Katalogdan ürünler. Fiyatlar 120 TL'den başlayıp 35'er artar.
  for v_catalog in
    select id, name, category, retail_quantity, retail_unit
    from public.catalog_products
    where is_active and available_to_retail
    order by display_order
    limit 5
  loop
    v_price := 120 + (v_index * 35);
    insert into public.retail_products (
      store_id, catalog_product_id, name, category, description,
      price, quantity, unit, is_in_stock, is_active
    )
    values (
      v_store_id, v_catalog.id, v_catalog.name, v_catalog.category,
      'Test fixture ürünü.',
      v_price, v_catalog.retail_quantity, v_catalog.retail_unit, true, true
    )
    on conflict (store_id, catalog_product_id) where catalog_product_id is not null
    do update set price = excluded.price, is_active = true, is_in_stock = true;
    v_index := v_index + 1;
  end loop;

  -- 5) Bir hazır paket.
  if not exists (select 1 from public.packages where store_id = v_store_id and name = 'Test Aile Paketi') then
    insert into public.packages (store_id, name, package_type, price, is_active)
    values (v_store_id, 'Test Aile Paketi', 'Aile paketi', 450, true);
  end if;

  -- 6) Teslimat kuralları. Minimum sepet 150 TL, teslimat 25 TL, 400 TL üstü bedava.
  --    (Satır mağaza açılışında tetikleyiciyle zaten oluşur; burada değerler doldurulur.)
  insert into public.store_delivery_settings (store_id, minimum_order_amount, standard_delivery_fee, free_delivery_threshold)
  values (v_store_id, 150, 25, 400)
  on conflict (store_id) do update
    set minimum_order_amount = 150, standard_delivery_fee = 25, free_delivery_threshold = 400;

  -- 7) Üç ödeme yöntemi de açık.
  insert into public.store_payment_settings (store_id, cash_on_delivery, card_on_delivery, bank_transfer)
  values (v_store_id, true, true, true)
  on conflict (store_id) do update
    set cash_on_delivery = true, card_on_delivery = true, bank_transfer = true;

  -- 8) Havale için aktif varsayılan IBAN (yoksa BANK_TRANSFER siparişi reddedilir).
  if not exists (select 1 from public.store_bank_accounts where store_id = v_store_id and is_active and is_default) then
    insert into public.store_bank_accounts (store_id, account_holder_name, iban, is_default, is_active)
    values (v_store_id, 'Test Kuruyemiş Ltd. Şti.', 'TR330006100519786457841326', true, true);
  end if;

  raise notice 'Hazır. Mağaza id: %  ·  vitrin: /magaza/%', v_store_id, v_store_id;
end $$;
