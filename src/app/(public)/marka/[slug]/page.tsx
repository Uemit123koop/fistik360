import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldIcon } from "@/components/marketplace-ui";
import { assetPublicUrl } from "@/lib/partner";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function BrandStorefrontPage({ params }: PageProps<"/marka/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: brand } = await supabase.from("brands").select("id, name, slug, description, logo_path, cover_path").eq("slug", slug).eq("is_verified", true).eq("is_active", true).maybeSingle();
  if (!brand) notFound();
  const { data: products } = await supabase.from("brand_products").select("id, name, slug, category, description, image_path, brand_product_variants(id, label, price, compare_at_price, stock, unit, weight, is_active)").eq("brand_id", brand.id).eq("status", "ACTIVE").order("created_at", { ascending: false });
  const cover = assetPublicUrl(brand.cover_path);
  const logo = assetPublicUrl(brand.logo_path);
  return (
    <div>
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"><Link href="/markalar" className="text-link">← Markalara dön</Link></div>
        <div className="mx-auto grid max-w-7xl items-end gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:px-8 lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white bg-cover bg-center font-serif text-3xl font-bold text-[var(--color-primary-dark)]" style={logo ? { backgroundImage: `url(${JSON.stringify(logo)})` } : undefined}>{!logo && brand.name.slice(0, 1)}</div>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary-dark)]"><ShieldIcon /> Fıstık360 onaylı marka</span>
            </div>
            <h1 className="mt-6 font-serif text-4xl font-bold tracking-[-.035em] sm:text-6xl">{brand.name}</h1>
            <p className="mt-5 max-w-2xl leading-8 text-[var(--color-muted-text)]">{brand.description}</p>
            <p className="mt-5 text-sm font-semibold text-[var(--color-primary-dark)]">Siparişler marka tarafından hazırlanır ve kendi deposundan gönderilir.</p>
          </div>
          <div className="order-1 aspect-[16/10] bg-[var(--color-surface-strong)] bg-cover bg-center lg:order-2" role="img" aria-label={`${brand.name} kapak görseli`} style={cover ? { backgroundImage: `url(${JSON.stringify(cover)})` } : undefined}>{!cover && <div className="grid h-full place-items-center font-serif text-7xl font-bold text-[var(--color-primary)]">{brand.name.slice(0, 1)}</div>}</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <p className="eyebrow">Marka seçkisi</p><h2 className="section-title">Ürünler</h2>
        {products?.length ? <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((product) => { const variants = Array.isArray(product.brand_product_variants) ? product.brand_product_variants.filter((item) => item.is_active) : []; const image = assetPublicUrl(product.image_path); return <article key={product.id} className="overflow-hidden border border-[var(--color-border)] bg-white"><div className="aspect-square bg-[var(--color-primary-soft)] bg-cover bg-center" role="img" aria-label={`${product.name} ürün görseli`} style={image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined}>{!image && <div className="grid h-full place-items-center font-serif text-5xl font-bold text-[var(--color-primary)]">{product.name.slice(0, 1)}</div>}</div><div className="p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--color-accent)]">{product.category}</p><h3 className="mt-2 text-base font-bold sm:text-lg">{product.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-muted-text)]">{product.description}</p><div className="mt-4 space-y-2 border-t border-[var(--color-border-soft)] pt-4">{variants.length ? variants.map((variant) => <div key={variant.id} className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold text-[var(--color-muted-text)]">{variant.label}</span><span className="font-bold tabular-nums text-[var(--color-primary-dark)]">{Number(variant.price).toLocaleString("tr-TR")} TL</span></div>) : <span className="text-sm text-[var(--color-muted-text)]">Satışa kapalı</span>}</div></div></article>; })}</div> : <div className="mt-7 border-y border-dashed border-[var(--color-border)] py-10 text-center text-[var(--color-muted-text)]">Bu markanın yayındaki ürünleri hazırlanıyor.</div>}
      </section>
    </div>
  );
}
