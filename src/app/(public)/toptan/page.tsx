import Link from "next/link";
import { notFound } from "next/navigation";
import { AtlasImage, ArrowIcon, MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import { requireRole } from "@/lib/auth";
import { getWholesaleProducts } from "@/lib/wholesale";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const quantity = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default async function WholesalePage() {
  const user = await requireRole(["NUT_STORE", "WHOLESALE_SELLER", "ADMIN"]);
  if (!user) notFound();
  const products = await getWholesaleProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 border-b border-[var(--color-border-soft)] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Kuruyemişçilere özel</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold tracking-[-0.025em] text-[var(--color-ink)] sm:text-5xl">Doğrudan toptancıdan, şeffaf ürünler.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--color-muted-text)]">Stok, minimum sipariş ve birim fiyatı karşılaştır; doğrulanmış satıcıya güvenli alım talebi gönder.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm"><span className="chip"><ShieldIcon /> Rol korumalı pazar</span><span className="chip">{products.length} aktif ilan</span></div>
      </div>

      {products.length ? (
        <div className="mt-8 space-y-5">
          {products.map((product, index) => (
            <article key={product.id} className="grid overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:shadow-[var(--shadow-card-hover)] md:grid-cols-[250px_1fr] lg:grid-cols-[290px_1fr_auto]">
              <div className="relative min-h-[210px] md:min-h-full">
                <AtlasImage atlas="category" column={index % 4} row={Math.floor(index / 4) % 2} alt={`${product.name} toptan ürün görseli`} className="absolute inset-0 h-full w-full" sizes="(max-width: 768px) 100vw, 360px" />
                <span className="badge-success absolute left-4 top-4">{product.category}</span>
              </div>
              <div className="p-5 sm:p-6">
                <Link href={`/toptanci/${product.seller!.slug}`} className="text-link text-sm">{product.seller!.businessName}</Link>
                <h2 className="mt-1 text-2xl font-bold text-[var(--color-ink)]">{product.name}</h2>
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
                  <div><p className="data-label">Menşei</p><p className="data-value"><MapPinIcon className="h-3.5 w-3.5" /> {product.origin || "Belirtilmedi"}</p></div>
                  <div><p className="data-label">Tür</p><p className="data-value">{product.productType || product.category}</p></div>
                  <div><p className="data-label">Stok</p><p className="data-value tabular-nums">{quantity.format(product.stockQuantity)} {product.unit}</p></div>
                  <div><p className="data-label">Minimum</p><p className="data-value tabular-nums">{quantity.format(product.minimumOrderQuantity)} {product.unit}</p></div>
                </div>
              </div>
              <div className="flex flex-col justify-between gap-5 border-t border-[var(--color-border-soft)] p-5 md:col-span-2 md:flex-row md:items-center lg:col-span-1 lg:min-w-[230px] lg:border-l lg:border-t-0 lg:p-6">
                <div><p className="data-label">Birim fiyat</p><p className="mt-1 text-xl font-bold tabular-nums text-[var(--color-primary-dark)]">{currency.format(product.unitPrice)}/{product.unit}</p></div>
                <Link href={`/toptan/${product.id}`} className="button-primary">Detay ve talep <ArrowIcon /></Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[24px] border border-dashed border-[var(--color-border)] bg-white px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Aktif toptan ilan henüz yok</h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--color-muted-text)]">Toptancılar ürünlerini yayınladığında doğrulanmış kuruyemişçi hesapları burada görebilecek.</p>
          {user.role === "WHOLESALE_SELLER" && <Link href="/dashboard/wholesale/new" className="button-primary mt-6">İlk ürününü ekle</Link>}
        </div>
      )}
    </div>
  );
}

