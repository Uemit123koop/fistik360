import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerPackageManager, type SellerPackageRow } from "@/components/seller-inventory-manager";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StorePackagesPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  const { data: packages } = store
    ? await supabase.from("packages").select("id, name, package_type, price, is_active").eq("store_id", store.id).order("created_at", { ascending: false })
    : { data: [] };

  const rows: SellerPackageRow[] = (packages ?? []).map((item) => ({ ...item, price: Number(item.price) }));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Hazır seçkiler</p><h1 className="mt-2 text-3xl font-bold">Paketlerim</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-text)]">Paket fiyatını ve mahalle vitrini yayın durumunu tek yerden yönet.</p></div>
        <Link href="/dashboard/store/packages/new" className="button-primary">Paket oluştur</Link>
      </div>
      <div className="mt-7"><SellerPackageManager initialPackages={rows} /></div>
    </div>
  );
}
