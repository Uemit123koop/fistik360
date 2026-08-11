import Link from "next/link";
import { notFound } from "next/navigation";
import { AtlasImage, ArrowIcon, PackageIcon, ShieldIcon } from "@/components/marketplace-ui";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export default async function WholesaleSellerPage({ params }: PageProps<"/toptanci/[slug]">) {
  const user = await requireRole(["NUT_STORE", "WHOLESALE_SELLER", "ADMIN"]);
  if (!user) notFound();
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("wholesale_seller_profiles")
    .select("owner_id, business_name, slug, description, phone, logo_url, cover_url, product_categories, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !profile) notFound();

  const isOwner = profile.owner_id === user.id;
  if (!profile.is_active && !isOwner && user.role !== "ADMIN") notFound();

  const { data: products, error: productsError } = await supabase
    .from("wholesale_products")
    .select("id, name, category, origin, unit, minimum_order_quantity, unit_price, is_active")
    .eq("seller_id", profile.owner_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (productsError) throw new Error("Toptancı ürünleri okunamadı.");

  const initial = profile.business_name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toLocaleUpperCase("tr-TR");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Link href="/toptan" className="text-link">← Toptan pazara dön</Link>
      <section className="mt-6 overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <div className="relative min-h-56 bg-[var(--color-primary-dark)]">
          <AtlasImage atlas="category" column={3} row={1} alt={`${profile.business_name} ürün seçkisi`} className="absolute inset-0 h-full w-full opacity-55" sizes="(max-width: 1280px) 100vw, 1280px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {!profile.is_active && <span className="absolute right-5 top-5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">Yayın öncesi önizleme</span>}
        </div>
        <div className="relative px-5 pb-7 sm:px-8">
          <div className="-mt-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[var(--color-accent)] text-xl font-extrabold text-white shadow-lg sm:h-24 sm:w-24">{initial}</div>
              <div className="pb-1"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">Toptancı vitrini</p><h1 className="mt-1 font-serif text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">{profile.business_name}</h1></div>
            </div>
            <span className="chip mb-1"><ShieldIcon /> Doğrulanmış toptancı</span>
          </div>
          <p className="mt-5 max-w-3xl leading-7 text-[var(--color-muted-text)]">{profile.description || "Kuruyemişçilere düzenli stok ve şeffaf minimum sipariş koşullarıyla toptan ürün sunar."}</p>
          <div className="mt-5 flex flex-wrap gap-2">{(profile.product_categories ?? []).map((category: string) => <span key={category} className="chip">{category}</span>)}</div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="section-heading"><div><p className="eyebrow">Toptan katalog</p><h2 className="section-title">Aktif ürünler</h2><p className="section-description">Minimum sipariş, stok birimi ve fiyatı net ilanlar.</p></div>{isOwner && <Link href="/dashboard/wholesale/products" className="button-secondary">Kataloğu yönet</Link>}</div>
        {products?.length ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <article key={product.id} className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]">
                <AtlasImage atlas="category" column={index % 4} row={Math.floor(index / 4) % 2} alt={`${product.name} toptan ürün`} className="aspect-[16/9]" sizes="(max-width: 640px) 100vw, 420px" />
                <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-bold text-[var(--color-ink)]">{product.name}</h3><span className="badge-success">{product.category}</span></div><p className="mt-3 text-sm text-[var(--color-muted-text)]">Minimum {product.minimum_order_quantity} {product.unit} · {product.origin || "Menşei belirtilmedi"}</p><p className="mt-4 text-xl font-bold tabular-nums text-[var(--color-primary-dark)]">{currency.format(Number(product.unit_price))}/{product.unit}</p><Link href={`/toptan/${product.id}`} className="button-primary mt-5 w-full">Ürünü incele <ArrowIcon /></Link></div>
              </article>
            ))}
          </div>
        ) : <div className="mt-7 rounded-[20px] border border-dashed border-[var(--color-border)] bg-white p-8 text-center"><PackageIcon className="mx-auto h-7 w-7 text-[var(--color-primary)]" /><p className="mt-3 font-bold">Aktif ürün henüz yok.</p></div>}
      </section>
    </div>
  );
}
