import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { slugifyBrand } from "@/lib/partner";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request, context: RouteContext<"/api/admin/partner-applications/[id]/action">) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { action?: unknown; note?: unknown; slug?: unknown; commissionRate?: unknown; fulfillmentType?: unknown; partnerLevel?: unknown; contractStartDate?: unknown } | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const note = typeof body?.note === "string" ? body.note.trim() || null : null;
  const admin = createSupabaseAdminClient();

  if (action === "approve") {
    const slug = slugifyBrand(typeof body?.slug === "string" ? body.slug : "");
    const commissionRate = body?.commissionRate === "" || body?.commissionRate == null ? null : Number(body.commissionRate);
    const fulfillmentType = body?.fulfillmentType === "FISTIK360" ? "FISTIK360" : "PARTNER";
    const partnerLevel = ["STANDARD", "SELECT", "PREMIUM"].includes(String(body?.partnerLevel)) ? String(body?.partnerLevel) : "STANDARD";
    const contractStartDate = typeof body?.contractStartDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.contractStartDate) ? body.contractStartDate : null;
    if (!slug) return NextResponse.json({ error: "Geçerli bir marka slug değeri girin." }, { status: 400 });
    if (commissionRate !== null && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)) return NextResponse.json({ error: "Komisyon oranı 0–100 arasında olmalı." }, { status: 400 });
    const { data, error } = await admin.rpc("approve_partner_application", {
      p_application_id: id,
      p_admin_profile_id: user.id,
      p_brand_slug: slug,
      p_commission_rate: commissionRate,
      p_fulfillment_type: fulfillmentType,
      p_partner_level: partnerLevel,
      p_contract_start_date: contractStartDate,
      p_admin_note: note,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, partnerId: data });
  }

  const targetStatus = action === "review" ? "UNDER_REVIEW" : action === "reject" ? "REJECTED" : action === "suspend" ? "SUSPENDED" : null;
  if (!targetStatus) return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  const { error } = await admin.rpc("review_partner_application", {
    p_application_id: id,
    p_admin_profile_id: user.id,
    p_status: targetStatus,
    p_admin_note: note,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
