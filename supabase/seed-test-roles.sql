-- ---------------------------------------------------------------------------
-- DÖRT ROL İÇİN TEST KURULUMU
--
-- Bu betik 4 hesabı test edilebilir hale getirir:
--   ADMIN · NUT_STORE (kuruyemişçi) · WHOLESALE_SELLER (toptancı) · CUSTOMER
--
-- ÖN KOŞUL: Dört hesap da UYGULAMADAN kayıt olmuş olmalı (/magaza-ac).
--           Supabase Auth'ta kullanıcı yoksa profil satırı da olmaz.
--
-- ÖNEMLİ: ADMIN rolü uygulamada HİÇBİR yerden atanmaz — tasarım gereği.
--         Admin hesabı yalnız bu betikle (veya elle SQL'le) açılabilir.
--
-- NASIL: Aşağıdaki 4 e-postayı kendi test hesaplarınla değiştir, tümünü
--        Supabase Studio → SQL Editor'a yapıştır ve çalıştır.
--
-- Tekrar çalıştırılabilir. Şemaya DOKUNMAZ, yalnız veri yazar.
-- ---------------------------------------------------------------------------

do $$
declare
  -- ↓↓↓ BUNLARI DEĞİŞTİR ↓↓↓
  v_admin_email     text := 'admin@fistik360.com';
  v_seller_email    text := 'kuruyemisci@fistik360.com';
  v_wholesale_email text := 'toptanci@fistik360.com';
  v_customer_email  text := 'musteri@fistik360.com';
  -- ↑↑↑ BUNLARI DEĞİŞTİR ↑↑↑

  v_admin_id uuid; v_seller_id uuid; v_wholesale_id uuid; v_customer_id uuid;
  v_store_id uuid; v_neighborhood_id uuid; v_area_id uuid;
  v_catalog record; v_index integer := 0;
begin
  -- ── Profilleri bul ────────────────────────────────────────────────────────
  select id into v_admin_id     from public.profiles where email = v_admin_email;
  select id into v_seller_id    from public.profiles where email = v_seller_email;
  select id into v_wholesale_id from public.profiles where email = v_wholesale_email;
  select id into v_customer_id  from public.profiles where email = v_customer_email;

  if v_admin_id is null then raise exception 'Admin profili yok: %. Önce uygulamadan kayıt ol.', v_admin_email; end if;
  if v_seller_id is null then raise exception 'Kuruyemişçi profili yok: %', v_seller_email; end if;
  if v_wholesale_id is null then raise exception 'Toptancı profili yok: %', v_wholesale_email; end if;
  if v_customer_id is null then raise exception 'Müşteri profili yok: %', v_customer_email; end if;

  -- ── Roller ────────────────────────────────────────────────────────────────
  -- block_profile_role_updates tetikleyicisi yalnız auth.uid() doluyken
  -- (istemci oturumundan) engeller; SQL editöründen serbesttir.
  update public.profiles set role = 'ADMIN'            where id = v_admin_id;
  update public.profiles set role = 'NUT_STORE'        where id = v_seller_id;
  update public.profiles set role = 'WHOLESALE_SELLER' where id = v_wholesale_id;
  update public.profiles set role = 'CUSTOMER'         where id = v_customer_id;

  -- ══ KURUYEMİŞÇİ ═══════════════════════════════════════════════════════════
  select id into v_store_id from public.stores where owner_id = v_seller_id order by created_at limit 1;
  if v_store_id is null then
    insert into public.stores (owner_id, name, slug, description, phone, address,
                               province, district, neighborhood, is_active, platform_status, published_at)
    values (v_seller_id, 'Fıstık360 Test Kuruyemiş',
            'test-kuruyemis-' || substr(replace(v_seller_id::text, '-', ''), 1, 8),
            'Uçtan uca test için kurulmuş örnek kuruyemiş mağazası.',
            '05001112233', 'Kavaklıdere Mah. Test Sok. No:1',
            'Ankara', 'Çankaya', 'Kavaklıdere', true, 'ACTIVE', now())
    returning id into v_store_id;
  else
    update public.stores set is_active = true, platform_status = 'ACTIVE',
           published_at = coalesce(published_at, now())
     where id = v_store_id;
  end if;

  -- Ana hizmet mahallesi (etiketler neighborhood_id'den tetikleyiciyle dolar)
  select n.id into v_neighborhood_id
  from public.neighborhoods n
  join public.districts d on d.id = n.district_id
  join public.provinces p on p.id = d.province_id
  where p.name = 'Ankara' and d.name = 'Çankaya' and n.name = 'Kavaklıdere' and n.is_active
  limit 1;

  if v_neighborhood_id is null then
    raise exception 'Kavaklıdere bulunamadı. Önce supabase/seed.sql çalıştırılmalı.';
  end if;

  select id into v_area_id from public.store_neighborhoods
   where store_id = v_store_id and neighborhood_id = v_neighborhood_id;
  if v_area_id is null then
    insert into public.store_neighborhoods (store_id, neighborhood_id, province, district, neighborhood, is_primary, is_active)
    values (v_store_id, v_neighborhood_id, 'Ankara', 'Çankaya', 'Kavaklıdere', true, true);
  else
    update public.store_neighborhoods set is_primary = true, is_active = true where id = v_area_id;
  end if;

  -- Katalogdan 6 ürün (120 TL'den başlar, 35'er artar)
  for v_catalog in
    select id, name, category, retail_quantity, retail_unit
    from public.catalog_products
    where is_active and available_to_retail
    order by display_order limit 6
  loop
    insert into public.retail_products (store_id, catalog_product_id, name, category, description,
                                        price, quantity, unit, is_in_stock, is_active)
    values (v_store_id, v_catalog.id, v_catalog.name, v_catalog.category, 'Test ürünü.',
            120 + (v_index * 35), v_catalog.retail_quantity, v_catalog.retail_unit, true, true)
    on conflict (store_id, catalog_product_id) where catalog_product_id is not null
    do update set price = excluded.price, is_active = true, is_in_stock = true;
    v_index := v_index + 1;
  end loop;

  if not exists (select 1 from public.packages where store_id = v_store_id and name = 'Test Aile Paketi') then
    insert into public.packages (store_id, name, package_type, price, is_active)
    values (v_store_id, 'Test Aile Paketi', 'Aile paketi', 450, true);
  end if;

  -- Teslimat: min 150 TL, ücret 25 TL, 400 TL üstü bedava
  insert into public.store_delivery_settings (store_id, minimum_order_amount, standard_delivery_fee, free_delivery_threshold)
  values (v_store_id, 150, 25, 400)
  on conflict (store_id) do update
    set minimum_order_amount = 150, standard_delivery_fee = 25, free_delivery_threshold = 400;

  -- Üç ödeme yöntemi de açık
  insert into public.store_payment_settings (store_id, cash_on_delivery, card_on_delivery, bank_transfer)
  values (v_store_id, true, true, true)
  on conflict (store_id) do update
    set cash_on_delivery = true, card_on_delivery = true, bank_transfer = true;

  -- Havale için aktif varsayılan IBAN (yoksa BANK_TRANSFER siparişi reddedilir)
  if not exists (select 1 from public.store_bank_accounts where store_id = v_store_id and is_active and is_default) then
    insert into public.store_bank_accounts (store_id, account_holder_name, iban, is_default, is_active)
    values (v_store_id, 'Fıstık360 Test Kuruyemiş Ltd. Şti.', 'TR330006100519786457841326', true, true);
  end if;

  -- ══ TOPTANCI ══════════════════════════════════════════════════════════════
  insert into public.wholesale_seller_profiles (owner_id, business_name, slug, description, phone,
                                                product_categories, is_active, published_at)
  values (v_wholesale_id, 'Fıstık360 Test Toptan',
          'test-toptan-' || substr(replace(v_wholesale_id::text, '-', ''), 1, 8),
          'Uçtan uca test için kurulmuş örnek toptancı profili.',
          '05004445566', array['Kuruyemişler', 'Kuru Meyveler'], true, now())
  on conflict (owner_id) do update
    set is_active = true, published_at = coalesce(public.wholesale_seller_profiles.published_at, now());

  if not exists (select 1 from public.wholesale_products where seller_id = v_wholesale_id) then
    insert into public.wholesale_products (seller_id, name, category, origin, unit,
                                           stock_quantity, minimum_order_quantity, unit_price, description, is_active)
    values
      (v_wholesale_id, 'Kavrulmuş Antep Fıstığı', 'Kuruyemişler', 'Gaziantep', 'kg', 500, 25, 480, 'Test toptan ürünü.', true),
      (v_wholesale_id, 'Çiğ Badem',               'Kuruyemişler', 'Datça',     'kg', 800, 50, 320, 'Test toptan ürünü.', true),
      (v_wholesale_id, 'Kuru Kayısı',             'Kuru Meyveler','Malatya',   'kg', 1200, 100, 210, 'Test toptan ürünü.', true);
  end if;

  raise notice 'Hazır. Mağaza: %  ·  vitrin: /magaza/%', v_store_id, v_store_id;
end $$;

-- Doğrulama: dört rolün de yerinde olduğunu gör
select email, role from public.profiles
where email in ('admin@fistik360.com', 'kuruyemisci@fistik360.com',
                'toptanci@fistik360.com', 'musteri@fistik360.com')
order by role;
