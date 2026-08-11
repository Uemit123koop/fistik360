import type { Metadata } from "next";
import Link from "next/link";
import { BrandCard, type PublicBrand } from "@/components/brand-commerce-ui";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Türkiye'nin Kuruyemiş Markaları | Fıstık360", description: "Fıstık360 tarafından doğrulanan kuruyemiş markalarını keşfedin." };

export default async function BrandsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("brands").select("id, name, slug, description, logo_path, cover_path").eq("is_verified", true).eq("is_active", true).order("name");
  const brands = error ? [] : (data as PublicBrand[] | null) ?? [];
  return (
    <div>
      <section className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
          <p className="eyebrow">Fıstık360 seçkisi</p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-[-.035em] sm:text-6xl">Türkiye&apos;nin kuruyemiş markaları.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-muted-text)]">Kendi deposundan Türkiye geneline gönderim yapan, Fıstık360 tarafından doğrulanmış markaları ve ürünlerini keşfet.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {brands.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{brands.map((brand) => <BrandCard key={brand.id} brand={brand} />)}</div> : <div className="border-y border-dashed border-[var(--color-border)] py-12 text-center"><p className="font-serif text-2xl font-bold">İlk markalar hazırlanıyor.</p><p className="mt-3 text-sm text-[var(--color-muted-text)]">Doğrulanan partner markalar burada yayınlanacak.</p></div>}
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[var(--color-border)] pt-8 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold">Markanı burada görmek ister misin?</h2><p className="mt-1 text-sm text-[var(--color-muted-text)]">Ürünlerini ekle, siparişi al ve kendi depondan gönder.</p></div><Link href="/partner/apply" className="button-primary">Partner başvurusu yap</Link></div>
      </section>
    </div>
  );
}
