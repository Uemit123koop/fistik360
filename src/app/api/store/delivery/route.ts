import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const IBAN_PATTERN = /^TR\d{24}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MONEY = 9_999_999_999.99;

type JsonBody = Record<string, unknown>;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function normalizeIban(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : "";
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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

async function getStoreContext() {
  const user = await getServerUser();
  if (!user) return { response: errorResponse("Önce giriş yapın.", 401) };
  if (user.role !== "NUT_STORE") {
    return { response: errorResponse("Bu alan yalnız kuruyemişçi hesaplarına açıktır.", 403) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { response: errorResponse("Mağaza bilgisi okunamadı.", 500) };
  if (!store) return { response: errorResponse("Bu hesaba bağlı mağaza bulunamadı.", 404) };
  return { supabase, store };
}

async function getBankTransferWarning(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeId: string,
) {
  const [{ data: payment }, { data: defaultAccount }] = await Promise.all([
    supabase.from("store_payment_settings").select("bank_transfer").eq("store_id", storeId).maybeSingle(),
    supabase
      .from("store_bank_accounts")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  return payment?.bank_transfer && !defaultAccount
    ? "Havale açık; sipariş alabilmek için aktif bir varsayılan banka hesabı belirleyin."
    : null;
}

export async function GET() {
  const context = await getStoreContext();
  if ("response" in context) return context.response;
  const { supabase, store } = context;

  const [deliveryResult, paymentResult, accountsResult] = await Promise.all([
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
      .from("store_bank_accounts")
      .select("id, account_holder_name, iban, is_default, is_active, created_at")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (deliveryResult.error || paymentResult.error || accountsResult.error) {
    return errorResponse("Teslimat ve ödeme ayarları okunamadı.", 500);
  }
  if (!deliveryResult.data || !paymentResult.data) {
    return errorResponse("Mağaza ayarları henüz oluşturulmamış.", 404);
  }

  return NextResponse.json({
    storeName: store.name,
    delivery: {
      minimumOrderAmount: Number(deliveryResult.data.minimum_order_amount),
      standardDeliveryFee: Number(deliveryResult.data.standard_delivery_fee),
      freeDeliveryThreshold:
        deliveryResult.data.free_delivery_threshold === null
          ? null
          : Number(deliveryResult.data.free_delivery_threshold),
    },
    payment: {
      cashOnDelivery: paymentResult.data.cash_on_delivery,
      cardOnDelivery: paymentResult.data.card_on_delivery,
      bankTransfer: paymentResult.data.bank_transfer,
    },
    bankAccounts: (accountsResult.data ?? []).map((account) => ({
      id: account.id,
      accountHolderName: account.account_holder_name,
      iban: account.iban,
      isDefault: account.is_default,
      isActive: account.is_active,
      createdAt: account.created_at,
    })),
  });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);
  const context = await getStoreContext();
  if ("response" in context) return context.response;
  const { supabase, store } = context;
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);

  if (body.section === "delivery") {
    const minimumOrderAmount = parseMoney(body.minimumOrderAmount);
    const standardDeliveryFee = parseMoney(body.standardDeliveryFee);
    const freeDeliveryThreshold =
      body.freeDeliveryThreshold === null || body.freeDeliveryThreshold === ""
        ? null
        : parseMoney(body.freeDeliveryThreshold);

    if (minimumOrderAmount === null) return errorResponse("Minimum sepet tutarını kontrol edin.", 400);
    if (standardDeliveryFee === null) return errorResponse("Teslimat ücretini kontrol edin.", 400);
    if (body.freeDeliveryThreshold !== null && body.freeDeliveryThreshold !== "" && freeDeliveryThreshold === null) {
      return errorResponse("Ücretsiz teslimat eşiğini kontrol edin.", 400);
    }
    if (freeDeliveryThreshold !== null && freeDeliveryThreshold < minimumOrderAmount) {
      return errorResponse("Ücretsiz teslimat eşiği minimum sepet tutarından düşük olamaz.", 400);
    }

    const { data, error } = await supabase
      .from("store_delivery_settings")
      .update({
        minimum_order_amount: minimumOrderAmount,
        standard_delivery_fee: standardDeliveryFee,
        free_delivery_threshold: freeDeliveryThreshold,
      })
      .eq("store_id", store.id)
      .select("store_id")
      .maybeSingle();

    if (error) return errorResponse("Teslimat ayarları kaydedilemedi.", 400);
    if (!data) return errorResponse("Teslimat ayarlarına erişilemiyor.", 404);
    return NextResponse.json({ ok: true });
  }

  if (body.section === "payment") {
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

    const { data, error } = await supabase
      .from("store_payment_settings")
      .update({
        cash_on_delivery: body.cashOnDelivery,
        card_on_delivery: body.cardOnDelivery,
        bank_transfer: body.bankTransfer,
      })
      .eq("store_id", store.id)
      .select("store_id")
      .maybeSingle();

    if (error) return errorResponse("Ödeme yöntemleri kaydedilemedi.", 400);
    if (!data) return errorResponse("Ödeme ayarlarına erişilemiyor.", 404);
    const warning = await getBankTransferWarning(supabase, store.id);
    return NextResponse.json({ ok: true, warning });
  }

  if (body.section === "defaultBankAccount") {
    const accountId = typeof body.accountId === "string" ? body.accountId : "";
    if (!UUID_PATTERN.test(accountId)) return errorResponse("Geçersiz banka hesabı.", 400);

    const [{ data: target }, { data: currentDefault }] = await Promise.all([
      supabase
        .from("store_bank_accounts")
        .select("id, is_active, is_default")
        .eq("id", accountId)
        .eq("store_id", store.id)
        .maybeSingle(),
      supabase
        .from("store_bank_accounts")
        .select("id")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .eq("is_default", true)
        .maybeSingle(),
    ]);

    if (!target || !target.is_active) return errorResponse("Aktif banka hesabı bulunamadı.", 404);
    if (target.is_default) return NextResponse.json({ ok: true });

    if (currentDefault) {
      const { error } = await supabase
        .from("store_bank_accounts")
        .update({ is_default: false })
        .eq("id", currentDefault.id)
        .eq("store_id", store.id);
      if (error) return errorResponse("Varsayılan hesap değiştirilemedi.", 400);
    }

    const { data, error } = await supabase
      .from("store_bank_accounts")
      .update({ is_default: true })
      .eq("id", accountId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      if (currentDefault) {
        await supabase
          .from("store_bank_accounts")
          .update({ is_default: true })
          .eq("id", currentDefault.id)
          .eq("store_id", store.id);
      }
      return errorResponse("Varsayılan hesap değiştirilemedi.", 400);
    }

    return NextResponse.json({ ok: true });
  }

  return errorResponse("Desteklenmeyen ayar bölümü.", 400);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);
  const context = await getStoreContext();
  if ("response" in context) return context.response;
  const { supabase, store } = context;
  const body = await readBody(request);
  if (!body) return errorResponse("Geçersiz istek.", 400);

  const accountHolderName = cleanText(body.accountHolderName, 120);
  const iban = normalizeIban(body.iban);
  if (accountHolderName.length < 2) return errorResponse("Hesap sahibinin adını girin.", 400);
  if (!IBAN_PATTERN.test(iban)) return errorResponse("IBAN, TR ile başlayan 26 karakterden oluşmalıdır.", 400);

  const [duplicateResult, defaultResult, activeResult] = await Promise.all([
    supabase
      .from("store_bank_accounts")
      .select("id, is_active")
      .eq("store_id", store.id)
      .eq("iban", iban)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("store_bank_accounts")
      .select("id")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle(),
    supabase
      .from("store_bank_accounts")
      .select("id")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (duplicateResult.error || defaultResult.error || activeResult.error) return errorResponse("Banka hesapları kontrol edilemedi.", 500);
  const duplicate = duplicateResult.data;
  const currentDefault = defaultResult.data;
  if (duplicate?.is_active) return errorResponse("Bu IBAN mağazanıza daha önce eklenmiş.", 409);
  // Mağaza başına tek aktif hesap tutulur — farklı bir IBAN eklenmeden önce
  // mevcut hesap silinmeli (bkz. DELETE). Çift hesap oluşmasını burada engelliyoruz.
  if (activeResult.data && activeResult.data.id !== duplicate?.id) {
    return errorResponse("Zaten aktif bir banka hesabınız var. Yeni hesap eklemeden önce mevcut hesabı silin.", 409);
  }
  const makeDefault = body.makeDefault === true || !currentDefault;

  if (makeDefault && currentDefault) {
    const { error } = await supabase
      .from("store_bank_accounts")
      .update({ is_default: false })
      .eq("id", currentDefault.id)
      .eq("store_id", store.id);
    if (error) return errorResponse("Banka hesabı eklenemedi.", 400);
  }

  const accountValues = {
    account_holder_name: accountHolderName,
    iban,
    is_default: makeDefault,
    is_active: true,
  };
  const mutation = duplicate
    ? supabase
        .from("store_bank_accounts")
        .update(accountValues)
        .eq("id", duplicate.id)
        .eq("store_id", store.id)
        .select("id")
        .maybeSingle()
    : supabase
        .from("store_bank_accounts")
        .insert({ store_id: store.id, ...accountValues })
        .select("id")
        .single();
  const { data, error } = await mutation;

  if (error || !data) {
    if (makeDefault && currentDefault) {
      await supabase
        .from("store_bank_accounts")
        .update({ is_default: true })
        .eq("id", currentDefault.id)
        .eq("store_id", store.id);
    }
    return errorResponse("Banka hesabı eklenemedi.", 400);
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Geçersiz istek kaynağı.", 403);
  const context = await getStoreContext();
  if ("response" in context) return context.response;
  const { supabase, store } = context;
  const body = await readBody(request);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  if (!UUID_PATTERN.test(accountId)) return errorResponse("Geçersiz banka hesabı.", 400);

  const { data, error } = await supabase
    .from("store_bank_accounts")
    .update({ is_active: false, is_default: false })
    .eq("id", accountId)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) return errorResponse("Banka hesabı silinemedi.", 400);
  if (!data) return errorResponse("Banka hesabı bulunamadı.", 404);
  const warning = await getBankTransferWarning(supabase, store.id);
  return NextResponse.json({ ok: true, warning });
}
