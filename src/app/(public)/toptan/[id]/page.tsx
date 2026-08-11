import Link from "next/link";
import { notFound } from "next/navigation";
import { AtlasImage, MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import { WholesaleInquiryForm } from "@/components/wholesale-inquiry-form";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/cart";
import { getWholesaleProduct } from "@/lib/wholesale";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const quantity = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default async function WholesaleDetailPage({ params }: PageProps<"/toptan/[id]">) {
  const user = await requireRole(["NUT_STORE", "WHOLESALE_SELLER", "ADMIN"]);
  if (!user) notFound();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const product = await getWholesaleProduct(id);
  if (!product?.seller) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Link href="/toptan" className="text-link">← Toptan listesine dön</Link>
      <div className="mt-6 grid overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[320px] lg:min-h-full">
          <AtlasImage atlas="category" column={0} row={0} alt={`${product.name} toptan ürün görseli`} className="absolute inset-0 h-full w-full" sizes="(max-width: 1024px) 100vw, 520px" />
          <span className="badge-success absolute left-5 top-5">{product.category}</span>
        </div>
        <div className="p-6 sm:p-8 lg:p-10">
          <p className="eyebrow">Toptan ürün detayı</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-[-0.025em] text-[var(--color-ink)]">{product.name}</h1>
          <p className="mt-4 leading-7 text-[var(--color-muted-text)]">{product.description || `${product.category} kategorisinde doğrulanmış toptancı ilanı.`}</p>
          <div className="mt-7 rounded-[18px] bg-[var(--color-primary-soft)] p-5"><p className="data-label">Birim fiyat</p><p className="mt-1 text-3xl font-bold tabular-nums text-[var(--color-primary-dark)]">{currency.format(product.unitPrice)}/{product.unit}</p></div>
          <dl className="mt-7 grid grid-cols-2 gap-4">
            {[
              { label: "Satıcı", value: product.seller.businessName },
              { label: "Menşei", value: product.origin || "Belirtilmedi" },
              { label: "Tür", value: product.productType || product.category },
              { label: "Stok", value: `${quantity.format(product.stockQuantity)} ${product.unit}` },
              { label: "Minimum sipariş", value: `${quantity.format(product.minimumOrderQuantity)} ${product.unit}` },
              { label: "Durum", value: "Satışa açık" },
            ].map((item) => <div key={item.label} className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4"><dt className="data-label">{item.label}</dt><dd className="mt-1 font-bold text-[var(--color-ink)]">{item.value}</dd></div>)}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3 border-t border-[var(--color-border-soft)] pt-5 text-sm text-[var(--color-muted-text)]">
            <span className="inline-flex items-center gap-2"><ShieldIcon className="text-[var(--color-primary)]" /> Rol doğrulamalı pazar</span>
            {product.origin && <span className="inline-flex items-center gap-2"><MapPinIcon className="text-[var(--color-primary)]" /> {product.origin} çıkışlı</span>}
          </div>
          <Link href={`/toptanci/${product.seller.slug}`} className="button-secondary mt-6 w-full">Toptancı profilini gör</Link>
        </div>
      </div>
      {user.role === "NUT_STORE" && <div className="mt-7"><WholesaleInquiryForm productId={product.id} /></div>}
      {user.role !== "NUT_STORE" && <p className="mt-7 rounded-[16px] bg-[var(--color-surface-strong)] p-5 text-sm text-[var(--color-muted-text)]">Alım talebi yalnız doğrulanmış kuruyemişçi hesapları tarafından gönderilebilir.</p>}
    </div>
  );
}
