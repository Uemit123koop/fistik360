create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text,
  role text not null default 'CUSTOMER' check (role in ('ADMIN','WHOLESALE_SELLER','NUT_STORE','CUSTOMER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  province text not null,
  district text not null,
  neighborhood text not null,
  created_at timestamptz not null default now(),
  unique(store_id, province, district, neighborhood)
);

create table if not exists retail_products (
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
  package_id uuid not null references packages(id) on delete cascade,
  product_id uuid not null references retail_products(id) on delete cascade,
  quantity numeric(10,2) not null,
  unit text not null check (unit in ('gram','kg','adet')),
  created_at timestamptz not null default now(),
  unique(package_id, product_id)
);

create table if not exists wholesale_products (
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
  wholesale_product_id uuid not null references wholesale_products(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  message text,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);

create table if not exists provinces (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table if not exists districts (
  id uuid primary key default uuid_generate_v4(),
  province_id uuid not null references provinces(id) on delete cascade,
  name text not null,
  unique(province_id, name)
);

create table if not exists neighborhoods (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid not null references districts(id) on delete cascade,
  name text not null,
  unique(district_id, name)
);

create index if not exists idx_stores_owner_id on stores(owner_id);
create index if not exists idx_stores_is_active on stores(is_active);
create index if not exists idx_retail_products_store_id on retail_products(store_id);
create index if not exists idx_packages_store_id on packages(store_id);
create index if not exists idx_wholesale_products_seller_id on wholesale_products(seller_id);
create index if not exists idx_wholesale_products_active on wholesale_products(is_active);
