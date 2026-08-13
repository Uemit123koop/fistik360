-- İyzico'nun checkout form isteğindeki buyer.identityNumber alanı zorunludur (TC
-- vatandaşları için 11 haneli TC Kimlik No). store_billing_addresses az önce eklendi ve
-- henüz hiç satır yok; eklentiyi ayrı migration olarak yapıyoruz (uygulanmış migration'ı
-- değiştirmiyoruz).

begin;

alter table public.store_billing_addresses
  add column identity_number text not null,
  add constraint store_billing_addresses_identity_number_check
    check (identity_number ~ '^[0-9]{11}$');

commit;
