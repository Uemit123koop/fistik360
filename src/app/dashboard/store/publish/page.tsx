import { notFound } from "next/navigation";
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
      <div>
        <p className="eyebrow">Canlıya çıkış</p>
        <h1 className="mt-2 text-3xl font-bold">Mağazanı yayına al</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
          Yayın öncesi zorunlu adımları kontrol edin. Her şey hazır olduğunda mağazanız seçtiğiniz mahallede görünür ve sipariş almaya başlayabilir.
        </p>
      </div>

      <StorePublishPanel initial={{ store: state.store, checks: state.checks, allReady: state.allReady }} />
    </div>
  );
}
