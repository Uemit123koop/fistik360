-- Ana Kategori -> Alt Kategori ağacı ve ürün özellik (attribute) şeması.
-- catalog_products.category (düz metin) dokunulmadan kalır; bu tablolar ona
-- ek olarak mağaza vitrini gezintisi/filtreleri için eklenir.

create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.catalog_categories(id) on delete cascade,
  slug text not null unique,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_categories_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index idx_catalog_categories_parent on public.catalog_categories (parent_id, display_order);

create trigger trg_catalog_categories_updated_at
before update on public.catalog_categories
for each row execute function public.set_updated_at();

alter table public.catalog_categories enable row level security;

create policy catalog_categories_select_active
  on public.catalog_categories
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.catalog_categories to anon, authenticated;
grant all on public.catalog_categories to service_role;

-- Ana kategoriler
insert into public.catalog_categories (slug, name, display_order) values
  ('kuruyemis', 'Kuruyemiş', 10),
  ('lokum', 'Lokum', 20),
  ('kuru-meyve', 'Kuru Meyve', 30),
  ('cikolata-ve-draje', 'Çikolata ve Draje', 40),
  ('sekerleme', 'Şekerleme', 50),
  ('cekirdek-ve-atistirmalik', 'Çekirdek ve Atıştırmalık', 60),
  ('yoresel-ve-dogal-urunler', 'Yöresel ve Doğal Ürünler', 70),
  ('kahve', 'Kahve', 80),
  ('baharat', 'Baharat', 90);

-- Alt kategoriler
insert into public.catalog_categories (parent_id, slug, name, display_order)
select cc.id, sub.slug, sub.name, sub.display_order
from (values
  ('kuruyemis', 'antep-fistigi', 'Antep fıstığı', 10),
  ('kuruyemis', 'findik', 'Fındık', 20),
  ('kuruyemis', 'badem', 'Badem', 30),
  ('kuruyemis', 'kaju', 'Kaju', 40),
  ('kuruyemis', 'ceviz', 'Ceviz', 50),
  ('kuruyemis', 'yer-fistigi', 'Yer fıstığı', 60),
  ('kuruyemis', 'brezilya-cevizi', 'Brezilya cevizi', 70),
  ('kuruyemis', 'pekan-cevizi', 'Pekan cevizi', 80),
  ('kuruyemis', 'makademya', 'Makademya', 90),
  ('kuruyemis', 'leblebi', 'Leblebi', 100),
  ('kuruyemis', 'karisik-kuruyemis', 'Karışık kuruyemiş', 110),

  ('lokum', 'sade-lokum', 'Sade lokum', 10),
  ('lokum', 'gul-lokumu', 'Gül lokumu', 20),
  ('lokum', 'fistikli-lokum', 'Fıstıklı lokum', 30),
  ('lokum', 'findikli-lokum', 'Fındıklı lokum', 40),
  ('lokum', 'cevizli-lokum', 'Cevizli lokum', 50),
  ('lokum', 'bademli-lokum', 'Bademli lokum', 60),
  ('lokum', 'hindistan-cevizli-lokum', 'Hindistan cevizli lokum', 70),
  ('lokum', 'meyveli-lokum', 'Meyveli lokum', 80),
  ('lokum', 'cikolatali-lokum', 'Çikolatalı lokum', 90),
  ('lokum', 'fitil-lokum', 'Fitil lokum', 100),
  ('lokum', 'sarma-lokum', 'Sarma lokum', 110),
  ('lokum', 'kaymakli-lokum', 'Kaymaklı lokum', 120),
  ('lokum', 'premium-lokum', 'Premium lokum', 130),

  ('kuru-meyve', 'kuru-kayisi', 'Kuru kayısı', 10),
  ('kuru-meyve', 'kuru-incir', 'Kuru incir', 20),
  ('kuru-meyve', 'hurma', 'Hurma', 30),
  ('kuru-meyve', 'kuru-uzum', 'Kuru üzüm', 40),
  ('kuru-meyve', 'kuru-erik', 'Kuru erik', 50),
  ('kuru-meyve', 'kuru-dut', 'Kuru dut', 60),
  ('kuru-meyve', 'kuru-elma', 'Kuru elma', 70),
  ('kuru-meyve', 'kuru-cilek', 'Kuru çilek', 80),
  ('kuru-meyve', 'kuru-mango', 'Kuru mango', 90),
  ('kuru-meyve', 'kuru-ananas', 'Kuru ananas', 100),
  ('kuru-meyve', 'kuru-muz', 'Kuru muz', 110),
  ('kuru-meyve', 'meyve-cipsleri', 'Meyve cipsleri', 120),

  ('cikolata-ve-draje', 'tablet-cikolata', 'Tablet çikolata', 10),
  ('cikolata-ve-draje', 'sutlu-cikolata', 'Sütlü çikolata', 20),
  ('cikolata-ve-draje', 'bitter-cikolata', 'Bitter çikolata', 30),
  ('cikolata-ve-draje', 'beyaz-cikolata', 'Beyaz çikolata', 40),
  ('cikolata-ve-draje', 'fistikli-cikolata', 'Fıstıklı çikolata', 50),
  ('cikolata-ve-draje', 'findikli-cikolata', 'Fındıklı çikolata', 60),
  ('cikolata-ve-draje', 'cikolatali-kuruyemis', 'Çikolatalı kuruyemiş', 70),
  ('cikolata-ve-draje', 'cikolatali-kuru-meyve', 'Çikolatalı kuru meyve', 80),
  ('cikolata-ve-draje', 'draje', 'Draje', 90),
  ('cikolata-ve-draje', 'dolgulu-cikolata', 'Dolgulu çikolata', 100),
  ('cikolata-ve-draje', 'premium-cikolata', 'Premium çikolata', 110),

  ('sekerleme', 'akide-sekeri', 'Akide şekeri', 10),
  ('sekerleme', 'badem-sekeri', 'Badem şekeri', 20),
  ('sekerleme', 'bonbon', 'Bonbon', 30),
  ('sekerleme', 'jelibon', 'Jelibon', 40),
  ('sekerleme', 'meyveli-sekerleme', 'Meyveli şekerleme', 50),
  ('sekerleme', 'dolgulu-sekerleme', 'Dolgulu şekerleme', 60),
  ('sekerleme', 'cocuk-sekerlemeleri', 'Çocuk şekerlemeleri', 70),
  ('sekerleme', 'naneli-sekerleme', 'Naneli şekerleme', 80),

  ('cekirdek-ve-atistirmalik', 'ay-cekirdegi', 'Ay çekirdeği', 10),
  ('cekirdek-ve-atistirmalik', 'kabak-cekirdegi', 'Kabak çekirdeği', 20),
  ('cekirdek-ve-atistirmalik', 'tuzlu-cekirdek', 'Tuzlu çekirdek', 30),
  ('cekirdek-ve-atistirmalik', 'tuzsuz-cekirdek', 'Tuzsuz çekirdek', 40),
  ('cekirdek-ve-atistirmalik', 'soslu-misir', 'Soslu mısır', 50),
  ('cekirdek-ve-atistirmalik', 'patlamis-misir', 'Patlamış mısır', 60),
  ('cekirdek-ve-atistirmalik', 'citir-leblebi', 'Çıtır leblebi', 70),
  ('cekirdek-ve-atistirmalik', 'baharatli-atistirmalik', 'Baharatlı atıştırmalık', 80),
  ('cekirdek-ve-atistirmalik', 'karisik-cerez', 'Karışık çerez', 90),

  ('yoresel-ve-dogal-urunler', 'cezerye', 'Cezerye', 10),
  ('yoresel-ve-dogal-urunler', 'pestil', 'Pestil', 20),
  ('yoresel-ve-dogal-urunler', 'kome', 'Köme', 30),
  ('yoresel-ve-dogal-urunler', 'sucuk', 'Sucuk', 40),
  ('yoresel-ve-dogal-urunler', 'tahin', 'Tahin', 50),
  ('yoresel-ve-dogal-urunler', 'pekmez', 'Pekmez', 60),
  ('yoresel-ve-dogal-urunler', 'bal', 'Bal', 70),
  ('yoresel-ve-dogal-urunler', 'helva', 'Helva', 80),
  ('yoresel-ve-dogal-urunler', 'sire-urunleri', 'Şire ürünleri', 90),
  ('yoresel-ve-dogal-urunler', 'yoresel-tatlilar', 'Yöresel tatlılar', 100),

  ('kahve', 'turk-kahvesi', 'Türk kahvesi', 10),
  ('kahve', 'dibek-kahvesi', 'Dibek kahvesi', 20),
  ('kahve', 'menengic-kahvesi', 'Menengiç kahvesi', 30),
  ('kahve', 'damla-sakizli-kahve', 'Damla sakızlı kahve', 40),
  ('kahve', 'aromali-kahveler', 'Aromalı kahveler', 50),
  ('kahve', 'filtre-kahve', 'Filtre kahve', 60),
  ('kahve', 'espresso-kahvesi', 'Espresso kahvesi', 70),

  ('baharat', 'pul-biber', 'Pul biber', 10),
  ('baharat', 'karabiber', 'Karabiber', 20),
  ('baharat', 'kekik', 'Kekik', 30),
  ('baharat', 'kimyon', 'Kimyon', 40),
  ('baharat', 'sumak', 'Sumak', 50),
  ('baharat', 'nane', 'Nane', 60),
  ('baharat', 'tarcin', 'Tarçın', 70),
  ('baharat', 'zerdecal', 'Zerdeçal', 80),
  ('baharat', 'kori', 'Köri', 90),
  ('baharat', 'karisim-baharatlar', 'Karışım baharatlar', 100),
  ('baharat', 'kurutulmus-otlar', 'Kurutulmuş otlar', 110)
) as sub(parent_slug, slug, name, display_order)
join public.catalog_categories cc on cc.slug = sub.parent_slug;

-- catalog_products -> alt kategoriye bağlama (mevcut düz `category` metnine dokunulmaz)
alter table public.catalog_products
  add column subcategory_id uuid references public.catalog_categories(id) on delete restrict;

create index idx_catalog_products_subcategory on public.catalog_products (subcategory_id);

update public.catalog_products as cp
set subcategory_id = cc.id
from (values
  ('antep-fistigi-kavrulmus', 'antep-fistigi'),
  ('antep-fistigi-cig', 'antep-fistigi'),
  ('antep-fistigi-ici', 'antep-fistigi'),
  ('badem-kavrulmus', 'badem'),
  ('badem-cig', 'badem'),
  ('findik-kavrulmus', 'findik'),
  ('findik-cig', 'findik'),
  ('kaju-kavrulmus', 'kaju'),
  ('kaju-cig', 'kaju'),
  ('ceviz-ici', 'ceviz'),
  ('yer-fistigi-tuzlu', 'yer-fistigi'),
  ('yer-fistigi-tuzsuz', 'yer-fistigi'),
  ('sari-leblebi', 'leblebi'),
  ('beyaz-leblebi', 'leblebi'),
  ('soslu-misir', 'soslu-misir'),
  ('kabak-cekirdegi', 'kabak-cekirdegi'),
  ('ay-cekirdegi-tuzlu', 'ay-cekirdegi'),
  ('ay-cekirdegi-tuzsuz', 'ay-cekirdegi'),
  ('karisik-kuruyemis-klasik', 'karisik-kuruyemis'),
  ('karisik-kuruyemis-luks', 'karisik-kuruyemis'),
  ('kokteyl-kuruyemis', 'karisik-kuruyemis'),
  ('kuru-kayisi', 'kuru-kayisi'),
  ('gun-kurusu-kayisi', 'kuru-kayisi'),
  ('kuru-incir', 'kuru-incir'),
  ('cekirdeksiz-kuru-uzum', 'kuru-uzum'),
  ('hurma', 'hurma'),
  ('medine-hurmasi', 'hurma'),
  ('kuru-dut', 'kuru-dut'),
  ('kuru-erik', 'kuru-erik'),
  ('kuru-mango', 'kuru-mango'),
  ('kuru-ananas', 'kuru-ananas'),
  ('kuru-elma', 'kuru-elma'),
  ('pestil', 'pestil'),
  ('cevizli-sucuk', 'sucuk'),
  ('lokum-sade', 'sade-lokum'),
  ('lokum-gullu', 'gul-lokumu'),
  ('lokum-antep-fistikli', 'fistikli-lokum'),
  ('lokum-cifte-kavrulmus', 'premium-lokum'),
  ('lokum-narli', 'meyveli-lokum'),
  ('lokum-kadayifli', 'sarma-lokum'),
  ('draje-badem', 'draje'),
  ('draje-findik', 'draje'),
  ('kahve-cekirdegi', 'filtre-kahve'),
  ('turk-kahvesi', 'turk-kahvesi')
  -- not: 'turna-yemisi' verilen taksonomide net bir alt kategoriye oturmuyor,
  -- yanlış etiketlemek yerine subcategory_id boş bırakılıyor (yine de "Tümü"
  -- görünümünde listelenir).
) as mapping(product_slug, category_slug)
join public.catalog_categories cc on cc.slug = mapping.category_slug
where cp.slug = mapping.product_slug;

-- Ürün özellikleri (attribute) şeması
create table public.catalog_attributes (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  input_type text not null default 'single' check (input_type in ('single', 'multi')),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.catalog_attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.catalog_attributes(id) on delete cascade,
  value_key text not null,
  label text not null,
  display_order integer not null default 0,
  unique (attribute_id, value_key)
);

create table public.catalog_product_attribute_values (
  catalog_product_id uuid not null references public.catalog_products(id) on delete cascade,
  attribute_value_id uuid not null references public.catalog_attribute_values(id) on delete cascade,
  primary key (catalog_product_id, attribute_value_id)
);

create index idx_catalog_attribute_values_attribute on public.catalog_attribute_values (attribute_id);
create index idx_catalog_product_attribute_values_value on public.catalog_product_attribute_values (attribute_value_id);

alter table public.catalog_attributes enable row level security;
alter table public.catalog_attribute_values enable row level security;
alter table public.catalog_product_attribute_values enable row level security;

create policy catalog_attributes_select_all on public.catalog_attributes for select to anon, authenticated using (true);
create policy catalog_attribute_values_select_all on public.catalog_attribute_values for select to anon, authenticated using (true);
create policy catalog_product_attribute_values_select_all on public.catalog_product_attribute_values for select to anon, authenticated using (true);

grant select on public.catalog_attributes to anon, authenticated;
grant select on public.catalog_attribute_values to anon, authenticated;
grant select on public.catalog_product_attribute_values to anon, authenticated;
grant all on public.catalog_attributes to service_role;
grant all on public.catalog_attribute_values to service_role;
grant all on public.catalog_product_attribute_values to service_role;

insert into public.catalog_attributes (key, label, input_type, display_order) values
  ('isleme_sekli', 'İşleme şekli', 'single', 10),
  ('tuz_durumu', 'Tuz durumu', 'single', 20),
  ('tat', 'Tat', 'single', 30),
  ('mensei', 'Menşei', 'single', 40),
  ('kalite', 'Kalite', 'single', 50),
  ('ambalaj_tipi', 'Ambalaj tipi', 'single', 60),
  ('beslenme_etiketi', 'Beslenme etiketi', 'multi', 70),
  ('uretim_tipi', 'Üretim tipi', 'single', 80);

insert into public.catalog_attribute_values (attribute_id, value_key, label, display_order)
select ca.id, val.value_key, val.label, val.display_order
from (values
  ('isleme_sekli', 'cig', 'Çiğ', 10),
  ('isleme_sekli', 'kavrulmus', 'Kavrulmuş', 20),

  ('tuz_durumu', 'tuzlu', 'Tuzlu', 10),
  ('tuz_durumu', 'tuzsuz', 'Tuzsuz', 20),

  ('tat', 'sade', 'Sade', 10),
  ('tat', 'soslu', 'Soslu', 20),
  ('tat', 'baharatli', 'Baharatlı', 30),

  ('mensei', 'gaziantep', 'Gaziantep', 10),
  ('mensei', 'turkiye', 'Türkiye', 20),
  ('mensei', 'ithal', 'İthal', 30),

  ('kalite', 'standart', 'Standart', 10),
  ('kalite', 'premium', 'Premium', 20),

  ('ambalaj_tipi', 'kilitli_paket', 'Kilitli paket', 10),
  ('ambalaj_tipi', 'vakumlu_paket', 'Vakumlu paket', 20),
  ('ambalaj_tipi', 'kutu', 'Kutu', 30),

  ('beslenme_etiketi', 'vegan', 'Vegan', 10),
  ('beslenme_etiketi', 'glutensiz', 'Glutensiz', 20),
  ('beslenme_etiketi', 'sekersiz', 'Şekersiz', 30),

  ('uretim_tipi', 'geleneksel', 'Geleneksel', 10),
  ('uretim_tipi', 'dogal', 'Doğal', 20),
  ('uretim_tipi', 'organik', 'Organik', 30)
) as val(attribute_key, value_key, label, display_order)
join public.catalog_attributes ca on ca.key = val.attribute_key;

-- Mevcut ürünlere yalnız isimden kesin çıkarılabilen özellikler atanır
-- (menşei/kalite/ambalaj/beslenme/üretim tipi gibi doğrulanamayan alanlar
-- uydurulmaz, boş bırakılır).
insert into public.catalog_product_attribute_values (catalog_product_id, attribute_value_id)
select cp.id, cav.id
from (values
  ('antep-fistigi-kavrulmus', 'isleme_sekli', 'kavrulmus'),
  ('antep-fistigi-cig', 'isleme_sekli', 'cig'),
  ('badem-kavrulmus', 'isleme_sekli', 'kavrulmus'),
  ('badem-cig', 'isleme_sekli', 'cig'),
  ('findik-kavrulmus', 'isleme_sekli', 'kavrulmus'),
  ('findik-cig', 'isleme_sekli', 'cig'),
  ('kaju-kavrulmus', 'isleme_sekli', 'kavrulmus'),
  ('kaju-cig', 'isleme_sekli', 'cig'),
  ('yer-fistigi-tuzlu', 'isleme_sekli', 'kavrulmus'),
  ('yer-fistigi-tuzlu', 'tuz_durumu', 'tuzlu'),
  ('yer-fistigi-tuzsuz', 'isleme_sekli', 'kavrulmus'),
  ('yer-fistigi-tuzsuz', 'tuz_durumu', 'tuzsuz'),
  ('ay-cekirdegi-tuzlu', 'isleme_sekli', 'kavrulmus'),
  ('ay-cekirdegi-tuzlu', 'tuz_durumu', 'tuzlu'),
  ('ay-cekirdegi-tuzsuz', 'isleme_sekli', 'kavrulmus'),
  ('ay-cekirdegi-tuzsuz', 'tuz_durumu', 'tuzsuz')
) as mapping(product_slug, attribute_key, value_key)
join public.catalog_products cp on cp.slug = mapping.product_slug
join public.catalog_attributes ca on ca.key = mapping.attribute_key
join public.catalog_attribute_values cav on cav.attribute_id = ca.id and cav.value_key = mapping.value_key;
