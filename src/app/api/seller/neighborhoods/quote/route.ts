import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { calculatePrice, getActiveAreaCount, type BillingInterval } from "@/lib/neighborhood-billing";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) return NextResponse.json({ error: "Bu işlem için kuruyemişçi hesabı gerekir." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { billingInterval?: unknown; newAreas?: unknown } | null;
  const billingInterval = body?.billingInterval;
  if (billingInterval !== "MONTH" && billingInterval !== "YEAR") {
    return NextResponse.json({ error: "Geçersiz ödeme periyodu." }, { status: 400 });
  }
  const newAreas = typeof body?.newAreas === "number" && Number.isInteger(body.newAreas) && body.newAreas >= 1 && body.newAreas <= 50
    ? body.newAreas
    : 1;

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza bulunamadı." }, { status: 404 });

  const admin = createSupabaseAdminClient();
  const activeCount = await getActiveAreaCount(admin, store.id);
  const totalAreasAfter = activeCount + newAreas;

  try {
    const quote = await calculatePrice(admin, newAreas, totalAreasAfter, billingInterval as BillingInterval);
    return NextResponse.json({ currentActiveAreas: activeCount, totalAreasAfter, ...quote });
  } catch {
    return NextResponse.json({ error: "Fiyat hesaplanamadı." }, { status: 500 });
  }
}
