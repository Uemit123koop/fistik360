-- Manav360'ın (referans, salt-okunur) mahalle ödeme akışıyla karşılaştırmalı
-- inceleme sonrası: callback'te iki ayrı gelişe (çift tıklama/tarayıcı retry) karşı,
-- mahalle aktivasyon işini yalnız BİR isteğin çalıştırabilmesi için atomik bir
-- "kilit" durumu ekleniyor. Ödeme doğrulandıktan hemen sonra ilk iş
-- PENDING -> PROCESSING geçişini denemek olacak; bu geçişi kazanamayan istek hiçbir
-- mahalle işlemi yapmadan çıkar.

alter table public.neighborhood_purchases
  drop constraint neighborhood_purchases_status_check,
  add constraint neighborhood_purchases_status_check
    check (status in ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'));

alter table public.neighborhood_purchases
  drop constraint neighborhood_purchases_completion_check,
  add constraint neighborhood_purchases_completion_check
    check (status in ('PENDING', 'PROCESSING') or completed_at is not null);
