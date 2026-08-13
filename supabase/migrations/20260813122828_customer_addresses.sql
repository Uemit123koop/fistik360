-- Customer address book: multiple saved delivery addresses per customer, one
-- marked default. create_order_from_cart still takes a single delivery_address
-- text — the UI composes the chosen row into that string; this table is purely
-- for reuse/selection across orders, no RPC/orders schema change needed.

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict,
  province text not null,
  district text not null,
  neighborhood text not null,
  street text not null,
  building_no text not null,
  apartment_no text,
  label text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_street_check check (btrim(street) <> ''),
  constraint customer_addresses_building_no_check check (btrim(building_no) <> '')
);

create index idx_customer_addresses_customer on public.customer_addresses (customer_id);

create unique index uq_customer_addresses_default
  on public.customer_addresses (customer_id)
  where is_default;

-- Reuses the same label-sync function already used by store_neighborhoods:
-- both tables share the (neighborhood_id, province, district, neighborhood)
-- column shape, so the existing trigger function works unmodified.
create trigger trg_customer_addresses_sync_labels
before insert or update of neighborhood_id
on public.customer_addresses
for each row execute function public.sync_store_neighborhood_labels();

create trigger trg_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

create policy customer_addresses_select_own
  on public.customer_addresses
  for select
  to authenticated
  using (customer_id = (select auth.uid()));

create policy customer_addresses_insert_own
  on public.customer_addresses
  for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

create policy customer_addresses_update_own
  on public.customer_addresses
  for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy customer_addresses_delete_own
  on public.customer_addresses
  for delete
  to authenticated
  using (customer_id = (select auth.uid()));
