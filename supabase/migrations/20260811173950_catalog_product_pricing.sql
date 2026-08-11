-- FAZ 2: canonical product catalog.
-- Sellers choose a platform product and provide commercial values; product identity stays platform-owned.

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text,
  retail_quantity numeric(10,2) not null default 250,
  retail_unit text not null default 'gram'
    check (retail_unit in ('gram', 'kg', 'adet')),
  wholesale_unit text not null default 'kg'
    check (wholesale_unit in ('kg', 'ton', 'adet')),
  image_url text,
  available_to_retail boolean not null default true,
  available_to_wholesale boolean not null default true,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_products_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint catalog_products_name_check check (btrim(name) <> ''),
  constraint catalog_products_category_check check (btrim(category) <> ''),
  constraint catalog_products_retail_quantity_check check (retail_quantity > 0)
);

create index idx_catalog_products_channel
  on public.catalog_products (is_active, available_to_retail, available_to_wholesale, display_order);

create trigger trg_catalog_products_updated_at
before update on public.catalog_products
for each row execute function public.set_updated_at();

alter table public.catalog_products enable row level security;

create policy catalog_products_select_active
  on public.catalog_products
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.catalog_products to anon, authenticated;
grant all on public.catalog_products to service_role;

insert into public.catalog_products
  (slug, name, category, description, retail_quantity, retail_unit, wholesale_unit, display_order)
values
  ('antep-fistigi-kavrulmus', 'Kavrulmuş Antep Fıstığı', 'Kuruyemişler', 'Kabuklu, özenle kavrulmuş Antep fıstığı.', 250, 'gram', 'kg', 10),
  ('antep-fistigi-cig', 'Çiğ Antep Fıstığı', 'Kuruyemişler', 'Doğal çiğ Antep fıstığı.', 250, 'gram', 'kg', 20),
  ('antep-fistigi-ici', 'Antep Fıstığı İçi', 'Kuruyemişler', 'Tatlı ve mutfak kullanımı için seçilmiş iç fıstık.', 250, 'gram', 'kg', 30),
  ('badem-kavrulmus', 'Kavrulmuş Badem', 'Kuruyemişler', 'Çıtır kıvamda kavrulmuş badem.', 250, 'gram', 'kg', 40),
  ('badem-cig', 'Çiğ Badem', 'Kuruyemişler', 'Katkısız çiğ badem.', 250, 'gram', 'kg', 50),
  ('findik-kavrulmus', 'Kavrulmuş Fındık', 'Kuruyemişler', 'Karadeniz fındığı, günlük kavrulmuş.', 250, 'gram', 'kg', 60),
  ('findik-cig', 'Çiğ Fındık', 'Kuruyemişler', 'Doğal çiğ iç fındık.', 250, 'gram', 'kg', 70),
  ('kaju-kavrulmus', 'Kavrulmuş Kaju', 'Kuruyemişler', 'Hafif kavrulmuş kaju.', 250, 'gram', 'kg', 80),
  ('kaju-cig', 'Çiğ Kaju', 'Kuruyemişler', 'Doğal çiğ kaju.', 250, 'gram', 'kg', 90),
  ('ceviz-ici', 'Ceviz İçi', 'Kuruyemişler', 'Seçilmiş kelebek ceviz içi.', 250, 'gram', 'kg', 100),
  ('yer-fistigi-tuzlu', 'Tuzlu Yer Fıstığı', 'Kuruyemişler', 'Kavrulmuş tuzlu yer fıstığı.', 250, 'gram', 'kg', 110),
  ('yer-fistigi-tuzsuz', 'Tuzsuz Yer Fıstığı', 'Kuruyemişler', 'Tuz eklenmeden kavrulmuş yer fıstığı.', 250, 'gram', 'kg', 120),
  ('sari-leblebi', 'Sarı Leblebi', 'Kuruyemişler', 'Geleneksel sarı leblebi.', 250, 'gram', 'kg', 130),
  ('beyaz-leblebi', 'Beyaz Leblebi', 'Kuruyemişler', 'Çıtır beyaz leblebi.', 250, 'gram', 'kg', 140),
  ('soslu-misir', 'Soslu Mısır', 'Atıştırmalıklar', 'Baharatlı çıtır mısır.', 250, 'gram', 'kg', 150),
  ('kabak-cekirdegi', 'Kabak Çekirdeği', 'Çekirdekler', 'Seçilmiş kabak çekirdeği.', 250, 'gram', 'kg', 160),
  ('ay-cekirdegi-tuzlu', 'Tuzlu Ay Çekirdeği', 'Çekirdekler', 'Kavrulmuş tuzlu ay çekirdeği.', 250, 'gram', 'kg', 170),
  ('ay-cekirdegi-tuzsuz', 'Tuzsuz Ay Çekirdeği', 'Çekirdekler', 'Tuz eklenmeden kavrulmuş ay çekirdeği.', 250, 'gram', 'kg', 180),
  ('karisik-kuruyemis-klasik', 'Klasik Karışık Kuruyemiş', 'Karışımlar', 'Günlük tüketime uygun klasik karışım.', 250, 'gram', 'kg', 190),
  ('karisik-kuruyemis-luks', 'Lüks Karışık Kuruyemiş', 'Karışımlar', 'Premium kuruyemişlerden hazırlanan özel karışım.', 250, 'gram', 'kg', 200),
  ('kokteyl-kuruyemis', 'Kokteyl Kuruyemiş', 'Karışımlar', 'Dengeli ve çıtır kokteyl karışımı.', 250, 'gram', 'kg', 210),
  ('kuru-kayisi', 'Kuru Kayısı', 'Kuru Meyveler', 'Doğal kurutulmuş kayısı.', 250, 'gram', 'kg', 220),
  ('gun-kurusu-kayisi', 'Gün Kurusu Kayısı', 'Kuru Meyveler', 'Geleneksel yöntemle güneşte kurutulmuş kayısı.', 250, 'gram', 'kg', 230),
  ('kuru-incir', 'Kuru İncir', 'Kuru Meyveler', 'Yumuşak dokulu seçilmiş kuru incir.', 250, 'gram', 'kg', 240),
  ('cekirdeksiz-kuru-uzum', 'Çekirdeksiz Kuru Üzüm', 'Kuru Meyveler', 'Doğal tatlı çekirdeksiz kuru üzüm.', 250, 'gram', 'kg', 250),
  ('hurma', 'Hurma', 'Kuru Meyveler', 'Yumuşak ve doğal tatlı hurma.', 250, 'gram', 'kg', 260),
  ('medine-hurmasi', 'Medine Hurması', 'Kuru Meyveler', 'Seçilmiş Medine hurması.', 250, 'gram', 'kg', 270),
  ('kuru-dut', 'Kuru Dut', 'Kuru Meyveler', 'Doğal kurutulmuş dut.', 250, 'gram', 'kg', 280),
  ('kuru-erik', 'Kuru Erik', 'Kuru Meyveler', 'Çekirdeksiz kuru erik.', 250, 'gram', 'kg', 290),
  ('turna-yemisi', 'Turna Yemişi', 'Kuru Meyveler', 'Kurutulmuş turna yemişi.', 250, 'gram', 'kg', 300),
  ('kuru-mango', 'Kuru Mango', 'Kuru Meyveler', 'Dilimlenmiş kuru mango.', 250, 'gram', 'kg', 310),
  ('kuru-ananas', 'Kuru Ananas', 'Kuru Meyveler', 'Dilimlenmiş kuru ananas.', 250, 'gram', 'kg', 320),
  ('kuru-elma', 'Kuru Elma', 'Kuru Meyveler', 'İnce dilim doğal kuru elma.', 250, 'gram', 'kg', 330),
  ('pestil', 'Meyve Pestili', 'Yöresel Lezzetler', 'Geleneksel meyve pestili.', 250, 'gram', 'kg', 340),
  ('cevizli-sucuk', 'Cevizli Sucuk', 'Yöresel Lezzetler', 'Ceviz ve üzüm şırasıyla hazırlanan yöresel lezzet.', 250, 'gram', 'kg', 350),
  ('lokum-sade', 'Sade Lokum', 'Lokum ve Şekerleme', 'Geleneksel sade lokum.', 250, 'gram', 'kg', 360),
  ('lokum-gullu', 'Güllü Lokum', 'Lokum ve Şekerleme', 'Gül aromalı geleneksel lokum.', 250, 'gram', 'kg', 370),
  ('lokum-antep-fistikli', 'Antep Fıstıklı Lokum', 'Lokum ve Şekerleme', 'Bol Antep fıstıklı lokum.', 250, 'gram', 'kg', 380),
  ('lokum-cifte-kavrulmus', 'Çifte Kavrulmuş Lokum', 'Lokum ve Şekerleme', 'Yoğun fıstıklı çifte kavrulmuş lokum.', 250, 'gram', 'kg', 390),
  ('lokum-narli', 'Narlı Lokum', 'Lokum ve Şekerleme', 'Nar aromalı yumuşak lokum.', 250, 'gram', 'kg', 400),
  ('lokum-kadayifli', 'Kadayıflı Lokum', 'Lokum ve Şekerleme', 'Kadayıf kaplı dolgulu lokum.', 250, 'gram', 'kg', 410),
  ('draje-badem', 'Çikolatalı Badem Draje', 'Draje ve Çikolata', 'Çikolata kaplı badem draje.', 250, 'gram', 'kg', 420),
  ('draje-findik', 'Çikolatalı Fındık Draje', 'Draje ve Çikolata', 'Çikolata kaplı fındık draje.', 250, 'gram', 'kg', 430),
  ('kahve-cekirdegi', 'Kahve Çekirdeği', 'Kahve', 'Kavrulmuş kahve çekirdeği.', 250, 'gram', 'kg', 440),
  ('turk-kahvesi', 'Türk Kahvesi', 'Kahve', 'İnce çekilmiş geleneksel Türk kahvesi.', 250, 'gram', 'kg', 450)
on conflict (slug) do update
set name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    retail_quantity = excluded.retail_quantity,
    retail_unit = excluded.retail_unit,
    wholesale_unit = excluded.wholesale_unit,
    display_order = excluded.display_order;

alter table public.retail_products
  add column catalog_product_id uuid references public.catalog_products(id) on delete restrict;

alter table public.wholesale_products
  add column catalog_product_id uuid references public.catalog_products(id) on delete restrict;

create unique index uq_retail_products_store_catalog
  on public.retail_products (store_id, catalog_product_id)
  where catalog_product_id is not null;

create unique index uq_wholesale_products_seller_catalog
  on public.wholesale_products (seller_id, catalog_product_id)
  where catalog_product_id is not null;

create index idx_retail_products_catalog_product_id
  on public.retail_products (catalog_product_id)
  where catalog_product_id is not null;

create index idx_wholesale_products_catalog_product_id
  on public.wholesale_products (catalog_product_id)
  where catalog_product_id is not null;

drop policy if exists retail_products_insert_owner on public.retail_products;
create policy retail_products_insert_owner
  on public.retail_products
  for insert
  to authenticated
  with check (
    catalog_product_id is not null
    and exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists wholesale_products_insert_owner on public.wholesale_products;
create policy wholesale_products_insert_owner
  on public.wholesale_products
  for insert
  to authenticated
  with check (
    catalog_product_id is not null
    and seller_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  );

create or replace function public.sync_retail_product_from_catalog()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product public.catalog_products%rowtype;
begin
  if new.catalog_product_id is null then
    if tg_op = 'INSERT' then
      raise exception 'Catalog product is required';
    end if;
    return new;
  end if;

  select cp.* into v_product
  from public.catalog_products cp
  where cp.id = new.catalog_product_id
    and cp.is_active = true
    and cp.available_to_retail = true;

  if not found then
    raise exception 'Active retail catalog product is required';
  end if;

  new.name := v_product.name;
  new.category := v_product.category;
  new.description := v_product.description;
  new.quantity := v_product.retail_quantity;
  new.unit := v_product.retail_unit;
  new.image_url := v_product.image_url;
  return new;
end;
$$;

create trigger trg_retail_products_catalog_sync
before insert or update on public.retail_products
for each row execute function public.sync_retail_product_from_catalog();

create or replace function public.sync_wholesale_product_from_catalog()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product public.catalog_products%rowtype;
begin
  if new.catalog_product_id is null then
    if tg_op = 'INSERT' then
      raise exception 'Catalog product is required';
    end if;
    return new;
  end if;

  select cp.* into v_product
  from public.catalog_products cp
  where cp.id = new.catalog_product_id
    and cp.is_active = true
    and cp.available_to_wholesale = true;

  if not found then
    raise exception 'Active wholesale catalog product is required';
  end if;

  new.name := v_product.name;
  new.category := v_product.category;
  new.description := v_product.description;
  new.unit := v_product.wholesale_unit;
  new.image_url := v_product.image_url;
  return new;
end;
$$;

create trigger trg_wholesale_products_catalog_sync
before insert or update on public.wholesale_products
for each row execute function public.sync_wholesale_product_from_catalog();

revoke all on function public.sync_retail_product_from_catalog() from public, anon;
revoke all on function public.sync_wholesale_product_from_catalog() from public, anon;
