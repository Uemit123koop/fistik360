import Link from "next/link";
import { HomeBrandSection } from "@/components/home-brand-section";
import { HomeScrollHero } from "@/components/home-scroll-hero";
import { ArrowIcon, AtlasImage, MapPinIcon, PackageCard } from "@/components/marketplace-ui";
import { packageShowcase, productCategories } from "@/lib/marketplace-content";
import { getServerUser } from "@/lib/auth";

const featuredStores = [
  { id: 1, name: "Fıstıkçı Mehmet", neighborhood: "Kadıköy", description: "Günlük kavrulan kuruyemişler ve özenle hazırlanan aile paketleri.", column: 0, row: 0 },
  { id: 2, name: "Lezzet Bahçesi", neighborhood: "Beşiktaş", description: "Premium karışımlar, kuru meyveler ve davetlere özel sunumlar.", column: 3, row: 0 },
];

export default async function HomePage() {
  const user = await getServerUser();
  const canAccessWholesale = user?.role === "NUT_STORE" || user?.role === "WHOLESALE_SELLER" || user?.role === "ADMIN";
  return (
    <div>
      <HomeScrollHero canAccessWholesale={canAccessWholesale} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Tazeliği seç</p><h2 id="categories-heading" className="section-title">Kuruyemiş kategorileri</h2></div>
          <Link href="/magazalar" className="text-link">Tüm mağazaları gör <ArrowIcon /></Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {productCategories.map((category) => (
            <Link key={category.name} href="/magazalar" className="group overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-white text-center shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]">
              <AtlasImage atlas="category" column={category.column} row={category.row} alt={`${category.name} kategorisi`} className="aspect-square" sizes="(max-width: 640px) 50vw, 170px" />
              <div className="px-2 py-3"><h3 className="text-sm font-bold text-[var(--color-ink)]">{category.name}</h3><p className="mt-0.5 hidden text-xs text-[var(--color-muted-text)] lg:block">{category.description}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="section-heading">
            <div><p className="eyebrow">Hazır seçkiler</p><h2 className="section-title">Her sofraya uygun bir paket</h2><p className="section-description">Gramajı ve içeriği net, mahalle mağazalarının özenle hazırladığı paketler.</p></div>
            <Link href="/magaza/1" className="text-link">Tüm paketleri incele <ArrowIcon /></Link>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-3">{packageShowcase.slice(0, 3).map((item) => <PackageCard key={item.name} item={item} compact />)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="eyebrow">Yakınındaki esnaf</p><h2 className="section-title">İyi kuruyemiş bazen birkaç sokak ötede.</h2>
          <p className="section-description">Mahalleni seç, teslimat alanındaki mağazaları ve günlük ürünlerini tek vitrinde karşılaştır.</p>
          <Link href="/mahalle" className="button-primary mt-7 w-fit">Mahalleni seç <ArrowIcon /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featuredStores.map((store) => (
            <article key={store.name} className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
              <AtlasImage atlas="category" column={store.column} row={store.row} alt={`${store.name} mağaza ürünleri`} className="aspect-[16/8]" sizes="(max-width: 640px) 100vw, 360px" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold text-[var(--color-ink)]">{store.name}</h3><span className="badge-success"><MapPinIcon className="h-3.5 w-3.5" /> {store.neighborhood}</span></div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">{store.description}</p>
                <Link href={`/magaza/${store.id}`} className="text-link mt-4">Mağazayı aç <ArrowIcon /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <HomeBrandSection />
    </div>
  );
}
