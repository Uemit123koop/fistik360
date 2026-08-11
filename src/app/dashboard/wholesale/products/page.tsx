import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function WholesaleProductsPage() {
  const user = await requireRole(["WHOLESALE_SELLER"]); if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase.from("wholesale_products").select("id, name, category, unit, stock_quantity, minimum_order_quantity, unit_price, is_active").eq("seller_id", user.id).order("created_at", { ascending: false });
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Toptan katalog</p><h1 className="mt-2 text-3xl font-bold">Ürünlerim</h1></div><Link href="/dashboard/wholesale/new" className="button-primary">Katalogdan ürün seç</Link></div><div className="mt-7 space-y-3">{products?.length ? products.map((product) => <article key={product.id} className="grid gap-3 rounded-[16px] border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{product.name}</h2><span className={product.is_active ? "badge-success" : "chip"}>{product.is_active ? "Aktif" : "Taslak"}</span></div><p className="mt-2 text-sm text-[var(--color-muted-text)]">{product.category} · Stok {product.stock_quantity} {product.unit} · Minimum {product.minimum_order_quantity} {product.unit}</p></div><p className="font-bold text-[var(--color-primary-dark)]">{Number(product.unit_price).toLocaleString("tr-TR")} TL/{product.unit}</p></article>) : <p className="rounded-[16px] border border-dashed border-[var(--color-border)] p-6 text-[var(--color-muted-text)]">Henüz katalogdan toptan ürün seçilmedi.</p>}</div></div>;
}
