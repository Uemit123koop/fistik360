-- FAZ 1 baseline RLS and trigger hardening.
-- Prepared locally only. Do not apply without explicit approval.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$function$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    pg_catalog.coalesce(
      new.raw_user_meta_data ->> 'full_name',
      pg_catalog.split_part(new.email, '@', 1)
    ),
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.block_profile_role_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null then
    raise exception 'role changes are not allowed through client updates';
  end if;
  return new;
end;
$function$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.block_profile_role_updates() from public, anon, authenticated;

create index if not exists idx_package_items_product_id
  on public.package_items(product_id);

drop policy if exists profiles_select_own_or_authenticated on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists stores_select_public_active on public.stores;
drop policy if exists stores_select_visible on public.stores;
drop policy if exists stores_insert_owner on public.stores;
drop policy if exists stores_update_owner on public.stores;

create policy stores_select_visible
  on public.stores for select
  to anon, authenticated
  using (is_active = true or (select auth.uid()) = owner_id);

create policy stores_insert_owner
  on public.stores for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy stores_update_owner
  on public.stores for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists store_neighborhoods_select_public on public.store_neighborhoods;
drop policy if exists store_neighborhoods_insert_owner on public.store_neighborhoods;
drop policy if exists store_neighborhoods_update_owner on public.store_neighborhoods;

create policy store_neighborhoods_select_public
  on public.store_neighborhoods for select
  to anon, authenticated
  using (true);

create policy store_neighborhoods_insert_owner
  on public.store_neighborhoods for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy store_neighborhoods_update_owner
  on public.store_neighborhoods for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists retail_products_select_public_active on public.retail_products;
drop policy if exists retail_products_select_visible on public.retail_products;
drop policy if exists retail_products_insert_owner on public.retail_products;
drop policy if exists retail_products_update_owner on public.retail_products;

create policy retail_products_select_visible
  on public.retail_products for select
  to anon, authenticated
  using (
    is_active = true
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
  );

create policy retail_products_insert_owner
  on public.retail_products for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy retail_products_update_owner
  on public.retail_products for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists packages_select_public_active on public.packages;
drop policy if exists packages_select_visible on public.packages;
drop policy if exists packages_insert_owner on public.packages;
drop policy if exists packages_update_owner on public.packages;

create policy packages_select_visible
  on public.packages for select
  to anon, authenticated
  using (
    is_active = true
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
    )
  );

create policy packages_insert_owner
  on public.packages for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy packages_update_owner
  on public.packages for update
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      join public.profiles p on p.id = s.owner_id
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists package_items_select_public on public.package_items;
drop policy if exists package_items_select_visible on public.package_items;
drop policy if exists package_items_insert_owner on public.package_items;
drop policy if exists package_items_update_owner on public.package_items;

create policy package_items_select_visible
  on public.package_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.packages pkg
      join public.stores s on s.id = pkg.store_id
      where pkg.id = package_id
        and (pkg.is_active = true or s.owner_id = (select auth.uid()))
    )
  );

create policy package_items_insert_owner
  on public.package_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.packages pkg
      join public.stores s on s.id = pkg.store_id
      join public.profiles p on p.id = s.owner_id
      where pkg.id = package_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

create policy package_items_update_owner
  on public.package_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.packages pkg
      join public.stores s on s.id = pkg.store_id
      join public.profiles p on p.id = s.owner_id
      where pkg.id = package_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  )
  with check (
    exists (
      select 1
      from public.packages pkg
      join public.stores s on s.id = pkg.store_id
      join public.profiles p on p.id = s.owner_id
      where pkg.id = package_id
        and s.owner_id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists wholesale_products_select_authorized on public.wholesale_products;
drop policy if exists wholesale_products_insert_owner on public.wholesale_products;
drop policy if exists wholesale_products_update_owner on public.wholesale_products;

create policy wholesale_products_select_authorized
  on public.wholesale_products for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and (
          (is_active = true and p.role in ('NUT_STORE', 'WHOLESALE_SELLER', 'ADMIN'))
          or (
            seller_id = (select auth.uid())
            and p.role = 'WHOLESALE_SELLER'
          )
        )
    )
  );

create policy wholesale_products_insert_owner
  on public.wholesale_products for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  );

create policy wholesale_products_update_owner
  on public.wholesale_products for update
  to authenticated
  using (
    seller_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  )
  with check (
    seller_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'WHOLESALE_SELLER'
    )
  );

drop policy if exists wholesale_inquiries_select_nut_store_own on public.wholesale_inquiries;
drop policy if exists wholesale_inquiries_select_wholesale_seller_owned on public.wholesale_inquiries;
drop policy if exists wholesale_inquiries_select_related on public.wholesale_inquiries;
drop policy if exists wholesale_inquiries_insert_store on public.wholesale_inquiries;

create policy wholesale_inquiries_select_related
  on public.wholesale_inquiries for select
  to authenticated
  using (
    (
      requester_id = (select auth.uid())
      and exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.role = 'NUT_STORE'
      )
    )
    or (
      exists (
        select 1
        from public.wholesale_products wp
        join public.profiles p on p.id = wp.seller_id
        where wp.id = wholesale_product_id
          and wp.seller_id = (select auth.uid())
          and p.role = 'WHOLESALE_SELLER'
      )
    )
  );

create policy wholesale_inquiries_insert_store
  on public.wholesale_inquiries for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'NUT_STORE'
    )
  );

drop policy if exists provinces_select_authenticated on public.provinces;
drop policy if exists districts_select_authenticated on public.districts;
drop policy if exists neighborhoods_select_authenticated on public.neighborhoods;

create policy provinces_select_authenticated
  on public.provinces for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy districts_select_authenticated
  on public.districts for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy neighborhoods_select_authenticated
  on public.neighborhoods for select
  to authenticated
  using ((select auth.uid()) is not null);
