-- Paketler artık gerçek mağaza ürünlerinden (package_items, zaten var ama
-- kullanılmıyordu) oluşturulup tüm pakete uygulanan bir indirim yüzdesi
-- taşıyor. `packages.price` hâlâ tek doğruluk kaynağı sütunu (checkout/RPC
-- tarafı buna dokunulmadan okumaya devam ediyor); değeri artık elle değil,
-- seçilen ürünlerin toplamı - indirim% olarak uygulama katmanında hesaplanıp
-- yazılıyor.

alter table public.packages
  add column discount_percent numeric(5,2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 90);
