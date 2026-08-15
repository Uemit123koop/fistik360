import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import type { LocationSelection } from "@/lib/location-types";
import { calculatePrice, getActiveAreaCount, type BillingInterval } from "@/lib/neighborhood-billing";
import { getIyzicoCredentials, initializeCheckoutForm, IyzicoNotConfiguredError, type IyzicoBuyer } from "@/lib/iyzico";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { upsertNeighborhoodRecord, validateLocationSelection } from "@/lib/turkiye-locations";

interface BillingAddressInput {
  contactName: string;
  address: string;
  district: string;
  province: string;
  neighborhood?: string;
  postalCode?: string;
  identityNumber: string;
}

function readBillingAddress(value: unknown): BillingAddressInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const contactName = typeof v.contactName === "string" ? v.contactName.trim() : "";
  const address = typeof v.address === "string" ? v.address.trim() : "";
  const district = typeof v.district === "string" ? v.district.trim() : "";
  const province = typeof v.province === "string" ? v.province.trim() : "";
  const neighborhood = typeof v.neighborhood === "string" ? v.neighborhood.trim() : "";
  const postalCode = typeof v.postalCode === "string" ? v.postalCode.trim() : "";
  const identityNumber = typeof v.identityNumber === "string" ? v.identityNumber.replace(/\D/g, "") : "";
  // Vergi No (10 hane) veya TC Kimlik No (11 hane) kabul edilir.
  if (!contactName || !address || !district || !province || !/^\d{10}$|^\d{11}$/.test(identityNumber)) return null;
  return { contactName, address, district, province, neighborhood: neighborhood || undefined, postalCode: postalCode || undefined, identityNumber };
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  // Anahtarlar tanımlı değilse hiçbir satır/upsert oluşturmadan erken çık.
  if (!getIyzicoCredentials()) {
    return NextResponse.json({ error: "İyzico ödeme sağlayıcısı henüz yapılandırılmadı." }, { status: 503 });
  }

  const user = await requireRole(["NUT_STORE"]);
  if (!user) return NextResponse.json({ error: "Bu işlem için kuruyemişçi hesabı gerekir." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const billingInterval = body?.billingInterval;
  if (billingInterval !== "MONTH" && billingInterval !== "YEAR") {
    return NextResponse.json({ error: "Geçersiz ödeme periyodu." }, { status: 400 });
  }
  const billingAddress = readBillingAddress(body?.billingAddress);
  if (!billingAddress) {
    return NextResponse.json({ error: "Fatura adresi ve TC Kimlik No eksik veya geçersiz." }, { status: 400 });
  }
  const rawSelections = Array.isArray(body?.locationSelections)
    ? body.locationSelections
    : body?.locationSelection && typeof body.locationSelection === "object"
      ? [body.locationSelection]
      : [];
  if (rawSelections.length === 0) {
    return NextResponse.json({ error: "En az bir mahalle seç." }, { status: 400 });
  }
  if (rawSelections.length > 50) {
    return NextResponse.json({ error: "Tek seferde en fazla 50 mahalle eklenebilir." }, { status: 400 });
  }

  let selections: LocationSelection[];
  try {
    selections = await Promise.all(rawSelections.map((raw) => validateLocationSelection(raw as LocationSelection)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mahalle seçimi doğrulanamadı." }, { status: 400 });
  }
  const uniqueSettlementIds = new Set(selections.map((s) => s.settlementId));
  if (uniqueSettlementIds.size !== selections.length) {
    return NextResponse.json({ error: "Aynı mahalle listede birden fazla kez var." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, phone")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza bulunamadı." }, { status: 404 });
  if (!store.phone) {
    return NextResponse.json({ error: "Ödemeye devam etmeden önce mağaza profilinden bir telefon numarası ekle." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Fatura adresini kaydet (kendi RLS'i sahibi için insert/update'e izin veriyor).
  const { error: billingUpsertError } = await supabase.from("store_billing_addresses").upsert({
    store_id: store.id,
    contact_name: billingAddress.contactName,
    address: billingAddress.address,
    district: billingAddress.district,
    province: billingAddress.province,
    neighborhood: billingAddress.neighborhood ?? null,
    postal_code: billingAddress.postalCode ?? null,
    identity_number: billingAddress.identityNumber,
  });
  if (billingUpsertError) {
    return NextResponse.json({ error: "Fatura adresi kaydedilemedi." }, { status: 500 });
  }

  const neighborhoodIds: string[] = [];
  for (const selection of selections) {
    const { id: neighborhoodId } = await upsertNeighborhoodRecord(admin, selection).catch(() => ({ id: null }));
    if (!neighborhoodId) return NextResponse.json({ error: `${selection.settlementName} doğrulanamadı.` }, { status: 400 });

    const { data: existingArea } = await admin
      .from("store_neighborhoods")
      .select("id")
      .eq("store_id", store.id)
      .eq("neighborhood_id", neighborhoodId)
      .eq("is_active", true)
      .maybeSingle();
    if (existingArea) {
      return NextResponse.json({ error: `${selection.settlementName} zaten aktif.` }, { status: 409 });
    }
    neighborhoodIds.push(neighborhoodId);
  }

  const activeCount = await getActiveAreaCount(admin, store.id);
  const totalAreasAfter = activeCount + selections.length;
  const quote = await calculatePrice(admin, selections.length, totalAreasAfter, billingInterval as BillingInterval);
  if (quote.amount <= 0) {
    return NextResponse.json({ error: "Hesaplanan tutar geçersiz." }, { status: 500 });
  }

  const { data: purchase, error: purchaseError } = await admin
    .from("neighborhood_purchases")
    .insert({
      store_id: store.id,
      requested_neighborhood_ids: neighborhoodIds,
      billing_interval: billingInterval,
      total_areas_after: totalAreasAfter,
      unit_price: quote.unitPrice,
      discount_rate: quote.discountRate,
      amount: quote.amount,
      location_selections: selections,
      status: "PENDING",
    })
    .select("id")
    .single();
  if (purchaseError || !purchase) {
    return NextResponse.json({ error: "Sipariş kaydı oluşturulamadı." }, { status: 500 });
  }

  const [firstName, ...rest] = billingAddress.contactName.split(" ");
  const buyer: IyzicoBuyer = {
    id: user.id,
    name: firstName || billingAddress.contactName,
    surname: rest.join(" ") || billingAddress.contactName,
    identityNumber: billingAddress.identityNumber,
    email: user.email,
    gsmNumber: store.phone,
    registrationAddress: billingAddress.address,
    city: billingAddress.province,
    country: "Turkey",
    zipCode: billingAddress.postalCode || "00000",
    ip: clientIp(request),
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const checkout = await initializeCheckoutForm({
      conversationId: purchase.id,
      price: quote.amount.toFixed(2),
      paidPrice: quote.amount.toFixed(2),
      basketId: purchase.id,
      callbackUrl: `${appUrl}/api/seller/neighborhoods/callback`,
      buyer,
      billingAddress: {
        address: billingAddress.address,
        zipCode: billingAddress.postalCode || "00000",
        contactName: billingAddress.contactName,
        city: billingAddress.province,
        country: "Turkey",
      },
      basketItems: [
        {
          id: purchase.id,
          price: quote.amount.toFixed(2),
          name: `Ek mahalle (${selections.length} adet) · ${store.name}`,
          category1: "Mahalle Aboneliği",
          itemType: "VIRTUAL",
        },
      ],
    });

    await admin.from("neighborhood_purchases").update({ iyzico_token: checkout.token }).eq("id", purchase.id);

    return NextResponse.json({ paymentPageUrl: checkout.paymentPageUrl });
  } catch (error) {
    await admin.from("neighborhood_purchases").update({ status: "FAILED", completed_at: new Date().toISOString() }).eq("id", purchase.id);
    const message = error instanceof IyzicoNotConfiguredError
      ? "İyzico ödeme sağlayıcısı henüz yapılandırılmadı."
      : "Ödeme başlatılamadı.";
    return NextResponse.json({ error: message }, { status: error instanceof IyzicoNotConfiguredError ? 503 : 502 });
  }
}
