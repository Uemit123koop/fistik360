-- Allow each nut store to choose its own retail sales quantity and unit while
-- keeping product identity/content sourced from the canonical catalog.
create or replace function public.sync_retail_product_from_catalog()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product public.catalog_products%rowtype;
begin
  if new.catalog_product_id is null then
    if tg_op = 'INSERT' then
      raise exception 'Catalog product is required';
    end if;
    return new;
  end if;

  select cp.* into v_product
  from public.catalog_products cp
  where cp.id = new.catalog_product_id
    and cp.is_active = true
    and cp.available_to_retail = true;

  if not found then
    raise exception 'Active retail catalog product is required';
  end if;

  if new.quantity is null or new.quantity <= 0 then
    raise exception 'Retail quantity must be greater than zero';
  end if;

  new.unit := pg_catalog.lower(pg_catalog.btrim(new.unit));
  if new.unit not in ('gram', 'kg', 'adet', 'paket') then
    raise exception 'Retail unit must be gram, kg, adet or paket';
  end if;

  new.name := v_product.name;
  new.category := v_product.category;
  new.description := v_product.description;
  new.image_url := v_product.image_url;
  return new;
end;
$$;

revoke all on function public.sync_retail_product_from_catalog() from public, anon;
