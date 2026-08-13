-- Düzeltme: "Aylık/Yıllık plan seçilince ilk mahalle yine bedava" varsayımı yanlıştı.
-- Doğru kural: Ücretsiz plan = tam olarak 1 mahalle, hep bedava (ayrı, bu fonksiyona hiç
-- girmiyor). Aylık/Yıllık plan seçilirse seçilen HER mahalle ücretli (1 tane olsa bile),
-- indirim toplam aktif mahalle sayısına göre otomatik uygulanır. Fonksiyon artık kaç yeni
-- mahalle satın alındığını (p_new_areas) ile işlem sonrası toplam mahalle sayısını
-- (p_total_areas_after) ayrı parametre olarak alır — "toplam - 1" varsayımı kaldırıldı.

begin;

drop function if exists public.calculate_multi_neighborhood_price(integer, text);

create function public.calculate_multi_neighborhood_price(
  p_new_areas integer,
  p_total_areas_after integer,
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
  if coalesce(p_new_areas, 0) < 1 then
    raise exception 'p_new_areas must be at least 1';
  end if;
  if coalesce(p_total_areas_after, 0) < p_new_areas then
    raise exception 'p_total_areas_after must be >= p_new_areas';
  end if;

  v_code := case p_billing_interval when 'MONTH' then 'MULTI_MONTHLY' else 'MULTI_YEARLY' end;

  select sp.price into v_unit_price
  from public.subscription_plans sp
  where sp.code = v_code and sp.is_active;

  if v_unit_price is null then
    raise exception 'Pricing plan % not found or inactive', v_code;
  end if;

  paid_areas := p_new_areas;
  discount_rate := case
    when p_total_areas_after >= 11 then 0.20
    when p_total_areas_after >= 7 then 0.15
    when p_total_areas_after >= 4 then 0.10
    else 0
  end;
  unit_price := v_unit_price;
  amount := round(unit_price * paid_areas * (1 - discount_rate), 2);

  return next;
end;
$$;

revoke all on function public.calculate_multi_neighborhood_price(integer, integer, text) from public;
grant execute on function public.calculate_multi_neighborhood_price(integer, integer, text) to anon, authenticated, service_role;

commit;
