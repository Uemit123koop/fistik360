import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerInventoryManager, type SellerProductRow } from "@/components/seller-inventory-manager";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StoreProductsPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  const { data: products } = store
    ? await supabase.from("retail_products").select("id, name, category, price, quantity, unit, is_in_stock, is_active").eq("store_id", store.id).order("created_at", { ascending: false })
    : { data: [] };

  const rows: SellerProductRow[] = (products ?? []).map((product) => ({
    ...product,
    price: Number(product.price),
    quantity: Number(product.quantity),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Mağaza kataloğu</p><h1 className="mt-2 text-3xl font-bold">Ürünlerim</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-text)]">Katalog ürünlerinin mağazana özel fiyatını, satış ölçüsünü, stok ve vitrin durumunu yönet.</p></div>
        <Link href="/dashboard/store/new" className="button-primary">Katalogdan ürün seç</Link>
      </div>
      <div className="mt-7"><SellerInventoryManager initialProducts={rows} /></div>
    </div>
  );
}
