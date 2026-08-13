import { NextResponse } from "next/server";
import { getIyzicoCredentials, initializeCheckoutForm, IyzicoNotConfiguredError, type IyzicoBuyer } from "@/lib/iyzico";
import type { LocationSelection } from "@/lib/location-types";
import { calculatePrice, markPurchaseFailed, type BillingInterval } from "@/lib/neighborhood-billing";
import { roleToDashboardPath } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { saveSellerPrimaryLocation, upsertNeighborhoodRecord, validateLocationSelection } from "@/lib/turkiye-locations";

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
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    token?: unknown;
    locations?: unknown;
    billingPlan?: unknown;
    billingAddress?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "E-posta ve 6 haneli kodu kontrol edin." }, { status: 400 });
  }

  const rawLocations = Array.isArray(body?.locations) ? body.locations : [];
  // Ücretsiz plan: billingPlan gönderilmez, tam olarak 1 mahalle beklenir (bedava).
  // Aylık/Yıllık: billingPlan gönderilir, seçilen HER mahalle (1 tane olsa bile) ücretlidir.
  const billingPlan = body?.billingPlan === "MONTH" || body?.billingPlan === "YEAR" ? body.billingPlan : null;

  let billingAddress: BillingAddressInput | null = null;
  if (billingPlan) {
    if (rawLocations.length === 0) {
      return NextResponse.json({ error: "En az bir mahalle seçilmelidir." }, { status: 400 });
    }
    billingAddress = readBillingAddress(body?.billingAddress);
    if (!billingAddress) {
      return NextResponse.json({ error: "Fatura adresi ve TC Kimlik No eksik veya geçersiz." }, { status: 400 });
    }
  }

  let locations: LocationSelection[] = [];
  if (rawLocations.length > 0) {
    try {
      locations = await Promise.all(rawLocations.map((raw) => validateLocationSelection(raw as LocationSelection)));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Mahalle seçimi doğrulanamadı." }, { status: 400 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data: intent } = await admin
    .from("seller_registration_intents")
    .select("seller_type")
    .eq("email", email)
    .eq("status", "PENDING_OTP")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (intent?.seller_type === "NUT_STORE" && locations.length === 0) {
    return NextResponse.json({ error: "Kuruyemişçi hesabı için ana mahalle seçimi zorunludur." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const { error: completionError } = await admin.rpc("complete_seller_registration", {
    p_user_id: data.user.id,
  });

  if (completionError) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Satıcı rolü güvenli biçimde atanamadı. Bilgilerinizi kontrol edip yeniden deneyin." },
      { status: 409 },
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !["NUT_STORE", "WHOLESALE_SELLER"].includes(profile.role)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Satıcı hesabı doğrulanamadı." }, { status: 403 });
  }

  const role = profile.role as "NUT_STORE" | "WHOLESALE_SELLER";
  if (role === "NUT_STORE" && locations.length === 0) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Kuruyemişçi hesabı için ana mahalle seçimi zorunludur." }, { status: 400 });
  }

  if (role !== "NUT_STORE" || locations.length === 0) {
    return NextResponse.json(
      { ok: true, role, redirectTo: roleToDashboardPath(role) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // ── Ücretsiz plan: tek mahalle, anında ve bedava aktif ──────────────────────
  if (!billingPlan) {
    try {
      await saveSellerPrimaryLocation(admin, data.user.id, locations[0]);
    } catch {
      return NextResponse.json({
        ok: true,
        role,
        warning: "Hesabın açıldı; ana mahalleni panelden tekrar seçmelisin.",
        redirectTo: "/dashboard/store/profile?onboarding=mahalle",
      });
    }
    return NextResponse.json(
      { ok: true, role, redirectTo: roleToDashboardPath(role) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // ── Aylık/Yıllık plan: TÜM seçilen mahalleler ücretli, ödeme başarılı olmadan
  // hiçbiri aktive edilmez (billingAddress bu noktada garanti dolu, üstte kontrol edildi).
  if (!billingAddress) {
    return NextResponse.json({ error: "Fatura adresi ve TC Kimlik No eksik veya geçersiz." }, { status: 400 });
  }
  const address = billingAddress;

  const { data: store } = await admin.from("stores").select("id, name, phone").eq("owner_id", data.user.id).order("created_at").limit(1).maybeSingle();
  if (!store) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; mağaza kaydı bulunamadı, panelden mahallelerini ekleyebilirsin.",
      redirectTo: roleToDashboardPath(role),
    });
  }
  if (!store.phone) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; mahalleler için önce mağaza profilinden telefon numaranı tamamla.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  const quote = await calculatePrice(admin, locations.length, locations.length, billingPlan as BillingInterval).catch(() => null);
  if (!quote || quote.amount <= 0) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; fiyat hesaplanamadı, mahalleleri panelden ekleyebilirsin.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  const credentials = getIyzicoCredentials();
  if (!credentials) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; ödeme sağlayıcısı şu an devre dışı olduğu için hiçbir mahalle aktif değil. Panelden tekrar deneyebilirsin.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  const billingUpsertError = (
    await admin.from("store_billing_addresses").upsert({
      store_id: store.id,
      contact_name: address.contactName,
      address: address.address,
      district: address.district,
      province: address.province,
      neighborhood: address.neighborhood ?? null,
      postal_code: address.postalCode ?? null,
      identity_number: address.identityNumber,
    })
  ).error;
  if (billingUpsertError) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; fatura adresi kaydedilemedi, mahalleleri panelden ekleyebilirsin.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  let requestedNeighborhoodIds: string[];
  try {
    requestedNeighborhoodIds = await Promise.all(
      locations.map((loc) => upsertNeighborhoodRecord(admin, loc).then((r) => r.id)),
    );
  } catch {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; mahalleler doğrulanamadı, panelden tekrar dene.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  const { data: purchase, error: purchaseError } = await admin
    .from("neighborhood_purchases")
    .insert({
      store_id: store.id,
      requested_neighborhood_ids: requestedNeighborhoodIds,
      location_selections: locations,
      billing_interval: billingPlan,
      total_areas_after: locations.length,
      unit_price: quote.unitPrice,
      discount_rate: quote.discountRate,
      amount: quote.amount,
      status: "PENDING",
    })
    .select("id")
    .single();
  if (purchaseError || !purchase) {
    return NextResponse.json({
      ok: true,
      role,
      warning: "Hesabın açıldı; mahalle siparişi oluşturulamadı, panelden tekrar dene.",
      redirectTo: roleToDashboardPath(role),
    });
  }

  const [firstName, ...rest] = address.contactName.split(" ");
  const buyer: IyzicoBuyer = {
    id: data.user.id,
    name: firstName || address.contactName,
    surname: rest.join(" ") || address.contactName,
    identityNumber: address.identityNumber,
    email,
    gsmNumber: store.phone,
    registrationAddress: address.address,
    city: address.province,
    country: "Turkey",
    zipCode: address.postalCode || "00000",
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
        address: address.address,
        zipCode: address.postalCode || "00000",
        contactName: address.contactName,
        city: address.province,
        country: "Turkey",
      },
      basketItems: [
        {
          id: purchase.id,
          price: quote.amount.toFixed(2),
          name: `Mahalleler (${locations.length} adet) · ${store.name}`,
          category1: "Mahalle Aboneliği",
          itemType: "VIRTUAL",
        },
      ],
    });

    await admin.from("neighborhood_purchases").update({ iyzico_token: checkout.token }).eq("id", purchase.id);

    return NextResponse.json(
      { ok: true, role, redirectTo: checkout.paymentPageUrl, isPayment: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (checkoutError) {
    await markPurchaseFailed(admin, purchase.id);
    const message = checkoutError instanceof IyzicoNotConfiguredError
      ? "Ödeme sağlayıcısı şu an devre dışı."
      : "Ödeme başlatılamadı.";
    return NextResponse.json({
      ok: true,
      role,
      warning: `Hesabın açıldı; ${message.toLowerCase()} Hiçbir mahalle aktif değil, panelden tekrar deneyebilirsin.`,
      redirectTo: roleToDashboardPath(role),
    });
  }
}
