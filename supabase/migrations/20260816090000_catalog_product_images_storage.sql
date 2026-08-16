-- Canonical product imagery is public storefront media.
-- Every write is performed by trusted admin code with the service-role client.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-product-images',
  'catalog-product-images',
  true,
  20971520,
  array['image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read catalog product images" on storage.objects;
create policy "Public can read catalog product images"
on storage.objects
for select
to public
using (bucket_id = 'catalog-product-images');

drop policy if exists "Service role can insert catalog product images" on storage.objects;
create policy "Service role can insert catalog product images"
on storage.objects
for insert
to service_role
with check (bucket_id = 'catalog-product-images');

drop policy if exists "Service role can update catalog product images" on storage.objects;
create policy "Service role can update catalog product images"
on storage.objects
for update
to service_role
using (bucket_id = 'catalog-product-images')
with check (bucket_id = 'catalog-product-images');

drop policy if exists "Service role can delete catalog product images" on storage.objects;
create policy "Service role can delete catalog product images"
on storage.objects
for delete
to service_role
using (bucket_id = 'catalog-product-images');

commit;
