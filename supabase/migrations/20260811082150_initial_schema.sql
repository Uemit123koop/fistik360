-- FAZ 1 initial schema for Fıstık360
-- Safe for a blank Supabase project.
-- Uses native PostgreSQL gen_random_uuid() instead of uuid-ossp.

-- 1) Enable required extension
create extension if not exists pgcrypto;

-- 2) Create tables
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'CUSTOMER' check (role in ('ADMIN','WHOLESALE_SELLER','NUT_STORE','CUSTOMER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  address text,
  province text,
  district text,
  neighborhood text,
  delivery_info text,
  is_active boolean not null default true,
  logo_url text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_neighborhoods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  province text not null,
  district text not null,
  neighborhood text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, province, district, neighborhood)
);

create table if not exists retail_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  quantity numeric(10,2) not null default 0,
  unit text not null check (unit in ('gram','kg','adet')),
  image_url text,
  is_in_stock boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  package_type text,
  price numeric(10,2) not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  product_id uuid not null references retail_products(id) on delete cascade,
  quantity numeric(10,2) not null,
  unit text not null check (unit in ('gram','kg','adet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(package_id, product_id)
);

create table if not exists wholesale_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text not null,
  origin text,
  product_type text,
  unit text not null check (unit in ('kg','ton','adet')),
  stock_quantity numeric(10,2) not null default 0,
  minimum_order_quantity numeric(10,2) not null default 0,
  unit_price numeric(10,2) not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wholesale_inquiries (
  id uuid primary key default gen_random_uuid(),
  wholesale_product_id uuid not null references wholesale_products(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  message text,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists districts (
  id uuid primary key default gen_random_uuid(),
  province_id uuid not null references provinces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(province_id, name)
);

create table if not exists neighborhoods (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(district_id, name)
);

-- 3) Indexes
create index if not exists idx_stores_owner_id on stores(owner_id);
create index if not exists idx_stores_is_active on stores(is_active);
create index if not exists idx_stores_province_district on stores(province, district);
create index if not exists idx_retail_products_store_id on retail_products(store_id);
create index if not exists idx_retail_products_active on retail_products(is_active);
create index if not exists idx_packages_store_id on packages(store_id);
create index if not exists idx_packages_active on packages(is_active);
create index if not exists idx_package_items_package_id on package_items(package_id);
create index if not exists idx_wholesale_products_seller_id on wholesale_products(seller_id);
create index if not exists idx_wholesale_products_active on wholesale_products(is_active);
create index if not exists idx_wholesale_inquiries_product_id on wholesale_inquiries(wholesale_product_id);
create index if not exists idx_wholesale_inquiries_requester_id on wholesale_inquiries(requester_id);

-- 4) Trigger function for updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

create or replace trigger trg_stores_updated_at
before update on stores
for each row execute function set_updated_at();

create or replace trigger trg_store_neighborhoods_updated_at
before update on store_neighborhoods
for each row execute function set_updated_at();

create or replace trigger trg_retail_products_updated_at
before update on retail_products
for each row execute function set_updated_at();

create or replace trigger trg_packages_updated_at
before update on packages
for each row execute function set_updated_at();

create or replace trigger trg_package_items_updated_at
before update on package_items
for each row execute function set_updated_at();

create or replace trigger trg_wholesale_products_updated_at
before update on wholesale_products
for each row execute function set_updated_at();

create or replace trigger trg_wholesale_inquiries_updated_at
before update on wholesale_inquiries
for each row execute function set_updated_at();

create or replace trigger trg_provinces_updated_at
before update on provinces
for each row execute function set_updated_at();

create or replace trigger trg_districts_updated_at
before update on districts
for each row execute function set_updated_at();

create or replace trigger trg_neighborhoods_updated_at
before update on neighborhoods
for each row execute function set_updated_at();

-- 5) Trigger: create profile row when auth user is created
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.block_profile_role_updates()
returns trigger as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'role changes are not allowed through client updates';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_profiles_role_guard on profiles;
create trigger trg_profiles_role_guard
before update on profiles
for each row execute function public.block_profile_role_updates();

-- 6) RLS enable
alter table profiles enable row level security;
alter table stores enable row level security;
alter table store_neighborhoods enable row level security;
alter table retail_products enable row level security;
alter table packages enable row level security;
alter table package_items enable row level security;
alter table wholesale_products enable row level security;
alter table wholesale_inquiries enable row level security;
alter table provinces enable row level security;
alter table districts enable row level security;
alter table neighborhoods enable row level security;

-- 7) RLS policies
create policy "profiles_select_own_or_authenticated"
  on profiles for select
  using (auth.uid() = id or auth.uid() is not null);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_self"
  on profiles for insert
  with check (auth.uid() = id);

create policy "stores_select_public_active"
  on stores for select
  using (is_active = true);

create policy "stores_update_owner"
  on stores for update
  using (owner_id = auth.uid());

create policy "stores_insert_owner"
  on stores for insert
  with check (owner_id = auth.uid());

create policy "store_neighborhoods_select_public"
  on store_neighborhoods for select
  using (true);

create policy "store_neighborhoods_update_owner"
  on store_neighborhoods for update
  using (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "store_neighborhoods_insert_owner"
  on store_neighborhoods for insert
  with check (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "retail_products_select_public_active"
  on retail_products for select
  using (is_active = true);

create policy "retail_products_update_owner"
  on retail_products for update
  using (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "retail_products_insert_owner"
  on retail_products for insert
  with check (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "packages_select_public_active"
  on packages for select
  using (is_active = true);

create policy "packages_update_owner"
  on packages for update
  using (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "packages_insert_owner"
  on packages for insert
  with check (
    store_id in (select id from stores where owner_id = auth.uid())
  );

create policy "package_items_select_public"
  on package_items for select
  using (true);

create policy "package_items_update_owner"
  on package_items for update
  using (
    package_id in (
      select p.id
      from packages p
      join stores s on s.id = p.store_id
      where s.owner_id = auth.uid()
    )
  );

create policy "package_items_insert_owner"
  on package_items for insert
  with check (
    package_id in (
      select p.id
      from packages p
      join stores s on s.id = p.store_id
      where s.owner_id = auth.uid()
    )
  );

create policy "wholesale_products_select_authorized"
  on wholesale_products for select
  using (
    is_active = true
    and (
      auth.uid() is not null
      and (
        seller_id = auth.uid()
        or exists (
          select 1
          from profiles p
          where p.id = auth.uid() and p.role in ('NUT_STORE','WHOLESALE_SELLER','ADMIN')
        )
      )
    )
  );

create policy "wholesale_products_update_owner"
  on wholesale_products for update
  using (seller_id = auth.uid());

create policy "wholesale_products_insert_owner"
  on wholesale_products for insert
  with check (seller_id = auth.uid());

drop policy if exists "wholesale_inquiries_select_related" on wholesale_inquiries;

create policy "wholesale_inquiries_select_nut_store_own"
  on wholesale_inquiries for select
  using (
    auth.uid() is not null
    and requester_id = auth.uid()
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid() and p.role = 'NUT_STORE'
    )
  );

create policy "wholesale_inquiries_select_wholesale_seller_owned"
  on wholesale_inquiries for select
  using (
    auth.uid() is not null
    and wholesale_product_id in (
      select wp.id
      from wholesale_products wp
      where wp.seller_id = auth.uid()
    )
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid() and p.role = 'WHOLESALE_SELLER'
    )
  );

create policy "wholesale_inquiries_insert_store"
  on wholesale_inquiries for insert
  with check (
    requester_id = auth.uid()
    and exists (
      select 1
      from profiles p
      where p.id = auth.uid() and p.role = 'NUT_STORE'
    )
  );

create policy "provinces_select_authenticated"
  on provinces for select
  using (auth.uid() is not null);

create policy "districts_select_authenticated"
  on districts for select
  using (auth.uid() is not null);

create policy "neighborhoods_select_authenticated"
  on neighborhoods for select
  using (auth.uid() is not null);

-- 8) Minimum geography seed (Ankara sample only)
insert into provinces (name)
values ('Ankara')
on conflict (name) do nothing;

insert into districts (province_id, name)
select p.id, 'Çankaya' from provinces p where p.name = 'Ankara'
on conflict do nothing;

insert into neighborhoods (district_id, name)
select d.id, v.name
from districts d
join provinces p on p.id = d.province_id
cross join (values ('Kavaklıdere'), ('Mebusevleri'), ('Öveçler')) as v(name)
where p.name = 'Ankara' and d.name = 'Çankaya'
on conflict do nothing;
