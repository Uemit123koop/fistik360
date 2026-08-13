-- Kayıt sırasında satıcı Aylık/Yıllık plan seçtiğinde birden fazla mahalleyi TEK
-- İyzico ödemesiyle satın alabilmeli (kod gönder -> kodu gir -> hemen İyzico). Bu yüzden
-- neighborhood_purchases tekil (bir mahalle) yerine bir "sepet" (N mahalle) temsil
-- edecek şekilde genişletiliyor. Tablo hâlâ boş (hiç canlı satır yok), doğrudan
-- kolon değişimi yapılabilir.

begin;

alter table public.neighborhood_purchases
  drop constraint neighborhood_purchases_total_areas_check,
  drop column requested_neighborhood_id,
  drop column location_selection,
  drop column store_neighborhood_id,
  add column requested_neighborhood_ids uuid[] not null,
  add column location_selections jsonb not null,
  add column store_neighborhood_ids uuid[],
  add constraint neighborhood_purchases_total_areas_check check (total_areas_after >= 2),
  add constraint neighborhood_purchases_requested_not_empty_check check (cardinality(requested_neighborhood_ids) >= 1);

commit;
