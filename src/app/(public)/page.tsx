import Link from "next/link";
import { HomeBrandSection } from "@/components/home-brand-section";
import { HomeScrollHero } from "@/components/home-scroll-hero";
import { ArrowIcon, AtlasImage, MapPinIcon } from "@/components/marketplace-ui";
import { PackageHoverCard } from "@/components/package-hover-card";
import { ProductPhotoVisual } from "@/components/product-photo-visual";
import { SellerTestimonials } from "@/components/seller-testimonials";
import { PublicNeighborhoodFinder } from "@/components/turkey-location-fields";
import { ScrollShowcase } from "@/components/scroll-showcase";
import { TrustedSellersShowcase } from "@/components/trusted-sellers-showcase";
import { homeBundleTiers } from "@/lib/bundle-content";
import { productCategories } from "@/lib/marketplace-content";
import { getNeighborhoodPreference } from "@/lib/neighborhood";
import { getServerUser } from "@/lib/auth";

export default async function HomePage() {
  const [user, neighborhood] = await Promise.all([getServerUser(), getNeighborhoodPreference()]);
  const canAccessWholesale = user?.role === "NUT_STORE" || user?.role === "WHOLESALE_SELLER" || user?.role === "ADMIN";

  return (
    <div>
      <HomeScrollHero canAccessWholesale={canAccessWholesale} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Tazeliği seç</p><h2 id="categories-heading" className="section-title">Kuruyemiş kategorileri</h2></div>
          <Link href="/magazalar" className="text-link">Tüm mağazaları gör <ArrowIcon /></Link>
        </div>
        <div className="mt-6">
          <ScrollShowcase ariaLabel="Kuruyemiş kategorileri" cardClassName="w-[148px] sm:w-[172px]">
            {productCategories.map((category) => (
              <Link key={category.name} href="/magazalar" className="group block overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-white text-center shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]">
                {category.heroImage ? (
                  <ProductPhotoVisual src={category.heroImage} alt={`${category.name} kategorisi`} className="aspect-square" sizes="(max-width: 640px) 50vw, 170px" />
                ) : (
                  <AtlasImage atlas="category" column={category.column} row={category.row} alt={`${category.name} kategorisi`} className="aspect-square" sizes="(max-width: 640px) 50vw, 170px" />
                )}
                <div className="px-2 py-3"><h3 className="text-sm font-bold text-[var(--color-ink)]">{category.name}</h3><p className="mt-0.5 hidden text-xs text-[var(--color-muted-text)] lg:block">{category.description}</p></div>
              </Link>
            ))}
          </ScrollShowcase>
        </div>
      </section>

      <section className="border-y border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="section-heading">
            <div><p className="eyebrow">Hazır seçkiler</p><h2 className="section-title">Her sofraya uygun bir paket</h2><p className="section-description">Gramajı ve içeriği net; üzerine gelince içindekileri gösteren toplu paketler.</p></div>
            <Link href="/paketler" className="text-link">Tüm paketleri incele <ArrowIcon /></Link>
          </div>
          <div className="mt-7">
            <ScrollShowcase ariaLabel="Hazır paketler" variant="feature" cardClassName="w-[88vw] max-w-[380px] sm:w-[420px]">
              {homeBundleTiers.map((tier) => <PackageHoverCard key={tier.id} tier={tier} />)}
            </ScrollShowcase>
          </div>
        </div>
      </section>

      {!neighborhood ? (
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-9">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"><MapPinIcon className="h-5 w-5" /></span>
              <div><h2 className="text-xl font-bold text-[var(--color-ink)]">Önce mahalleni seçelim</h2><p className="text-sm text-[var(--color-muted-text)]">Sana teslimat yapan gerçek mağazaları ve ürünlerini gösterebilmemiz için mahalleni bilmemiz lazım.</p></div>
            </div>
            <PublicNeighborhoodFinder redirectTo="/" />
            <p className="mt-4 text-xs text-[var(--color-muted-text)]">Seçim yapmadan da <Link href="/magazalar" className="font-bold text-[var(--color-primary)] underline-offset-4 hover:underline">tüm mağazaları</Link> inceleyebilirsin.</p>
          </div>
        </section>
      ) : (
        <TrustedSellersShowcase />
      )}
      <SellerTestimonials />
      <HomeBrandSection />
    </div>
  );
}
