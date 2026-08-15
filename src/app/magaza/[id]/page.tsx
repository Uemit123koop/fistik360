import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCard } from "@/components/cart-ui";
import { CustomMixBuilder } from "@/components/custom-mix-builder";
import { MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import { SiteShell } from "@/components/site-shell";
import { StoreCatalogBrowser } from "@/components/store-catalog-browser";
import { getPublicStorefront } from "@/lib/cart";

function safeMediaUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

export default async function StoreDetailPage({ params, searchParams }: PageProps<"/magaza/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const selectedNeighborhood = typeof query.mahalle === "string" ? query.mahalle : undefined;
  const store = await getPublicStorefront(id, selectedNeighborhood);
  if (!store) notFound();

  const coverUrl = safeMediaUrl(store.coverUrl);
  const location = store.serviceArea
    ? [store.serviceArea.province, store.serviceArea.district, store.serviceArea.neighborhood].filter(Boolean).join(" · ")
    : "Teslimat bölgesi bekleniyor";
  const initial = store.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr-TR");

  return (
    <SiteShell>
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <Link href="/magazalar" className="text-link">← Mağazalara dön</Link>
      </div>
      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
          <div className="relative min-h-[250px] overflow-hidden bg-[#d9ccb7] sm:min-h-[330px]">
            {coverUrl?.startsWith("/") ? (
              <Image src={coverUrl} alt={`${store.name} mağaza vitrini`} fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
            ) : coverUrl ? (
              <div role="img" aria-label={`${store.name} mağaza vitrini`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(coverUrl)})` }} />
            ) : (
              <Image src="/assets/hero-nuts-market.png" alt={`${store.name} kuruyemiş seçkisi`} fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="badge-success absolute right-5 top-5">Teslimat aktif</span>
          </div>
          <div className="relative px-5 pb-7 sm:px-8">
            <div className="-mt-10 flex flex-col gap-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[var(--color-primary)] text-xl font-bold text-white shadow-lg sm:h-24 sm:w-24">
                  {safeMediaUrl(store.logoUrl)?.startsWith("/") ? (
                    <Image src={store.logoUrl!} alt={`${store.name} logosu`} width={96} height={96} className="h-full w-full object-cover" />
                  ) : initial}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">Mahalle vitrini</p>
                  <h1 className="mt-1 font-serif text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">{store.name}</h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-1 text-sm">
                <span className="chip"><MapPinIcon /> {location}</span>
                <span className="chip"><ShieldIcon /> Aktif mağaza</span>
              </div>
            </div>
            <p className="mt-5 max-w-3xl leading-7 text-[var(--color-muted-text)]">
              {store.description || "Mahallene taze kuruyemiş ve özenle hazırlanan paketler ulaştıran yerel mağaza."}
            </p>
            {store.serviceAreas.length > 1 && (
              <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Teslimat bölgesi seçenekleri">
                <span className="text-sm font-bold text-[var(--color-ink)]">Teslimat bölgesi:</span>
                {store.serviceAreas.map((area) => (
                  <Link key={area.id} href={`/magaza/${store.id}?mahalle=${area.neighborhoodId}`} className={`chip transition-colors ${store.serviceArea?.id === area.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "hover:border-[var(--color-primary-light)]"}`}>
                    {area.name}{area.isPrimary ? " · Ana bölge" : ""}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      {store.products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <CustomMixBuilder
            categoryTree={store.categoryTree}
            products={store.products}
            storeId={store.id}
            serviceAreaId={store.serviceArea?.id ?? null}
          />
        </section>
      )}
      <section className="border-y border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="section-heading"><div><p className="eyebrow">Özenle hazırlanır</p><h2 className="section-title">Paketler</h2><p className="section-description">Mağazanın satışa açık paketlerini aynı teslimat bölgesiyle sepetine ekle.</p></div></div>
          {store.packages.length ? (
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {store.packages.map((item) => <PackageCard key={item.id} item={item} storeId={store.id} serviceAreaId={store.serviceArea?.id ?? null} />)}
            </div>
          ) : <p className="mt-7 rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-6 text-[var(--color-muted-text)]">Bu mağazada şu an aktif paket bulunmuyor.</p>}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="section-heading">
          <div><p className="eyebrow">Günlük taze</p><h2 className="section-title">Ürünler</h2><p className="section-description">Fiyat ve satış birimini gör, tek dokunuşla aynı mağazalı sepetine ekle.</p></div>
          <Link href="/sepet" className="button-secondary">Sepeti görüntüle</Link>
        </div>
        {store.products.length ? (
          <div className="mt-7">
            <StoreCatalogBrowser
              categoryTree={store.categoryTree}
              products={store.products}
              storeId={store.id}
              serviceAreaId={store.serviceArea?.id ?? null}
            />
          </div>
        ) : <p className="mt-7 rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-6 text-[var(--color-muted-text)]">Bu mağazada şu an aktif perakende ürün bulunmuyor.</p>}
      </section>
    </div>
    </SiteShell>
  );
}
