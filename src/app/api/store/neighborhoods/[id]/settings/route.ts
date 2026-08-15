import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_MONEY = 9_999_999_999.99;

type JsonBody = Record<string, unknown>;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parseMoney(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  if (normalized === "") return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_MONEY) return null;
  return Math.round(parsed * 100) / 100;
}

async function readBody(request: Request): Promise<JsonBody | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as JsonBody) : null;
}

async function getContext(neighborhoodId: string) {
  const user = await getServerUser();
  if (!user) return { response: errorResponse("Önce giriş yapın.", 401) };
  if (user.role !== "NUT_STORE") {
    return { response: errorResponse("Bu alan yalnız kuruyemişçi hesaplarına açıktır.", 403) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (storeError) return { response: errorResponse("Mağaza bilgisi okunamadı.", 500) };
  if (!store) return { response: errorResponse("Bu hesaba bağlı mağaza bulunamadı.", 404) };

  const { data: neighborhood, error: neighborhoodError } = await supabase
    .from("store_neighborhoods")
    .select("id, store_id, neighborhood, is_active")
    .eq("id", neighborhoodId)
    .eq("store_id", store.id)
    .maybeSingle();
  if (neighborhoodError) return { response: errorResponse("Mahalle bilgisi okunamadı.", 500) };
  if (!neighborhood) return { response: errorResponse("Mahalle bulunamadı.", 404) };

  return { supabase, store, neighborhood };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getContext(id);
  if ("response" in context) return context.response;
  const { supabase, store, neighborhood } = context;

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
      .eq("store_neighborhood_id", neighborhood.id)
      .maybeSingle(),
  ]);

  if (deliveryResult.error || paymentResult.error || overrideResult.error) {
    return errorResponse("Ayarlar okunamadı.", 500);
  }
  if (!deliveryResult.data || !paymentResult.data) {
    return errorResponse("Mağaza ayarları henüz oluşturulmamış.", 404);
  }

  const override = overrideResult.data;
  const effective = override ?? {
    minimum_order_amount: deliveryResult.data.minimum_order_amount,
    standard_delivery_fee: deliveryResult.data.standard_delivery_fee,
    free_delivery_threshold: deliveryResult.data.free_delivery_threshold,
    cash_on_delivery: paymentResult.data.cash_on_delivery,
    card_on_delivery: paymentResult.data.card_on_delivery,
    bank_transfer: paymentResult.data.bank_transfer,
  };

  return NextResponse.json({
    neighborhoodName: neighborhood.neighborhood,
    hasOverride: Boolean(override),
    delivery: {
      minimumOrderAmount: Number(effective.minimum_order_amount),
      standardDeliveryFee: Number(effective.standard_delivery_fee),
      freeDeliveryThreshold: effective.free_delivery_threshold === null ? null : Number(effective.free_delivery_threshold),
    },
    payment: {
      cashOnDelivery: effective.cash_on_delivery,
      cardOnDelivery: effective.card_on_delivery,
      bankTransfer: effective.bank_transfer,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);
  const { id } = await params;
  const context = await getContext(id);
  if ("response" in context) return context.response;
  const { supabase, neighborhood } = context;
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);

  const minimumOrderAmount = parseMoney(body.minimumOrderAmount);
  const standardDeliveryFee = parseMoney(body.standardDeliveryFee);
  const freeDeliveryThreshold =
    body.freeDeliveryThreshold === null || body.freeDeliveryThreshold === "" ? null : parseMoney(body.freeDeliveryThreshold);

  if (minimumOrderAmount === null) return errorResponse("Minimum sepet tutarını kontrol edin.", 400);
  if (standardDeliveryFee === null) return errorResponse("Teslimat ücretini kontrol edin.", 400);
  if (body.freeDeliveryThreshold !== null && body.freeDeliveryThreshold !== "" && freeDeliveryThreshold === null) {
    return errorResponse("Ücretsiz teslimat eşiğini kontrol edin.", 400);
  }
  if (freeDeliveryThreshold !== null && freeDeliveryThreshold < minimumOrderAmount) {
    return errorResponse("Ücretsiz teslimat eşiği minimum sepet tutarından düşük olamaz.", 400);
  }
  if (
    typeof body.cashOnDelivery !== "boolean" ||
    typeof body.cardOnDelivery !== "boolean" ||
    typeof body.bankTransfer !== "boolean"
  ) {
    return errorResponse("Ödeme yöntemi seçimini kontrol edin.", 400);
  }
  if (!body.cashOnDelivery && !body.cardOnDelivery && !body.bankTransfer) {
    return errorResponse("En az bir ödeme yöntemi açık olmalıdır.", 400);
  }

  const { error } = await supabase.from("store_neighborhood_settings").upsert({
    store_neighborhood_id: neighborhood.id,
    minimum_order_amount: minimumOrderAmount,
    standard_delivery_fee: standardDeliveryFee,
    free_delivery_threshold: freeDeliveryThreshold,
    cash_on_delivery: body.cashOnDelivery,
    card_on_delivery: body.cardOnDelivery,
    bank_transfer: body.bankTransfer,
    updated_at: new Date().toISOString(),
  });

  if (error) return errorResponse("Mahalle ayarları kaydedilemedi.", 400);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);
  const { id } = await params;
  const context = await getContext(id);
  if ("response" in context) return context.response;
  const { supabase, neighborhood } = context;

  const { error } = await supabase
    .from("store_neighborhood_settings")
    .delete()
    .eq("store_neighborhood_id", neighborhood.id);

  if (error) return errorResponse("Mahalle ayarı sıfırlanamadı.", 400);
  return NextResponse.json({ ok: true });
}
