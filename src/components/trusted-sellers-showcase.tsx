import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/marketplace-ui";

interface TrustedSeller {
  id: string;
  name: string;
  company: string;
  city: string;
  image: string;
  quote: string;
  badgeText: string;
  offsetY: number;
  scale: number;
}

// Modern kuruyemiş tezgahı photos (Pexels License — free for commercial use),
// Turkish photographers/markets, showing the full variety of nuts and dried
// fruit on display rather than generic shop-owner portraits.
const SELLERS: TrustedSeller[] = [
  { id: "seller-1", name: "Ahmet Yılmaz", company: "Öz Antep Kuruyemiş", city: "Gaziantep", image: "https://images.pexels.com/photos/33202838/pexels-photo-33202838.jpeg?cs=srgb&fm=jpg&w=600", quote: "fıstık360 sayesinde tedarik hızımız 3 katına çıktı, çok teşekkür ederiz.", badgeText: "Fıstık Üreticisi", offsetY: 8, scale: 1.0 },
  { id: "seller-2", name: "Mehmet Kaya", company: "Kaya Kardeşler Kuruyemiş", city: "İstanbul", image: "https://images.pexels.com/photos/36725248/pexels-photo-36725248.jpeg?cs=srgb&fm=jpg&w=600", quote: "Tüm stok yönetimimizi artık buradan yapıyoruz, harika bir platform.", badgeText: "Toptan & Perakende", offsetY: -20, scale: 1.05 },
  { id: "seller-3", name: "Mustafa Öztürk", company: "Tarihi Elazığ Şarküteri", city: "Elazığ", image: "https://images.pexels.com/photos/19109130/pexels-photo-19109130.jpeg?cs=srgb&fm=jpg&w=600", quote: "fıstık360 ekibine güvenimiz tam, işimiz büyüdü.", badgeText: "Şarküteri", offsetY: 28, scale: 0.95 },
  { id: "seller-4", name: "Ayşe Demir", company: "Siirt Fıstıkçılık", city: "Siirt", image: "https://images.pexels.com/photos/18719423/pexels-photo-18719423.jpeg?cs=srgb&fm=jpg&w=600", quote: "Doğrudan üreticiden alım yapabiliyoruz, fıstık360'a minnettarız.", badgeText: "Siirt Fıstığı Uzmanı", offsetY: -8, scale: 1.1 },
  { id: "seller-5", name: "Hasan Çelik", company: "Çelikler Kuruyemiş", city: "Ankara", image: "https://images.pexels.com/photos/36725247/pexels-photo-36725247.jpeg?cs=srgb&fm=jpg&w=600", quote: "Sipariş takibi çok kolaylaştı, iyi ki fıstık360 varmış.", badgeText: "Kuruyemiş Mağazası", offsetY: 16, scale: 1.0 },
  { id: "seller-6", name: "Fatma Şahin", company: "Gaziantep Yöresel Bakliyat & Fıstık", city: "Gaziantep", image: "https://images.pexels.com/photos/19273250/pexels-photo-19273250.jpeg?cs=srgb&fm=jpg&w=600", quote: "fıstık360 ile işimizi büyüttük, teşekkürler!", badgeText: "Yöresel Ürünler", offsetY: -24, scale: 1.05 },
  { id: "seller-7", name: "Ali Can", company: "Anadolu Kuruyemiş", city: "İzmir", image: "https://images.pexels.com/photos/31373166/pexels-photo-31373166.jpeg?cs=srgb&fm=jpg&w=600", quote: "Aradığımız kaliteyi hemen buluyoruz, çok memnunuz.", badgeText: "Butik & Hediyelik Kuruyemiş", offsetY: 12, scale: 0.95 },
  { id: "seller-8", name: "Emre Polat", company: "Malatya Pazarı Şubesi", city: "Bursa", image: "https://images.pexels.com/photos/33504905/pexels-photo-33504905.jpeg?cs=srgb&fm=jpg&w=600", quote: "Fiyat şeffaflığı harika, fıstık360'a teşekkür ederiz.", badgeText: "Franchise Mağaza", offsetY: -4, scale: 1.0 },
];

function SellerPhoto({ seller, index }: { seller: TrustedSeller; index: number }) {
  return (
    <div
      className="trust-card group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]"
      style={{ "--trust-i": index, "--trust-y": `${seller.offsetY}px`, "--trust-scale": seller.scale } as React.CSSProperties}
    >
      <Image src={seller.image} alt={`${seller.company}, ${seller.city}`} fill sizes="(max-width: 1024px) 45vw, 220px" className="object-cover" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-xs font-extrabold uppercase tracking-[.08em] text-[#8fd19e]">{seller.badgeText}</p>
        <p className="mt-1 text-sm font-bold">{seller.name}</p>
        <p className="text-xs text-white/70">{seller.company} · {seller.city}</p>
        <p className="mt-1 text-xs italic text-white/80">&ldquo;{seller.quote}&rdquo;</p>
      </div>
    </div>
  );
}

export function TrustedSellersShowcase() {
  const left = SELLERS.slice(0, 4);
  const right = SELLERS.slice(4, 8);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="overflow-hidden rounded-[30px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(320px,460px)_1fr]">
          <div className="hidden grid-cols-2 gap-4 lg:grid">
            {left.map((seller, index) => <SellerPhoto key={seller.id} seller={seller} index={index} />)}
          </div>

          <div className="text-center">
            <span className="trust-badge inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-4 py-1.5 text-sm font-bold text-[var(--color-primary-dark)]">
              Müşteri Görüşleri
            </span>
            <h2 className="trust-heading mt-4 font-serif text-3xl font-extrabold leading-[1.2] tracking-[-0.02em] text-[var(--color-ink)] sm:text-4xl">
              Türkiye&apos;nin En Seçkin Kuruyemişçileri fıstık360&apos;a Güveniyor
            </h2>
            <p className="trust-subheading mt-4 text-base leading-7 text-[var(--color-muted-text)]">
              Gaziantep&apos;ten İstanbul&apos;a yüzlerce kuruyemiş esnafı tedarik ve sipariş süreçlerini fıstık360 ile dijitalleştiriyor.
            </p>
            <Link href="/magaza-ac" className="trust-cta button-primary mt-7">
              Siz de Başarı Hikayenizi Yazın <ArrowIcon />
            </Link>

            <div className="mt-8 grid grid-cols-4 gap-3 lg:hidden">
              {SELLERS.map((seller) => (
                <div key={seller.id} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-card)]">
                  <Image src={seller.image} alt={`${seller.company}, ${seller.city}`} fill sizes="90px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-4 lg:grid">
            {right.map((seller, index) => <SellerPhoto key={seller.id} seller={seller} index={index + 4} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
