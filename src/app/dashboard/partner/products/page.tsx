import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivePartner } from "@/lib/partner-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function PartnerProductsPage() {
  const access = await getActivePartner(); if (!access) notFound();
  const { data } = await createSupabaseAdminClient().from("brand_products").select("id, name, category, status, created_at, brand_product_variants(label, price, stock)").eq("partner_id", access.partner.id).order("created_at", { ascending: false });
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Katalog</p><h1 className="mt-2 text-3xl font-bold">Ürünler</h1></div><Link href="/dashboard/partner/products/new" className="button-primary">Yeni ürün</Link></div>{!data?.length ? <div className="mt-7 rounded-[18px] border border-dashed border-[var(--color-border)] p-8 text-center"><p className="font-bold">Henüz ürün yok.</p><p className="mt-2 text-sm text-[var(--color-muted-text)]">İlk ürününüzü ve satış varyantını birlikte ekleyin.</p></div> : <div className="mt-7 space-y-3">{data.map((product) => { const variant = Array.isArray(product.brand_product_variants) ? product.brand_product_variants[0] : null; return <article key={product.id} className="flex flex-col gap-3 rounded-[16px] border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{product.name}</p><p className="mt-1 text-sm text-[var(--color-muted-text)]">{product.category} · {variant?.label ?? "Varyant yok"}</p></div><div className="flex items-center gap-3"><span className="chip">{product.status}</span>{variant && <span className="font-bold tabular-nums">{Number(variant.price).toLocaleString("tr-TR")} TL</span>}</div></article>; })}</div>}</div>;
}
