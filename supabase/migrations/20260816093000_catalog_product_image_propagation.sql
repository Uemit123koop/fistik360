-- Keep every existing seller row aligned when an admin changes canonical imagery.

begin;

create or replace function public.propagate_catalog_product_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.retail_products
  set image_url = new.image_url
  where catalog_product_id = new.id
    and image_url is distinct from new.image_url;

  update public.wholesale_products
  set image_url = new.image_url
  where catalog_product_id = new.id
    and image_url is distinct from new.image_url;

  return new;
end;
$$;

revoke all on function public.propagate_catalog_product_image() from public, anon, authenticated;

drop trigger if exists trg_catalog_product_image_propagation on public.catalog_products;
create trigger trg_catalog_product_image_propagation
after update of image_url on public.catalog_products
for each row
when (old.image_url is distinct from new.image_url)
execute function public.propagate_catalog_product_image();

update public.retail_products as retail
set image_url = catalog.image_url
from public.catalog_products as catalog
where retail.catalog_product_id = catalog.id
  and retail.image_url is distinct from catalog.image_url;

update public.wholesale_products as wholesale
set image_url = catalog.image_url
from public.catalog_products as catalog
where wholesale.catalog_product_id = catalog.id
  and wholesale.image_url is distinct from catalog.image_url;

commit;
