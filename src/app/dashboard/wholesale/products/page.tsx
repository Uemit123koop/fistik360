import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function WholesaleProductsPage() {
  const user = await requireRole(["WHOLESALE_SELLER"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("wholesale_products")
    .select("id, name, category, image_url, unit, stock_quantity, minimum_order_quantity, unit_price, is_active")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Toptan katalog</p>
          <h1 className="mt-2 text-3xl font-bold">Ürünlerim</h1>
          <p className="mt-2 text-sm text-[var(--color-muted-text)]">Ürün kimliği ve görseli Fıstık360 kataloğundan gelir; sen yalnız ticari alanları yönetirsin.</p>
        </div>
        <Link href="/dashboard/wholesale/new" className="button-primary">Katalogdan ürün seç</Link>
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {products?.length ? products.map((product) => (
          <article key={product.id} className="grid overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] sm:grid-cols-[132px_minmax(0,1fr)]">
            <div className="relative min-h-36 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] sm:min-h-full sm:border-b-0 sm:border-r">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, 132px" className="object-contain p-3" />
              ) : (
                <span className="flex h-full min-h-36 items-center justify-center p-4 text-center text-xs font-bold text-[var(--color-muted-text)]">Katalog görseli hazırlanıyor</span>
              )}
            </div>
            <div className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[var(--color-accent)]">{product.category}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{product.name}</h2>
                  <span className={product.is_active ? "badge-success" : "chip"}>{product.is_active ? "Aktif" : "Taslak"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
                  Stok {product.stock_quantity} {product.unit} · Minimum {product.minimum_order_quantity} {product.unit}
                </p>
              </div>
              <p className="font-bold tabular-nums text-[var(--color-primary-dark)]">{Number(product.unit_price).toLocaleString("tr-TR")} TL/{product.unit}</p>
            </div>
          </article>
        )) : (
          <p className="col-span-full rounded-[16px] border border-dashed border-[var(--color-border)] p-6 text-[var(--color-muted-text)]">Henüz katalogdan toptan ürün seçilmedi.</p>
        )}
      </div>
    </div>
  );
}
