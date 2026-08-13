-- Fatura adresine gerçek bir mahalle bilgisi eklenir (satıcının kayıt sırasında seçtiği
-- hizmet mahallelerinden en sık tekrar edenin il/ilçesiyle önerilir, kendi fatura
-- mahallesini ayrıca seçer). Nullable: panelden tekli "ek mahalle ekle" akışı bu alanı
-- göndermeye devam etmiyor, geriye dönük uyumlu.

begin;

alter table public.store_billing_addresses
  add column neighborhood text;

commit;
