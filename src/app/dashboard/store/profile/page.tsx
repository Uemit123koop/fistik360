import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { StoreProfileForm } from "@/components/store-profile-form";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StoreProfilePage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, description, phone, address, logo_url, cover_url, is_active, platform_status").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) notFound();
  const { data: primaryArea } = await supabase.from("store_neighborhoods").select("province, district, neighborhood").eq("store_id", store.id).eq("is_primary", true).maybeSingle();
  const currentLocation = primaryArea ? [primaryArea.neighborhood, primaryArea.district, primaryArea.province].filter(Boolean).join(" · ") : null;

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Mahalle vitrini"
        title="Mağaza profilim"
        action={store.is_active && store.platform_status === "ACTIVE" ? <Link href={`/magaza/${store.id}`} className="button-secondary">Vitrini gör</Link> : undefined}
      />
      <StoreProfileForm currentLocation={currentLocation} initial={{ name: store.name, description: store.description ?? "", phone: store.phone ?? "", address: store.address ?? "", logoUrl: store.logo_url ?? "", coverUrl: store.cover_url ?? "" }} />
    </div>
  );
}
