-- Superadmin-only AI product drafts. No catalog row exists before approval.

begin;

create table public.catalog_product_drafts (
  id uuid primary key default gen_random_uuid(),
  proposed_name text not null,
  proposed_slug text not null,
  category text not null,
  description text,
  subcategory_id uuid references public.catalog_categories(id) on delete set null,
  image_object_path text not null unique,
  generation_prompt text not null,
  prompt_version text not null,
  status text not null default 'PENDING',
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete restrict,
  catalog_product_id uuid references public.catalog_products(id) on delete set null,
  activate_on_approval boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  constraint catalog_product_drafts_name_check
    check (char_length(btrim(proposed_name)) between 2 and 140),
  constraint catalog_product_drafts_slug_check
    check (proposed_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint catalog_product_drafts_category_check
    check (btrim(category) <> ''),
  constraint catalog_product_drafts_status_check
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  constraint catalog_product_drafts_approval_state_check
    check (
      (status = 'PENDING' and approved_at is null and rejected_at is null and catalog_product_id is null)
      or (status = 'APPROVED' and approved_at is not null and rejected_at is null and catalog_product_id is not null)
      or (status = 'REJECTED' and approved_at is null and rejected_at is not null and catalog_product_id is null)
    )
);

create unique index uq_catalog_product_drafts_pending_slug
  on public.catalog_product_drafts (proposed_slug)
  where status = 'PENDING';

create index idx_catalog_product_drafts_created_by
  on public.catalog_product_drafts (created_by);

create index idx_catalog_product_drafts_catalog_product
  on public.catalog_product_drafts (catalog_product_id)
  where catalog_product_id is not null;

create index idx_catalog_product_drafts_pending_created
  on public.catalog_product_drafts (created_at desc)
  where status = 'PENDING';

create trigger trg_catalog_product_drafts_updated_at
before update on public.catalog_product_drafts
for each row execute function public.set_updated_at();

alter table public.catalog_product_drafts enable row level security;
revoke all on table public.catalog_product_drafts from public, anon, authenticated;
grant all on table public.catalog_product_drafts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-product-image-drafts',
  'catalog-product-image-drafts',
  false,
  20971520,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service role can read catalog product image drafts" on storage.objects;
create policy "Service role can read catalog product image drafts"
on storage.objects
for select
to service_role
using (bucket_id = 'catalog-product-image-drafts');

drop policy if exists "Service role can insert catalog product image drafts" on storage.objects;
create policy "Service role can insert catalog product image drafts"
on storage.objects
for insert
to service_role
with check (bucket_id = 'catalog-product-image-drafts');

drop policy if exists "Service role can update catalog product image drafts" on storage.objects;
create policy "Service role can update catalog product image drafts"
on storage.objects
for update
to service_role
using (bucket_id = 'catalog-product-image-drafts')
with check (bucket_id = 'catalog-product-image-drafts');

drop policy if exists "Service role can delete catalog product image drafts" on storage.objects;
create policy "Service role can delete catalog product image drafts"
on storage.objects
for delete
to service_role
using (bucket_id = 'catalog-product-image-drafts');

create or replace function public.approve_catalog_product_draft(
  p_draft_id uuid,
  p_image_url text,
  p_activate_now boolean,
  p_approved_by uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_draft public.catalog_product_drafts%rowtype;
  v_product_id uuid;
  v_display_order integer;
begin
  select *
  into v_draft
  from public.catalog_product_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'Catalog product draft not found';
  end if;

  if v_draft.status <> 'PENDING' then
    raise exception 'Catalog product draft is not pending';
  end if;

  if exists (
    select 1
    from public.catalog_products
    where slug = v_draft.proposed_slug
  ) then
    raise exception 'Catalog product slug already exists';
  end if;

  select coalesce(max(display_order), 0) + 10
  into v_display_order
  from public.catalog_products;

  insert into public.catalog_products (
    slug,
    name,
    category,
    description,
    subcategory_id,
    image_url,
    available_to_retail,
    available_to_wholesale,
    is_active,
    display_order
  )
  values (
    v_draft.proposed_slug,
    v_draft.proposed_name,
    v_draft.category,
    v_draft.description,
    v_draft.subcategory_id,
    p_image_url,
    p_activate_now,
    p_activate_now,
    p_activate_now,
    v_display_order
  )
  returning id into v_product_id;

  update public.catalog_product_drafts
  set
    status = 'APPROVED',
    approved_by = p_approved_by,
    catalog_product_id = v_product_id,
    activate_on_approval = p_activate_now,
    approved_at = now()
  where id = p_draft_id;

  return v_product_id;
end;
$$;

revoke all on function public.approve_catalog_product_draft(uuid, text, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_catalog_product_draft(uuid, text, boolean, uuid)
  to service_role;

commit;
