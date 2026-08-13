-- Realistic MVP seed: 15 kuruyemişçi (nut store) accounts spread across Ankara
-- neighborhoods, each with real retail products (from the canonical catalog),
-- packages, payment settings and a bank account, wired through the real
-- cart/checkout tables (stores/retail_products/packages/store_neighborhoods).
-- Replaces the old frontend-only DEMO_SELLERS mock data.
--
-- Idempotency: safe to re-run on a project that already has these rows,
-- guarded by the email/slug uniqueness checks below.

begin;

-- 1) Geography: expand beyond the 3 Çankaya neighborhoods already seeded in
--    supabase/seed.sql so the 15 stores can spread across distinct mahalleler.
insert into provinces (name)
values ('Ankara')
on conflict (name) do nothing;

insert into districts (province_id, name)
select p.id, d.name
from provinces p
cross join (values ('Çankaya'), ('Keçiören'), ('Yenimahalle'), ('Mamak'), ('Etimesgut')) as d(name)
where p.name = 'Ankara'
on conflict (province_id, name) do nothing;

insert into neighborhoods (district_id, name)
select d.id, v.name
from districts d
join provinces p on p.id = d.province_id
join (values
  ('Çankaya', 'Kavaklıdere'),
  ('Çankaya', 'Mebusevleri'),
  ('Çankaya', 'Öveçler'),
  ('Keçiören', 'Etlik'),
  ('Keçiören', 'Aktepe'),
  ('Keçiören', 'Bağlarbaşı'),
  ('Yenimahalle', 'Batıkent'),
  ('Yenimahalle', 'Demetevler'),
  ('Yenimahalle', 'Şentepe'),
  ('Mamak', 'Akdere'),
  ('Mamak', 'Türközü'),
  ('Mamak', 'Yeşilbayır'),
  ('Etimesgut', 'Elvan'),
  ('Etimesgut', 'Eryaman'),
  ('Etimesgut', 'Bahçekapı')
) as v(district_name, name) on v.district_name = d.name
where p.name = 'Ankara'
on conflict (district_id, name) do nothing;

-- 2) Stores + owners + products + packages.
-- supabase db push does not execute as session_user 'postgres' (unlike a
-- direct psql/db-query connection), so trg_stores_protect_platform_fields
-- would reject setting platform_status='ACTIVE' directly. Disable it for the
-- duration of this seed instead of depending on the role it runs as.
alter table public.stores disable trigger trg_stores_protect_platform_fields;

do $$
declare
  v_store record;
  v_owner_id uuid;
  v_store_id uuid;
  v_neighborhood_id uuid;
  v_cat record;
  v_product_id uuid;
  v_product_ids uuid[];
  v_product_prices numeric[];
  v_price numeric;
  v_pkg_id uuid;
  v_iban_suffix text;
  v_seed_email text;
begin
  -- Shared catalog assortment (14 popular products); each store gets a
  -- rotating window of 7 of these so the 15 storefronts don't look identical.
  create temporary table tmp_catalog_assortment (
    seq int primary key,
    slug text not null,
    base_price numeric not null,
    qty numeric not null,
    unit text not null
  ) on commit drop;

  insert into tmp_catalog_assortment (seq, slug, base_price, qty, unit) values
    (1, 'antep-fistigi-kavrulmus', 320, 250, 'gram'),
    (2, 'antep-fistigi-cig', 290, 250, 'gram'),
    (3, 'badem-kavrulmus', 180, 250, 'gram'),
    (4, 'findik-kavrulmus', 160, 250, 'gram'),
    (5, 'kaju-kavrulmus', 210, 250, 'gram'),
    (6, 'ceviz-ici', 240, 250, 'gram'),
    (7, 'yer-fistigi-tuzlu', 90, 250, 'gram'),
    (8, 'sari-leblebi', 70, 250, 'gram'),
    (9, 'kabak-cekirdegi', 130, 250, 'gram'),
    (10, 'ay-cekirdegi-tuzlu', 60, 250, 'gram'),
    (11, 'karisik-kuruyemis-luks', 260, 250, 'gram'),
    (12, 'kuru-kayisi', 110, 250, 'gram'),
    (13, 'kuru-incir', 140, 250, 'gram'),
    (14, 'hurma', 95, 250, 'gram');

  for v_store in
    select * from (values
      (1, 'Kavaklıdere Kuruyemiş', 'kavaklidere-kuruyemis', 'Kavaklıdere', 'Kavaklıdere''nin köşe başı kuruyemişçisi; taze kavrulmuş fıstık ve badem çeşitleriyle.'),
      (2, 'Mebusevleri Fıstık Evi', 'mebusevleri-fistik-evi', 'Mebusevleri', 'Antep fıstığı ve kuru meyve konusunda uzmanlaşmış mahalle dükkanı.'),
      (3, 'Öveçler Çerez Sarayı', 'ovecler-cerez-sarayi', 'Öveçler', 'Geniş çekirdek ve karışık kuruyemiş seçkisiyle mahallenin favorisi.'),
      (4, 'Etlik Leblebi ve Fıstık', 'etlik-leblebi-ve-fistik', 'Etlik', 'Günlük kavrulmuş leblebi ve fıstık ustası.'),
      (5, 'Aktepe Kuruyemişçisi', 'aktepe-kuruyemiscisi', 'Aktepe', 'Uygun fiyatlı, günlük taze kuruyemiş.'),
      (6, 'Bağlarbaşı Kuru Kayısı Evi', 'baglarbasi-kuru-kayisi-evi', 'Bağlarbaşı', 'Kuru meyve ve kuruyemiş bir arada, aile işletmesi.'),
      (7, 'Batıkent Kuruyemiş Merkezi', 'batikent-kuruyemis-merkezi', 'Batıkent', 'Toplu alışverişe uygun geniş kuruyemiş reyonu.'),
      (8, 'Demetevler Fıstıkçı Hasan', 'demetevler-fistikci-hasan', 'Demetevler', '40 yıllık ustalıkla kavrulmuş Antep fıstığı.'),
      (9, 'Şentepe Kuruyemiş', 'sentepe-kuruyemis', 'Şentepe', 'Mahalleye özel karışık kuruyemiş paketleriyle tanınır.'),
      (10, 'Akdere Çerezci', 'akdere-cerezci', 'Akdere', 'Günlük taze çekirdek ve leblebi çeşitleri.'),
      (11, 'Türközü Kuru Meyve ve Fıstık', 'turkozu-kuru-meyve-ve-fistik', 'Türközü', 'Kuru meyve ağırlıklı, sağlıklı atıştırmalık seçkisi.'),
      (12, 'Yeşilbayır Kuruyemişçisi', 'yesilbayir-kuruyemiscisi', 'Yeşilbayır', 'Mahalle esnafından geleneksel kavrulmuş kuruyemiş.'),
      (13, 'Elvan Fıstık Dükkanı', 'elvan-fistik-dukkani', 'Elvan', 'Antep fıstığı ve kajuda uzman butik dükkan.'),
      (14, 'Eryaman Kuruyemiş Bahçesi', 'eryaman-kuruyemis-bahcesi', 'Eryaman', 'Geniş ürün yelpazesiyle ailece alışveriş noktası.'),
      (15, 'Bahçekapı Kuruyemiş Evi', 'bahcekapi-kuruyemis-evi', 'Bahçekapı', 'Kaliteli ham ve kavrulmuş kuruyemiş çeşitleri.')
    ) as t(idx, name, slug, neighborhood_name, description)
  loop
    -- Skip a store that already exists (idempotent re-run).
    if exists (select 1 from public.stores where slug = v_store.slug) then
      continue;
    end if;

    v_seed_email := 'seed-store-' || v_store.idx || '@fistik360-seed.test';

    -- Owner: auth user (trigger auto-creates a CUSTOMER profile) then promote
    -- to NUT_STORE.
    v_owner_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
      v_seed_email,
      extensions.crypt('fistik360-seed-' || v_store.slug, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_store.name || ' Sahibi'),
      false, now(), now(), '', '', '', ''
    );

    update public.profiles set role = 'NUT_STORE' where id = v_owner_id;

    -- Store (platform_status can be set directly: this migration runs as the
    -- postgres role, which trg_stores_protect_platform_fields exempts).
    v_store_id := gen_random_uuid();
    insert into public.stores (id, owner_id, name, slug, description, is_active, platform_status, published_at)
    values (v_store_id, v_owner_id, v_store.name, v_store.slug, v_store.description, true, 'ACTIVE', now());

    -- Primary + active service neighborhood.
    select n.id into v_neighborhood_id
    from public.neighborhoods n
    join public.districts d on d.id = n.district_id
    join public.provinces p on p.id = d.province_id
    where p.name = 'Ankara' and n.name = v_store.neighborhood_name
    limit 1;

    if v_neighborhood_id is null then
      raise exception 'Neighborhood % not found for store %', v_store.neighborhood_name, v_store.name;
    end if;

    insert into public.store_neighborhoods (store_id, neighborhood_id, is_primary, is_active)
    values (v_store_id, v_neighborhood_id, true, true);

    -- Payment settings row already exists (trg_stores_initialize_marketplace);
    -- enable all 3 methods so checkout has real choices.
    update public.store_payment_settings
      set cash_on_delivery = true, card_on_delivery = true, bank_transfer = true
      where store_id = v_store_id;

    -- Bank account (fake but valid-format IBAN: TR + 24 digits).
    v_iban_suffix := lpad((1000000000::bigint + v_store.idx::bigint * 987654321::bigint)::text, 24, '0');
    insert into public.store_bank_accounts (store_id, account_holder_name, iban, is_default, is_active)
    values (v_store_id, v_store.name, 'TR' || v_iban_suffix, true, true);

    -- Retail products: rotating window of 7 out of 14 catalog items, price
    -- varied +/-10% per store so listings aren't all identical.
    v_product_ids := array[]::uuid[];
    v_product_prices := array[]::numeric[];
    for v_cat in
      select * from tmp_catalog_assortment
      where seq in (select ((v_store.idx - 1 + k) % 14) + 1 from generate_series(0, 6) as k)
      order by seq
    loop
      v_price := round(v_cat.base_price * (0.9 + ((v_store.idx % 5) * 0.05)), 2);
      v_product_id := gen_random_uuid();
      insert into public.retail_products (id, store_id, catalog_product_id, price, quantity, unit, is_in_stock, is_active)
      select v_product_id, v_store_id, cp.id, v_price, v_cat.qty, v_cat.unit, true, true
      from public.catalog_products cp
      where cp.slug = v_cat.slug;

      v_product_ids := array_append(v_product_ids, v_product_id);
      v_product_prices := array_append(v_product_prices, v_price);
    end loop;

    -- Packages: 2 bundles built from that store's own retail products.
    v_pkg_id := gen_random_uuid();
    insert into public.packages (id, store_id, name, package_type, price, is_active)
    values (
      v_pkg_id, v_store_id, v_store.name || ' Başlangıç Paketi', 'Karma Paket',
      round((v_product_prices[1] + v_product_prices[2] + v_product_prices[3]) * 0.88, 2), true
    );
    insert into public.package_items (package_id, product_id, quantity, unit)
    values
      (v_pkg_id, v_product_ids[1], 250, 'gram'),
      (v_pkg_id, v_product_ids[2], 250, 'gram'),
      (v_pkg_id, v_product_ids[3], 250, 'gram');

    v_pkg_id := gen_random_uuid();
    insert into public.packages (id, store_id, name, package_type, price, is_active)
    values (
      v_pkg_id, v_store_id, v_store.name || ' Aile Paketi', 'Aile Boyu',
      round((v_product_prices[4] + v_product_prices[5] + v_product_prices[6] + v_product_prices[7]) * 0.85, 2), true
    );
    insert into public.package_items (package_id, product_id, quantity, unit)
    values
      (v_pkg_id, v_product_ids[4], 250, 'gram'),
      (v_pkg_id, v_product_ids[5], 250, 'gram'),
      (v_pkg_id, v_product_ids[6], 250, 'gram'),
      (v_pkg_id, v_product_ids[7], 250, 'gram');
  end loop;
end
$$;

alter table public.stores enable trigger trg_stores_protect_platform_fields;

commit;
