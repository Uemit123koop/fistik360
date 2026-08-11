import "server-only";

import { getServerUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function getActivePartner() {
  const user = await getServerUser();
  if (!user || user.role !== "BRAND_PARTNER") return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("partners")
    .select("id, profile_id, application_id, status, partner_level, fulfillment_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !data || data.status !== "ACTIVE") return null;
  return { user, partner: data };
}
