-- İyzico Checkout Form callback'i yalnız `token` gönderir (conversationId göndermez);
-- callback'in hangi neighborhood_purchases satırına ait olduğunu bulabilmek için
-- initialize yanıtındaki token'ı sakla.

begin;

alter table public.neighborhood_purchases
  add column iyzico_token text;

create unique index uq_neighborhood_purchases_iyzico_token
  on public.neighborhood_purchases (iyzico_token)
  where iyzico_token is not null;

commit;
