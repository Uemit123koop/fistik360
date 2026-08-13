import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
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
      <DashboardPageHeader
        eyebrow="Hazır seçkiler"
        title="Paketlerim"
        description="Paket fiyatını ve mahalle vitrini yayın durumunu tek yerden yönet."
        action={<Link href="/dashboard/store/packages/new" className="button-primary">Paket oluştur</Link>}
      />
      <div className="mt-7"><SellerPackageManager initialPackages={rows} /></div>
    </div>
  );
}
