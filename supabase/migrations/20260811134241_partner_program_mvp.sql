-- FISTIK360 Partner Program MVP
-- Additive brand-commerce domain. Local commerce and wholesale remain isolated.

begin;

alter table public.profiles
  add constraint profiles_role_check_v2
  check (
    role in (
      'ADMIN',
      'WHOLESALE_SELLER',
      'NUT_STORE',
      'CUSTOMER',
      'BRAND_PARTNER'
    )
  ) not valid;

alter table public.profiles
  validate constraint profiles_role_check_v2;

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  rename constraint profiles_role_check_v2 to profiles_role_check;

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  company_name text not null,
  brand_name text not null,
  authorized_person text not null,
  phone text not null,
  email text not null,
  tax_number text not null,
  tax_office text not null,
  website text,
  instagram text,
  founded_year integer,
  brand_description text not null,
  logo_path text,
  cover_path text,
  categories text[] not null,
  approximate_product_count integer not null default 0,
  monthly_order_capacity integer not null default 0,
  ships_nationwide boolean not null default false,
  has_own_warehouse boolean not null default false,
  has_branded_packaging boolean not null default false,
  has_barcoded_products boolean not null default false,
  status text not null default 'PENDING',
  admin_note text,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_applications_company_name_check
    check (btrim(company_name) <> ''),
  constraint partner_applications_brand_name_check
    check (btrim(brand_name) <> ''),
  constraint partner_applications_authorized_person_check
    check (btrim(authorized_person) <> ''),
  constraint partner_applications_phone_check
    check (btrim(phone) <> ''),
  constraint partner_applications_email_check
    check (email = lower(btrim(email)) and position('@' in email) > 1),
  constraint partner_applications_tax_number_check
    check (tax_number ~ '^[0-9]{10,11}$'),
  constraint partner_applications_tax_office_check
    check (btrim(tax_office) <> ''),
  constraint partner_applications_founded_year_check
    check (
      founded_year is null
      or founded_year between 1800 and extract(year from current_date)::integer
    ),
  constraint partner_applications_description_check
    check (char_length(btrim(brand_description)) between 40 and 3000),
  constraint partner_applications_categories_check
    check (cardinality(categories) between 1 and 15),
  constraint partner_applications_product_count_check
    check (approximate_product_count >= 0),
  constraint partner_applications_order_capacity_check
    check (monthly_order_capacity >= 0),
  constraint partner_applications_status_check
    check (status in ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  constraint partner_applications_review_check
    check (
      status = 'PENDING'
      or (reviewed_by is not null and reviewed_at is not null)
    ),
  constraint partner_applications_terms_check
    check (btrim(terms_version) <> '')
);

create unique index uq_partner_applications_user_open
  on public.partner_applications (user_id)
  where user_id is not null
    and status in ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'SUSPENDED');

create index idx_partner_applications_status_created
  on public.partner_applications (status, created_at desc);

create index idx_partner_applications_email
  on public.partner_applications (email);

create index idx_partner_applications_reviewed_by
  on public.partner_applications (reviewed_by)
  where reviewed_by is not null;

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  application_id uuid not null unique references public.partner_applications(id) on delete restrict,
  status text not null default 'ACTIVE',
  commission_rate numeric(5,2),
  fulfillment_type text not null default 'PARTNER',
  partner_level text not null default 'STANDARD',
  contract_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_status_check
    check (status in ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
  constraint partners_commission_rate_check
    check (commission_rate is null or commission_rate between 0 and 100),
  constraint partners_fulfillment_type_check
    check (fulfillment_type in ('PARTNER', 'FISTIK360')),
  constraint partners_partner_level_check
    check (partner_level in ('STANDARD', 'SELECT', 'PREMIUM'))
);

create index idx_partners_status
  on public.partners (status);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null,
  logo_path text,
  cover_path text,
  is_verified boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_check check (btrim(name) <> ''),
  constraint brands_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint brands_description_check check (btrim(description) <> ''),
  constraint brands_id_partner_key unique (id, partner_id)
);

create index idx_brands_partner_id
  on public.brands (partner_id);

create index idx_brands_public
  on public.brands (name)
  where is_verified and is_active;

create table public.partner_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.partner_applications(id) on delete cascade,
  document_type text not null,
  file_path text not null unique,
  status text not null default 'UPLOADED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_documents_type_check
    check (document_type in ('TAX_COMPANY', 'FOOD_BUSINESS', 'TRADEMARK')),
  constraint partner_documents_status_check
    check (status in ('UPLOADED', 'VERIFIED', 'REJECTED')),
  constraint partner_documents_file_path_check
    check (btrim(file_path) <> ''),
  constraint partner_documents_application_type_key
    unique (application_id, document_type)
);

create index idx_partner_documents_application_id
  on public.partner_documents (application_id);

create table public.brand_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  brand_id uuid not null,
  category text not null,
  name text not null,
  slug text not null,
  description text not null,
  ingredients text,
  origin text,
  processing_type text,
  image_path text,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_products_brand_partner_fkey
    foreign key (brand_id, partner_id)
    references public.brands(id, partner_id)
    on delete cascade,
  constraint brand_products_category_check check (btrim(category) <> ''),
  constraint brand_products_name_check check (btrim(name) <> ''),
  constraint brand_products_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint brand_products_description_check check (btrim(description) <> ''),
  constraint brand_products_status_check
    check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  constraint brand_products_brand_slug_key unique (brand_id, slug)
);

create index idx_brand_products_partner_status
  on public.brand_products (partner_id, status);

create index idx_brand_products_brand_active
  on public.brand_products (brand_id, created_at desc)
  where status = 'ACTIVE';

create table public.brand_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.brand_products(id) on delete cascade,
  label text not null,
  weight numeric(12,3) not null,
  unit text not null,
  sku text not null,
  barcode text,
  price numeric(12,2) not null,
  compare_at_price numeric(12,2),
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_product_variants_label_check check (btrim(label) <> ''),
  constraint brand_product_variants_weight_check check (weight > 0),
  constraint brand_product_variants_unit_check
    check (unit in ('GRAM', 'KILOGRAM', 'ADET')),
  constraint brand_product_variants_sku_check check (btrim(sku) <> ''),
  constraint brand_product_variants_barcode_check
    check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  constraint brand_product_variants_price_check check (price >= 0),
  constraint brand_product_variants_compare_price_check
    check (compare_at_price is null or compare_at_price >= price),
  constraint brand_product_variants_stock_check check (stock >= 0),
  constraint brand_product_variants_product_sku_key unique (product_id, sku)
);

create unique index uq_brand_product_variants_barcode
  on public.brand_product_variants (barcode)
  where barcode is not null;

create index idx_brand_product_variants_product_active
  on public.brand_product_variants (product_id, price)
  where is_active;

create index idx_brand_products_brand_partner
  on public.brand_products (brand_id, partner_id);

create or replace function public.approve_partner_application(
  p_application_id uuid,
  p_admin_profile_id uuid,
  p_brand_slug text,
  p_commission_rate numeric default null,
  p_fulfillment_type text default 'PARTNER',
  p_partner_level text default 'STANDARD',
  p_contract_start_date date default null,
  p_admin_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application public.partner_applications%rowtype;
  v_partner_id uuid;
  v_profile_role text;
  v_required_document_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_profile_id and role = 'ADMIN'
  ) then
    raise exception 'Admin authorization required';
  end if;

  if p_brand_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid brand slug';
  end if;

  if p_fulfillment_type not in ('PARTNER', 'FISTIK360') then
    raise exception 'Invalid fulfillment type';
  end if;

  if p_partner_level not in ('STANDARD', 'SELECT', 'PREMIUM') then
    raise exception 'Invalid partner level';
  end if;

  select * into v_application
  from public.partner_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Partner application not found';
  end if;

  if v_application.status = 'APPROVED' then
    select id into v_partner_id
    from public.partners
    where application_id = p_application_id;

    if v_partner_id is null then
      raise exception 'Approved application has no partner record';
    end if;
    return v_partner_id;
  end if;

  if v_application.status not in ('PENDING', 'UNDER_REVIEW') then
    raise exception 'Application cannot be approved from status %', v_application.status;
  end if;

  if v_application.user_id is null then
    raise exception 'Application is not linked to an auth user';
  end if;

  select role into v_profile_role
  from public.profiles
  where id = v_application.user_id
  for update;

  if v_profile_role not in ('CUSTOMER', 'BRAND_PARTNER') then
    raise exception 'Applicant role is not eligible for partner approval';
  end if;

  select count(*) into v_required_document_count
  from public.partner_documents
  where application_id = p_application_id
    and document_type in ('TAX_COMPANY', 'FOOD_BUSINESS')
    and status <> 'REJECTED';

  if v_required_document_count <> 2 then
    raise exception 'Required partner documents are incomplete';
  end if;

  update public.profiles
  set role = 'BRAND_PARTNER', updated_at = now()
  where id = v_application.user_id;

  insert into public.partners (
    profile_id, application_id, commission_rate, fulfillment_type,
    partner_level, contract_start_date
  ) values (
    v_application.user_id, v_application.id, p_commission_rate,
    p_fulfillment_type, p_partner_level, p_contract_start_date
  )
  returning id into v_partner_id;

  insert into public.brands (
    partner_id, name, slug, description, logo_path, cover_path,
    is_verified, is_active
  ) values (
    v_partner_id, v_application.brand_name, p_brand_slug,
    v_application.brand_description, v_application.logo_path,
    v_application.cover_path, true, true
  );

  update public.partner_applications
  set status = 'APPROVED', admin_note = p_admin_note,
      reviewed_by = p_admin_profile_id, reviewed_at = now(), updated_at = now()
  where id = p_application_id;

  return v_partner_id;
end;
$$;

create or replace function public.review_partner_application(
  p_application_id uuid,
  p_admin_profile_id uuid,
  p_status text,
  p_admin_note text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_status text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_profile_id and role = 'ADMIN'
  ) then
    raise exception 'Admin authorization required';
  end if;

  if p_status not in ('UNDER_REVIEW', 'REJECTED', 'SUSPENDED') then
    raise exception 'Invalid review status';
  end if;

  select status into v_current_status
  from public.partner_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Partner application not found';
  end if;

  if p_status = 'UNDER_REVIEW' and v_current_status <> 'PENDING' then
    raise exception 'Only pending applications can enter review';
  elsif p_status = 'REJECTED' and v_current_status not in ('PENDING', 'UNDER_REVIEW') then
    raise exception 'Application cannot be rejected from status %', v_current_status;
  elsif p_status = 'SUSPENDED' and v_current_status not in ('APPROVED', 'SUSPENDED') then
    raise exception 'Only approved partners can be suspended';
  end if;

  update public.partner_applications
  set status = p_status, admin_note = p_admin_note,
      reviewed_by = p_admin_profile_id, reviewed_at = now(), updated_at = now()
  where id = p_application_id;

  if p_status = 'SUSPENDED' then
    update public.partners set status = 'SUSPENDED', updated_at = now()
    where application_id = p_application_id;

    update public.brands set is_active = false, updated_at = now()
    where partner_id in (
      select id from public.partners where application_id = p_application_id
    );
  end if;

  return p_status;
end;
$$;

revoke all on function public.approve_partner_application(uuid, uuid, text, numeric, text, text, date, text) from public, anon, authenticated;
grant execute on function public.approve_partner_application(uuid, uuid, text, numeric, text, text, date, text) to service_role;
revoke all on function public.review_partner_application(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_partner_application(uuid, uuid, text, text) to service_role;

create trigger set_partner_applications_updated_at
before update on public.partner_applications
for each row execute function public.set_updated_at();

create trigger set_partners_updated_at
before update on public.partners
for each row execute function public.set_updated_at();

create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger set_partner_documents_updated_at
before update on public.partner_documents
for each row execute function public.set_updated_at();

create trigger set_brand_products_updated_at
before update on public.brand_products
for each row execute function public.set_updated_at();

create trigger set_brand_product_variants_updated_at
before update on public.brand_product_variants
for each row execute function public.set_updated_at();

alter table public.partner_applications enable row level security;
alter table public.partners enable row level security;
alter table public.brands enable row level security;
alter table public.partner_documents enable row level security;
alter table public.brand_products enable row level security;
alter table public.brand_product_variants enable row level security;

create policy partner_applications_select_self_or_admin
on public.partner_applications for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

create policy partners_select_self_or_admin
on public.partners for select to authenticated
using (
  profile_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

create policy brands_select_public_owner_or_admin
on public.brands for select to anon, authenticated
using (
  (is_verified and is_active)
  or exists (
    select 1 from public.partners
    where partners.id = brands.partner_id
      and partners.profile_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

create policy partner_documents_select_self_or_admin
on public.partner_documents for select to authenticated
using (
  exists (
    select 1 from public.partner_applications
    where partner_applications.id = partner_documents.application_id
      and partner_applications.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

create policy brand_products_select_public_owner_or_admin
on public.brand_products for select to anon, authenticated
using (
  (
    status = 'ACTIVE'
    and exists (
      select 1 from public.brands
      join public.partners on partners.id = brands.partner_id
      where brands.id = brand_products.brand_id
        and brands.is_verified and brands.is_active
        and partners.status = 'ACTIVE'
    )
  )
  or exists (
    select 1 from public.partners
    where partners.id = brand_products.partner_id
      and partners.profile_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

create policy brand_product_variants_select_public_owner_or_admin
on public.brand_product_variants for select to anon, authenticated
using (
  (
    is_active
    and exists (
      select 1 from public.brand_products
      join public.brands on brands.id = brand_products.brand_id
      join public.partners on partners.id = brands.partner_id
      where brand_products.id = brand_product_variants.product_id
        and brand_products.status = 'ACTIVE'
        and brands.is_verified and brands.is_active
        and partners.status = 'ACTIVE'
    )
  )
  or exists (
    select 1 from public.brand_products
    join public.partners on partners.id = brand_products.partner_id
    where brand_products.id = brand_product_variants.product_id
      and partners.profile_id = (select auth.uid())
  )
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
);

revoke all on table public.partner_applications, public.partners,
  public.brands, public.partner_documents, public.brand_products,
  public.brand_product_variants from anon, authenticated;

grant select on table public.brands, public.brand_products,
  public.brand_product_variants to anon, authenticated;

grant select on table public.partner_applications, public.partners,
  public.partner_documents to authenticated;

grant all on table public.partner_applications, public.partners,
  public.brands, public.partner_documents, public.brand_products,
  public.brand_product_variants to service_role;

commit;
