-- Checkout anında seçilen il/ilçe/mahalle (LocationSelection) callback'te tekrar API
-- doğrulaması yapmadan activatePaidServiceArea'ya aktarılabilsin diye ham JSON olarak
-- saklanır. Tablo henüz boş (bu oturumda oluşturuldu), doğrudan not null eklenir.

begin;

alter table public.neighborhood_purchases
  add column location_selection jsonb not null;

commit;
