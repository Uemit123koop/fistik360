import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { StorePublishPanel } from "@/components/store-publish-panel";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStorePublishState } from "@/lib/store-publish";

export default async function StorePublishPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const state = await getStorePublishState(supabase, user.id);
  if (!state.store) notFound();

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        eyebrow="Canlıya çıkış"
        title="Mağazanı yayına al"
        description="Yayın öncesi zorunlu adımları kontrol edin. Her şey hazır olduğunda mağazanız seçtiğiniz mahallede görünür ve sipariş almaya başlayabilir."
      />

      <StorePublishPanel initial={{ store: state.store, checks: state.checks, allReady: state.allReady }} />
    </div>
  );
}
