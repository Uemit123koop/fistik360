import Link from "next/link";
import { BrandCard, type PublicBrand } from "@/components/brand-commerce-ui";
import { ArrowIcon } from "@/components/marketplace-ui";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function HomeBrandSection() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("brands").select("id, name, slug, description, logo_path, cover_path").eq("is_verified", true).eq("is_active", true).order("created_at", { ascending: false }).limit(3);
  const brands = error ? [] : (data as PublicBrand[] | null) ?? [];

  return <section className="border-y border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="section-heading"><div><p className="eyebrow">Türkiye’den seçkiler</p><h2 className="section-title">Doğrulanmış partner markalar</h2><p className="section-description">Yerel mağazaların yanında, üretici ve markaların özgün ürünlerini doğrudan keşfedin.</p></div><Link href="/markalar" className="text-link">Tüm markalar <ArrowIcon /></Link></div>{brands.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{brands.map((brand) => <BrandCard key={brand.id} brand={brand} />)}</div> : <div className="mt-7 flex flex-col items-start justify-between gap-4 rounded-[20px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:flex-row sm:items-center"><div><p className="font-bold">Partner vitrini yakında açılıyor.</p><p className="mt-1 text-sm text-[var(--color-muted-text)]">İlk doğrulanmış markalar yayınlandığında burada görünecek.</p></div><Link href="/partner" className="button-secondary shrink-0">Partner programı</Link></div>}</div></section>;
}
