import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// "Uygula": bir mahallenin (source) teslimat + ödeme ayarını, mağazanın diğer
// aktif mahallelerine (target) kopyalar. Kaynağın override'ı yoksa mağaza
// varsayılanı kaynak sayılır. Hedeflerin mevcut override'ı tamamen bu değerlerle
// değiştirilir (merge değil, tam kopya — "tek mahalleyi referans al" mantığı).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);

  const user = await getServerUser();
  if (!user) return errorResponse("Önce giriş yapın.", 401);
  if (user.role !== "NUT_STORE") return errorResponse("Bu alan yalnız kuruyemişçi hesaplarına açıktır.", 403);

  const supabase = await createSupabaseServerClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (storeError) return errorResponse("Mağaza bilgisi okunamadı.", 500);
  if (!store) return errorResponse("Bu hesaba bağlı mağaza bulunamadı.", 404);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const sourceId = typeof body?.sourceNeighborhoodId === "string" ? body.sourceNeighborhoodId : "";
  const targetsRaw = body?.targetNeighborhoodIds;
  if (!UUID_PATTERN.test(sourceId)) return errorResponse("Kaynak mahalleyi seçin.", 400);
  if (targetsRaw !== "all" && !Array.isArray(targetsRaw)) {
    return errorResponse("Hedef mahalleleri seçin.", 400);
  }

  const { data: neighborhoods, error: neighborhoodsError } = await supabase
    .from("store_neighborhoods")
    .select("id")
    .eq("store_id", store.id)
    .eq("is_active", true);
  if (neighborhoodsError) return errorResponse("Mahalleler okunamadı.", 500);

  const allIds = (neighborhoods ?? []).map((n) => n.id as string);
  if (!allIds.includes(sourceId)) return errorResponse("Kaynak mahalle bu mağazaya ait değil.", 404);

  const targetIds =
    targetsRaw === "all"
      ? allIds.filter((id) => id !== sourceId)
      : (targetsRaw as unknown[]).filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id) && allIds.includes(id) && id !== sourceId);

  if (targetIds.length === 0) return errorResponse("Uygulanacak hedef mahalle bulunamadı.", 400);

  const [deliveryResult, paymentResult, overrideResult] = await Promise.all([
    supabase
      .from("store_delivery_settings")
      .select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_payment_settings")
      .select("cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_neighborhood_settings")
      .select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold, cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_neighborhood_id", sourceId)
      .maybeSingle(),
  ]);

  if (deliveryResult.error || paymentResult.error || overrideResult.error) return errorResponse("Kaynak ayarlar okunamadı.", 500);
  if (!deliveryResult.data || !paymentResult.data) return errorResponse("Mağaza ayarları henüz oluşturulmamış.", 404);

  const source = overrideResult.data ?? {
    minimum_order_amount: deliveryResult.data.minimum_order_amount,
    standard_delivery_fee: deliveryResult.data.standard_delivery_fee,
    free_delivery_threshold: deliveryResult.data.free_delivery_threshold,
    cash_on_delivery: paymentResult.data.cash_on_delivery,
    card_on_delivery: paymentResult.data.card_on_delivery,
    bank_transfer: paymentResult.data.bank_transfer,
  };

  const rows = targetIds.map((targetId) => ({
    store_neighborhood_id: targetId,
    minimum_order_amount: source.minimum_order_amount,
    standard_delivery_fee: source.standard_delivery_fee,
    free_delivery_threshold: source.free_delivery_threshold,
    cash_on_delivery: source.cash_on_delivery,
    card_on_delivery: source.card_on_delivery,
    bank_transfer: source.bank_transfer,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase.from("store_neighborhood_settings").upsert(rows);
  if (upsertError) return errorResponse("Ayarlar uygulanamadı.", 400);

  return NextResponse.json({ ok: true, appliedCount: targetIds.length });
}
