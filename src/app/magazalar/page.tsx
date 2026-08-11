import Link from "next/link";
import { ArrowIcon, AtlasImage, MapPinIcon, PackageIcon } from "@/components/marketplace-ui";
import { SiteShell } from "@/components/site-shell";
import { isUuid } from "@/lib/cart";
import { DEMO_SELLERS, getInitialDemoProducts } from "@/lib/demo-sellers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface StoreCard {
  id: string;
  name: string;
  description: string | null;
  neighborhoodId: string;
  neighborhood: string;
  productCount: number;
  packageCount: number;
  isDemo?: boolean;
}

async function getStores(selectedNeighborhood?: string, selectedNeighborhoodName?: string): Promise<StoreCard[]> {
  const supabase = await createSupabaseServerClient();
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, description")
    .eq("is_active", true)
    .eq("platform_status", "ACTIVE")
    .order("name", { ascending: true });
  if (error) throw new Error("Mağazalar okunamadı.");

  const cards = await Promise.all((stores ?? []).map(async (store) => {
    let areaQuery = supabase
      .from("store_neighborhoods")
      .select("id, neighborhood_id, neighborhood, is_primary")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1);
    if (selectedNeighborhood && isUuid(selectedNeighborhood)) {
      areaQuery = areaQuery.eq("neighborhood_id", selectedNeighborhood);
    }

    const [{ data: areas }, { count: productCount }, { count: packageCount }] = await Promise.all([
      areaQuery,
      supabase.from("retail_products").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true).eq("is_in_stock", true),
      supabase.from("packages").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true),
    ]);
    const area = areas?.[0];
    if (!area) return null;
    return {
      id: store.id,
      name: store.name,
      description: store.description,
      neighborhoodId: area.neighborhood_id,
      neighborhood: area.neighborhood,
      productCount: productCount ?? 0,
      packageCount: packageCount ?? 0,
    };
  }));

  const realStores = cards.filter((card): card is StoreCard => card !== null);
  const normalizedName = selectedNeighborhoodName?.toLocaleLowerCase("tr-TR");
  const demoStores: StoreCard[] = DEMO_SELLERS
    .filter((seller) => !selectedNeighborhood
      || seller.neighborhoodId === selectedNeighborhood
      || seller.neighborhood.toLocaleLowerCase("tr-TR") === normalizedName)
    .map((seller) => ({
      id: seller.storeId,
      name: seller.name,
      description: seller.description,
      neighborhoodId: seller.neighborhoodId,
      neighborhood: seller.neighborhood,
      productCount: getInitialDemoProducts(seller).filter((product) => product.active && product.inStock).length,
      packageCount: seller.packages.filter((item) => item.active).length,
      isDemo: true,
    }));

  return [...realStores, ...demoStores];
}

export default async function StoresPage({ searchParams }: PageProps<"/magazalar">) {
  const query = await searchParams;
  const selectedNeighborhood = typeof query.mahalle === "string" ? query.mahalle : undefined;
  const selectedNeighborhoodName = typeof query.mahalleAdi === "string" ? query.mahalleAdi : undefined;
  const stores = await getStores(selectedNeighborhood, selectedNeighborhoodName);

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-5 border-b border-[var(--color-border-soft)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Mahalle mağazaları</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold tracking-[-0.025em] text-[var(--color-ink)] sm:text-5xl">Sana teslimat yapan kuruyemişçiler</h1>
            <p className="mt-4 max-w-2xl text-[var(--color-muted-text)]">Yalnızca aktif hizmet bölgesi, ürün ve paket bilgisi bulunan gerçek mağaza kayıtları gösterilir.</p>
          </div>
          <Link href="/mahalle" className="button-secondary shrink-0"><MapPinIcon /> Konumu değiştir</Link>
        </div>

        {stores.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store, index) => (
              <article key={store.id} className="group overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
                <div className="relative">
                  <AtlasImage atlas="category" column={index % 4} row={Math.floor(index / 4) % 2} alt={`${store.name} ürün vitrini`} className="aspect-[16/9]" sizes="(max-width: 768px) 100vw, 420px" />
                  <div className="absolute -bottom-7 left-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[var(--color-primary)] text-sm font-bold text-white shadow-md">
                    {store.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr-TR")}
                  </div>
                  <span className="badge-success absolute right-4 top-4">{store.isDemo ? "Demo mağaza" : "Teslimat aktif"}</span>
                </div>
                <div className="px-5 pb-5 pt-10">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-bold text-[var(--color-ink)]">{store.name}</h2>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]"><MapPinIcon className="h-3.5 w-3.5" /> {store.neighborhood}</span>
                  </div>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--color-muted-text)]">{store.description || "Mahallene taze kuruyemiş ve özenle hazırlanan paketler ulaştırır."}</p>
                  <div className="mt-5 flex gap-2 border-t border-[var(--color-border-soft)] pt-4 text-xs font-semibold text-[var(--color-muted-text)]">
                    <span className="chip">{store.productCount} ürün</span>
                    <span className="chip"><PackageIcon className="h-3.5 w-3.5" /> {store.packageCount} paket</span>
                  </div>
                  <Link href={`/magaza/${store.id}?mahalle=${store.neighborhoodId}`} className="button-primary mt-5 w-full">Mağazayı aç <ArrowIcon /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[24px] border border-dashed border-[var(--color-border)] bg-white px-6 py-12 text-center">
            <h2 className="text-2xl font-bold">Bu bölgede aktif mağaza bulunamadı</h2>
            <p className="mx-auto mt-3 max-w-lg text-[var(--color-muted-text)]">Başka bir mahalle seçebilir veya mağazalar yayınlandığında tekrar kontrol edebilirsin.</p>
            <Link href="/mahalle" className="button-primary mt-6">Mahalle seç</Link>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
