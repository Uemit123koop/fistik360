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

create policy if not exists "Profiles are viewable by authenticated users" on profiles for select using (auth.uid() is not null);
create policy if not exists "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy if not exists "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy if not exists "Public stores are viewable" on stores for select using (is_active = true);
create policy if not exists "Store owners manage their stores" on stores for update using (owner_id = auth.uid());
create policy if not exists "Store owners insert stores" on stores for insert with check (owner_id = auth.uid());

create policy if not exists "Public retail products are viewable" on retail_products for select using (is_active = true);
create policy if not exists "Store owners manage retail products" on retail_products for update using (store_id in (select id from stores where owner_id = auth.uid()));
create policy if not exists "Store owners insert retail products" on retail_products for insert with check (store_id in (select id from stores where owner_id = auth.uid()));

create policy if not exists "Public packages are viewable" on packages for select using (is_active = true);
create policy if not exists "Store owners manage packages" on packages for update using (store_id in (select id from stores where owner_id = auth.uid()));
create policy if not exists "Store owners insert packages" on packages for insert with check (store_id in (select id from stores where owner_id = auth.uid()));

create policy if not exists "Public package items are viewable" on package_items for select using (true);
create policy if not exists "Store owners manage package items" on package_items for update using (package_id in (select id from packages where store_id in (select id from stores where owner_id = auth.uid())));
create policy if not exists "Store owners insert package items" on package_items for insert with check (package_id in (select id from packages where store_id in (select id from stores where owner_id = auth.uid())));

create policy if not exists "Public wholesale products are viewable" on wholesale_products for select using (is_active = true);
create policy if not exists "Wholesale sellers manage their products" on wholesale_products for update using (seller_id = auth.uid());
create policy if not exists "Wholesale sellers insert products" on wholesale_products for insert with check (seller_id = auth.uid());

create policy if not exists "Authenticated users can view provinces" on provinces for select using (auth.uid() is not null);
create policy if not exists "Authenticated users can view districts" on districts for select using (auth.uid() is not null);
create policy if not exists "Authenticated users can view neighborhoods" on neighborhoods for select using (auth.uid() is not null);
