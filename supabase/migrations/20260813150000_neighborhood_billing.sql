-- Mahalle başı gerçek fiyatlandırma: ilk mahalle ücretsiz, 2.den itibaren metreli
-- (metered) ücretli mahalle + hacim indirimi (4+/7+/11+ -> %10/%15/%20), satıcı fatura
-- adresi ve İyzico ödeme defteri. subscription_plans/seller_subscriptions daha önce
-- migration'da vardı ama hiçbir uygulama kodu kullanmıyordu; bu migration onları gerçek
-- bir "ek mahalle satın al" akışına bağlar. Mahalle tekelciliği YOK: bir mahallede
-- birden fazla kuruyemişçi olabilir, bir kuruyemişçi de sınırsız mahallede olabilir.

begin;

-- ─── 1. Fiyat hesaplama fonksiyonu (tek doğruluk kaynağı) ───────────────────
-- calculate_cart_totals ile aynı desen: para etkileyen hesap DB'de, tek yerde.
create or replace function public.calculate_multi_neighborhood_price(
  p_total_areas integer,
  p_billing_interval text
)
returns table (
  unit_price numeric,
  discount_rate numeric,
  paid_areas integer,
  amount numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_code text;
  v_unit_price numeric;
begin
  if p_billing_interval not in ('MONTH', 'YEAR') then
    raise exception 'Invalid billing interval: %', p_billing_interval;
  end if;

  v_code := case p_billing_interval when 'MONTH' then 'MULTI_MONTHLY' else 'MULTI_YEARLY' end;

  select sp.price into v_unit_price
  from public.subscription_plans sp
  where sp.code = v_code and sp.is_active;

  if v_unit_price is null then
    raise exception 'Pricing plan % not found or inactive', v_code;
  end if;

  paid_areas := greatest(coalesce(p_total_areas, 0) - 1, 0);
  discount_rate := case
    when coalesce(p_total_areas, 0) >= 11 then 0.20
    when coalesce(p_total_areas, 0) >= 7 then 0.15
    when coalesce(p_total_areas, 0) >= 4 then 0.10
    else 0
  end;
  unit_price := v_unit_price;
  amount := round(unit_price * paid_areas * (1 - discount_rate), 2);

  return next;
end;
$$;

revoke all on function public.calculate_multi_neighborhood_price(integer, text) from public;
grant execute on function public.calculate_multi_neighborhood_price(integer, text) to anon, authenticated, service_role;

-- ─── 2. Satıcı fatura adresi ─────────────────────────────────────────────────
-- İyzico ödeme çağrısının zorunlu kıldığı fatura adresi. store_bank_accounts ile aynı
-- hassasiyet seviyesinde: yalnız sahibi ve admin görür/düzenler.
create table public.store_billing_addresses (
  store_id uuid primary key references public.stores(id) on delete cascade,
  contact_name text not null,
  address text not null,
  district text not null,
  province text not null,
  postal_code text,
  country text not null default 'Türkiye',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_billing_addresses_contact_name_check check (btrim(contact_name) <> ''),
  constraint store_billing_addresses_address_check check (btrim(address) <> ''),
  constraint store_billing_addresses_district_check check (btrim(district) <> ''),
  constraint store_billing_addresses_province_check check (btrim(province) <> '')
);

create trigger trg_store_billing_addresses_updated_at
before update on public.store_billing_addresses
for each row execute function public.set_updated_at();

alter table public.store_billing_addresses enable row level security;

create policy store_billing_addresses_select_owner
  on public.store_billing_addresses for select
  to authenticated
  using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()))
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'ADMIN')
  );

create policy store_billing_addresses_insert_owner
  on public.store_billing_addresses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.stores s join public.profiles p on p.id = s.owner_id
      where s.id = store_id and s.owner_id = (select auth.uid()) and p.role = 'NUT_STORE'
    )
  );

create policy store_billing_addresses_update_owner
  on public.store_billing_addresses for update
  to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid())))
  with check (
    exists (
      select 1 from public.stores s join public.profiles p on p.id = s.owner_id
      where s.id = store_id and s.owner_id = (select auth.uid()) and p.role = 'NUT_STORE'
    )
  );

-- ─── 3. İyzico ödeme defteri ─────────────────────────────────────────────────
-- orders/cart_items ile aynı desen: para/entitlement etkileyen her satır yalnız
-- service_role tarafından (checkout/callback API route'ları) yazılır, sahibi yalnız okur.
create table public.neighborhood_purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  requested_neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict,
  billing_interval text not null,
  total_areas_after integer not null,
  unit_price numeric(12,2) not null,
  discount_rate numeric(4,3) not null default 0,
  amount numeric(12,2) not null,
  currency text not null default 'TRY',
  iyzico_conversation_id text,
  iyzico_payment_id text,
  status text not null default 'PENDING',
  store_neighborhood_id uuid references public.store_neighborhoods(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint neighborhood_purchases_billing_interval_check check (billing_interval in ('MONTH', 'YEAR')),
  constraint neighborhood_purchases_status_check check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  constraint neighborhood_purchases_total_areas_check check (total_areas_after >= 2),
  constraint neighborhood_purchases_amount_check check (amount >= 0),
  constraint neighborhood_purchases_completion_check check (status = 'PENDING' or completed_at is not null)
);

create index idx_neighborhood_purchases_store on public.neighborhood_purchases (store_id, created_at desc);

alter table public.neighborhood_purchases enable row level security;

create policy neighborhood_purchases_select_owner
  on public.neighborhood_purchases for select
  to authenticated
  using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid()))
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'ADMIN')
  );

-- ─── 4. Entitlement trigger sadeleştirmesi: artık mahalle sayısı limiti yok ─
-- Önceki sürüm subscription_plans.max_active_service_areas'a göre bir tavan uyguluyordu.
-- Yeni iş kuralı: sınır yok, her ek mahalle checkout (İyzico) ile ayrı ayrı satın alınır.
-- "Primary olmadan ek alan aktif edilemez" ve "primary, diğerleri aktifken pasife
-- alınamaz" kontrolleri aynen kalıyor.
create or replace function private.validate_store_neighborhood_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_primary boolean;
begin
  perform 1
  from public.stores s
  where s.id = new.store_id
  for update;

  if not found then
    raise exception 'Store not found';
  end if;

  if tg_op = 'UPDATE'
     and old.is_primary
     and old.is_active
     and not new.is_active
     and exists (
       select 1
       from public.store_neighborhoods sn
       where sn.store_id = old.store_id
         and sn.id <> old.id
         and sn.is_active
     ) then
    raise exception 'The primary service area cannot be deactivated while additional areas are active';
  end if;

  if not new.is_active then
    return new;
  end if;

  if not new.is_primary then
    select exists (
      select 1
      from public.store_neighborhoods sn
      where sn.store_id = new.store_id
        and sn.is_primary
        and sn.is_active
        and sn.id <> new.id
    )
    into v_has_primary;

    if not v_has_primary then
      raise exception 'An active primary service area is required before an additional area can be activated';
    end if;
  end if;

  new.activated_at := coalesce(new.activated_at, now());
  return new;
end;
$$;

-- ─── 5. RLS sıkılaştırma: satıcı yalnız kendi primary satırını doğrudan ekleyebilir ─
-- Ücretli (is_primary=false) satırlar yalnız İyzico ödeme başarılı olduktan sonra
-- service_role (activatePaidServiceArea) ile eklenir; bu politika bir kullanıcının
-- API'yi doğrudan çağırıp ödeme olmadan ek mahalle açmasını engeller.
drop policy if exists store_neighborhoods_insert_owner on public.store_neighborhoods;
create policy store_neighborhoods_insert_owner
  on public.store_neighborhoods for insert
  to authenticated
  with check (
    is_primary
    and exists (
      select 1 from public.stores s join public.profiles p on p.id = s.owner_id
      where s.id = store_id and s.owner_id = (select auth.uid()) and p.role = 'NUT_STORE'
    )
  );

-- ─── 6. Grants ────────────────────────────────────────────────────────────────
revoke all on table public.store_billing_addresses, public.neighborhood_purchases from anon, authenticated;

grant select, insert, update on table public.store_billing_addresses to authenticated;
grant select on table public.neighborhood_purchases to authenticated;

grant all privileges on table public.store_billing_addresses, public.neighborhood_purchases to service_role;

commit;
