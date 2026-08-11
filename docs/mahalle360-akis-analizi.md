# mahalle360 → fıstık360 akış uyarlama analizi

> **Kapsam kuralı:** mahalle360 (`C:\Projects\mahalle360`) yalnızca **okundu**. Hiçbir dosyası
> değiştirilmedi, hiçbir komutu çalıştırılmadı. Bu belgedeki tüm geliştirme kararları
> fıstık360 içindir.

Tarih: 2026-08-11

---

## 1. Özet bulgu

fıstık360'ın veritabanı, uygulama katmanının epey önünde. mahalle360'ta 5–6 tabloyla ve
yüzlerce satır API koduyla çözülmüş olan sipariş hattının **şema karşılığı fıstık360'ta zaten
kurulu ve RLS'li**. Eksik olan, o şemayı çağıran uygulama kodu.

Bu yüzden bu uyarlamada **hiçbir migration yazılmadı, hiçbir tablo eklenmedi, hiçbir kolon
değiştirilmedi.** Yapılan iş, mevcut `create_order_from_cart` / `calculate_cart_totals`
fonksiyonlarını ve mevcut RLS politikalarını kullanan uygulama katmanını yazmaktan ibaret.

---

## 2. Akış çıkarımı: mahalle360 nasıl çalışıyor

### 2.1 Onboarding → Rol → Mağaza → Bölge

mahalle360'ta satıcı akışı `app/seller/onboarding/page.tsx` (1069 satır) içinde tek sayfalık
çok adımlı bir sihirbaz:

1. **Telefon + SMS OTP** ile kimlik (`api/auth/send-code` → `verify-code`)
2. **Satıcı tipi** seçimi (`lib/seller-onboarding.mjs`: MANAV, RESTORAN, BAKKAL, FARMER, KAFE, PASTANE)
3. **Mağaza bilgileri** (ad, adres)
4. **Mahalle seçimi** — `turkey-neighbourhoods` paketinden il → ilçe → mahalle
5. **Hizmet şekli** (delivery / pickup) ve **ödeme yöntemi** (cash / card)
6. **Plan seçimi** → `api/checkout` → FREEMIUM ise anında `ACTIVE`, ücretli ise iyzico

Kritik nokta: **ücretli plan `stores` tablosuna ödeme doğrulanmadan yazılmıyor.** Seçim
yalnızca `payment_intents` satırında duruyor; aktivasyon iyzico callback'inde gerçekleşiyor.
Yarıda bırakılan checkout mevcut FREEMIUM mağazayı bozmuyor.

### 2.2 Sipariş hattı (`app/api/orders/route.ts`, 382 satır)

Bu dosya mahalle360'ın en değerli kısmı. Öğrenilecek prensipler:

| Prensip | mahalle360'taki uygulaması |
| --- | --- |
| **İstemci fiyatı yok sayılır** | Gövdeden gelen `price`/`name` atılır; ürünler DB'den *mağaza kapsamında* okunur, tutar `lib/order-pricing.mjs` ile sunucuda hesaplanır |
| **Mağaza kapsamı zorlanır** | `loadStoreCatalog` her sorguya `.eq('store_id', storeId)` koyar → başka mağazanın ürünü siparişe giremez |
| **Snapshot** | `order_items` satırlarına isim ve fiyat kopyalanır; sonradan ürün fiyatı değişse bile sipariş sabit kalır |
| **Abonelik guard'ı** | `canStoreReceiveOrders()` — `is_blocked` veya `subscription_status ≠ ACTIVE` ise sipariş reddedilir |
| **Kaynak sunucuda belirlenir** | `source` alanı istemci gövdesinden değil `x-m360-client` header'ından türetilir |
| **Rate limit + CSRF** | Her yazma ucunda `assertSameOrigin` + IP ve kimlik bazlı çift kova |

### 2.3 Durum makinesi (`lib/orders.ts`)

```
PENDING → ACCEPTED → PREPARING → ON_THE_WAY → DELIVERED
   ↓          ↓          ↓            ↓
        CANCELLED / REJECTED (terminal)
```

`app/api/orders/[id]/route.ts` PATCH'inde üç koruma var ve üçü de doğrudan aktarılabilir:

1. **Rol kısıtı:** alıcı yalnızca `PENDING → CANCELLED` yapabilir; diğer geçişler satıcıya ait
2. **Yarış koruması:** `UPDATE ... WHERE id = ? AND status = <beklenen mevcut durum>` — iki
   sekme aynı anda durumu değiştiremez, ikincisi 409 alır
3. **Beyaz liste:** `pickOrderPatchFields(body.extra)` — gövde asla spread edilmez, aksi
   halde `total_amount` / `store_id` / `customer_phone` ezilebilirdi

### 2.4 Admin / Süper Admin

`lib/permissions.ts` — 4 rol (`SUPERADMIN`, `ADMIN`, `MODERATOR`, `DESTEK`) ve 17 izin anahtarı
(`stores.*`, `admins.*`, `products.manage`, `orders.view`, `billing.manage`, `settings.manage`).
SUPERADMIN dışındaki her hesabın izin listesi düzenlenebilir; UI'da matris olarak gösteriliyor.

---

## 3. fıstık360'taki mevcut karşılıklar

Uyarlama öncesi yapılan envanterin sonucu. **Sol sütundaki hiçbir şey için yeni tablo
gerekmedi.**

| mahalle360 | fıstık360 karşılığı | Durum |
| --- | --- | --- |
| `stores` + `subscription_status` | `stores` + `platform_status` (`PENDING_ONBOARDING`/`ACTIVE`/`SUSPENDED`) + `is_active` | ✅ Mevcut |
| `products` | `retail_products` (+ `catalog_products` merkezi katalog) | ✅ Mevcut |
| `store_bundles` / `bundle_items` | `packages` / `package_items` | ✅ Mevcut |
| `neighborhoods` (mağaza JSON'u) | `store_neighborhoods` (ayrı tablo, `is_primary`, `delivery_fee_override`) | ✅ Daha iyi |
| Sepet (istemci tarafı) | `carts` + `cart_items` (**sunucu tarafı, RLS'li**) | ✅ Daha iyi |
| `orders` / `order_items` | `orders` / `order_items` | ✅ Mevcut |
| Tutar hesabı (`order-pricing.mjs`, JS) | `calculate_cart_totals()` (**Postgres fonksiyonu**) | ✅ Daha iyi |
| Sipariş oluşturma (API'de elle insert) | `create_order_from_cart()` (**tek transaction, service_role**) | ✅ Daha iyi |
| `store_settings` ödeme yöntemleri | `store_payment_settings` (`cash_on_delivery` / `card_on_delivery` / `bank_transfer`) | ✅ Mevcut |
| Teslimat kuralları | `store_delivery_settings` (min sepet, ücret, bedava eşiği) | ✅ Mevcut |
| Havale bilgisi | `store_bank_accounts` (IBAN formatı `CHECK`'li, snapshot'lanıyor) | ✅ Daha iyi |
| `order_status_history` | — | ❌ **Yok** (bkz. §6) |
| `FARMER` satıcı tipi | — | ❌ **Yok** (bkz. §6) |
| `SUPERADMIN` + izin matrisi | Tek `ADMIN` rolü | ❌ **Yok** (bkz. §6) |

### 3.1 fıstık360'ın kendi güvenlik modeli — mahalle360'tan farkı

mahalle360 güvenliği **uygulama katmanında** (DAL fonksiyonları + service_role ile RLS bypass)
kuruyor. fıstık360 aynı işi **veritabanı katmanında** yapıyor:

- `orders` / `order_items` tablolarında `authenticated` rolüne yalnızca `SELECT` verilmiş.
  `INSERT`/`UPDATE` **hiç yok** → sipariş oluşturma ve durum geçişi zorunlu olarak sunucu işi.
- `create_order_from_cart` fonksiyonu `auth.role() = 'service_role'` kontrolüyle başlıyor;
  anon/authenticated için `EXECUTE` iptal edilmiş.
- `orders_select_related` politikası okuma yetkisini üçe sınırlıyor: siparişi veren müşteri,
  mağaza sahibi, `ADMIN`.

Sonuç: mahalle360'taki IDOR düzeltmelerinin çoğu fıstık360'ta zaten şema seviyesinde çözülmüş.
Uygulama kodunun görevi bu korumaları **atlatmamak**.

---

## 4. Rol haritası

| mahalle360 | fıstık360 | Not |
| --- | --- | --- |
| Müşteri (SMS OTP) | `CUSTOMER` | Supabase Auth |
| MANAV / BAKKAL (mahalle esnafı) | `NUT_STORE` | **Kuruyemiş mağazası** olarak uyarlandı — isim değişimi değil, katalog mantığı farklı: fıstık360'ta satıcı merkezi `catalog_products`'tan ürün seçip yalnız fiyat/gramaj/birim belirliyor |
| Tedarikçi | `WHOLESALE_SELLER` | Toptancı; `wholesale_products` + `wholesale_inquiries` teklif hattı |
| — | `BRAND_PARTNER` | fıstık360'a özgü; markaların kendi ürünlerini listelemesi |
| FARMER (çiftçi) | *(yok)* | Sera/üretici karşılığı — §6.2 |
| ADMIN | `ADMIN` | |
| SUPERADMIN + izin matrisi | *(yok)* | §6.3 |

---

## 5. Bu turda uyarlanan akış: sipariş hattı

Seçim gerekçesi: DB tamamen hazır, sıfır migration gerektiriyor, ve fıstık360'ın en görünür
eksiği (sepet var ama sipariş verilemiyor).

### 5.1 Yazılan dosyalar

| Dosya | İş |
| --- | --- |
| `src/lib/orders.ts` | Saf durum makinesi + etiketler + `canStoreReceiveOrders` guard'ı. mahalle360'ın `lib/orders.ts` mantığı, fıstık360'ın kendi durum kümesine uyarlandı |
| `src/lib/orders-server.ts` | Müşteri/satıcı sipariş okuma yardımcıları |
| `src/app/api/orders/route.ts` | `POST` — sepetten sipariş. `create_order_from_cart` RPC'sini service_role ile çağırır |
| `src/app/api/orders/[id]/route.ts` | `PATCH` — durum geçişi. Sahiplik + geçiş + yarış koruması |
| `src/components/checkout-form.tsx` | Teslimat bilgisi, ödeme yöntemi, yasal onaylar |
| `src/app/sepet/odeme/page.tsx` | Checkout ekranı |
| `src/app/dashboard/customer/orders/page.tsx` | Müşterinin sipariş geçmişi |
| `src/app/dashboard/store/orders/page.tsx` | Satıcının sipariş kuyruğu |
| `src/components/order-card.tsx` | Ortak sipariş kartı (müşteri/satıcı görünümü) |
| `src/components/order-status-actions.tsx` | Durum geçiş butonları |
| `src/lib/request-guards.ts` | `isSameOrigin` — çerez oturumlu yazma uçları için CSRF koruması |
| `supabase/seed-test-fixtures.sql` | Uçtan uca test için mağaza/ürün/teslimat/ödeme fixture'ı (yalnız veri yazar) |

### 5.2 Durum makinesi uyarlaması

fıstık360'ın `orders_status_check` kısıtı zaten şu kümeyi tanımlıyordu; makine ona uyduruldu:

```
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
   ↓          ↓            ↓              ↓
              CANCELLED (terminal)
```

mahalle360'taki `REJECTED` durumu **eklenmedi** — fıstık360'ın `CHECK` kısıtında yok ve
eklemek migration gerektirirdi. Satıcının siparişi reddetmesi `PENDING → CANCELLED` ile
karşılanıyor.

### 5.3 Taşınan güvenlik prensipleri

- İstemci hiçbir tutar göndermiyor; toplam `calculate_cart_totals` ile DB'de hesaplanıyor
- Ödeme yöntemi `store_payment_settings`'e karşı DB fonksiyonu içinde doğrulanıyor
- Havale seçilirse aktif varsayılan IBAN yoksa sipariş oluşmuyor; oluşursa IBAN siparişe
  snapshot'lanıyor
- Durum geçişi `.eq("status", current)` ile yarış korumalı, çakışmada 409
- Müşteri yalnız kendi `PENDING` siparişini iptal edebiliyor
- Askıya alınmış (`SUSPENDED`) veya pasif mağazaya sipariş girmiyor

---

### 5.4 Local test

1. Uygulamadan iki hesap aç: biri satıcı, biri müşteri (`/giris`)
2. `supabase/seed-test-fixtures.sql` içindeki iki e-postayı bu hesaplarla değiştir
3. Dosyayı Supabase Studio → SQL Editor'da çalıştır
4. `npm run dev` → müşteri hesabıyla `/magazalar` → mağazaya gir → sepete ekle
5. Sepette 150 TL minimumu geç → **Teslimat ve ödemeye geç** → siparişi onayla
6. Satıcı hesabıyla `/dashboard/store/orders` → durumu ilerlet
7. Müşteri hesabında `/dashboard/customer/orders` → aynı durum görünür

Fixture teslimat kurallarını 150 TL minimum / 25 TL teslimat / 400 TL üstü bedava olarak
kurar; havale IBAN'ı da tanımlıdır, yani üç ödeme yöntemi de test edilebilir.

---

## 6. Onay bekleyen, bu turda **yapılmayan** işler

Üçü de migration gerektirdiği için kural gereği yapılmadı.

### 6.1 `order_status_history`
mahalle360'ta her durum değişimi ayrı tabloya yazılıyor (kim, ne zaman). fıstık360'ta karşılığı
yok. Şu an geçiş yalnız `orders.updated_at`'e yansıyor. Denetim izi isteniyorsa küçük bir
migration gerekir.

### 6.2 Sera / Üretici rolü
mahalle360'taki `FARMER` akışının fıstık360 karşılığı yok. Doğru uyarlama, `profiles.role`
`CHECK` kısıtına `GROWER` (veya `PRODUCER`) eklemek ve toptancı hattını üreticiye
genişletmek olur. **Not:** `WHOLESALE_SELLER` altyapısının (`wholesale_products` +
`wholesale_inquiries` teklif hattı) büyük kısmı yeniden kullanılabilir — yeni bir tablo seti
kurmaya gerek yok.

### 6.3 Süper Admin
mahalle360'taki 17 izinli matris. fıstık360'ta tek `ADMIN` rolü var. En az müdahaleli yol:
`profiles.role`'e `SUPER_ADMIN` eklemek ve izinleri kod tarafında sabit rol→izin haritasıyla
çözmek (mahalle360'taki gibi ayrı `admin_permissions` tablosu kurmadan).

### 6.4 Ödeme sağlayıcısı
mahalle360'ın iyzico entegrasyonu (`payment_intents`, callback doğrulaması, webhook)
fıstık360'a **taşınmadı**. Şu anki sipariş hattı kapıda nakit / kapıda kart / havale ile
çalışıyor — yani online tahsilat yok. Online ödeme istenirse `payment_intents` tablosu ve
callback ucu gerekir; mahalle360'ın "tutar sunucuda, aktivasyon yalnız callback'te" deseni
birebir referans alınmalı.
