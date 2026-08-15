import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  isSellerType,
  SELLER_AGREEMENT_VERSIONS,
  WHOLESALE_CATEGORIES,
} from "@/lib/seller-registration";

interface RequestBody {
  sellerType?: unknown;
  businessName?: unknown;
  authorizedFullName?: unknown;
  email?: unknown;
  phone?: unknown;
  categories?: unknown;
  kvkkAccepted?: unknown;
  privacyAccepted?: unknown;
  invoiceReceiptDeclared?: unknown;
}

function textValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const sellerType = body?.sellerType;
  const businessName = textValue(body?.businessName, 120);
  const authorizedFullName = textValue(body?.authorizedFullName, 120);
  const email = textValue(body?.email, 254).toLowerCase();
  const phone = textValue(body?.phone, 20);
  const categories = Array.isArray(body?.categories)
    ? [...new Set(body.categories.filter(
        (item): item is (typeof WHOLESALE_CATEGORIES)[number] =>
          typeof item === "string" && WHOLESALE_CATEGORIES.includes(item as (typeof WHOLESALE_CATEGORIES)[number]),
      ))]
    : [];

  if (!isSellerType(sellerType)) {
    return NextResponse.json({ error: "Kuruyemişçi veya toptancı hesabını seçin." }, { status: 400 });
  }
  if (!businessName || !authorizedFullName) {
    return NextResponse.json({ error: "İşletme ve yetkili bilgilerini tamamlayın." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Geçerli bir telefon numarası girin." }, { status: 400 });
  }
  if (sellerType === "WHOLESALE_SELLER" && categories.length === 0) {
    return NextResponse.json({ error: "En az bir toptan ürün kategorisi seçin." }, { status: 400 });
  }
  if (body?.kvkkAccepted !== true || body?.privacyAccepted !== true || body?.invoiceReceiptDeclared !== true) {
    return NextResponse.json({ error: "Tüm onay ve ticari beyanlar zorunludur." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("seller_registration_intents")
    .select("id, status, seller_type, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Satıcı kaydı şu anda başlatılamadı." }, { status: 503 });
  }
  if (existing?.status === "ROLE_ASSIGNED") {
    // ROLE_ASSIGNED tek başına kanıt değil: bağlı hesap sonradan silinmişse
    // auth_user_id, FK'nin ON DELETE SET NULL'ıyla boşa düşer ama bu satır
    // damgalı kalır — hesap gerçekten hâlâ var mı diye kontrol etmeden bu
    // e-postayı sonsuza dek kilitli tutmayalım.
    const { data: stillLinkedProfile } = existing.auth_user_id
      ? await admin.from("profiles").select("id").eq("id", existing.auth_user_id).maybeSingle()
      : { data: null };
    if (stillLinkedProfile) {
      return NextResponse.json(
        { error: "Bu e-posta ile satıcı hesabı zaten oluşturulmuş. Giriş sayfasından devam edin." },
        { status: 409 },
      );
    }
  }

  const acceptedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const intentPayload = {
    email,
    seller_type: sellerType,
    business_name: businessName,
    authorized_full_name: authorizedFullName,
    phone,
    kvkk_version: SELLER_AGREEMENT_VERSIONS.kvkk,
    kvkk_accepted_at: acceptedAt,
    privacy_version: SELLER_AGREEMENT_VERSIONS.privacy,
    privacy_accepted_at: acceptedAt,
    invoice_receipt_declared_at: acceptedAt,
    product_categories: sellerType === "WHOLESALE_SELLER" ? categories : [],
    status: "PENDING_OTP",
    auth_user_id: null,
    expires_at: expiresAt,
    email_verified_at: null,
    role_assigned_at: null,
  };

  const intentResult = existing
    ? await admin.from("seller_registration_intents").update(intentPayload).eq("id", existing.id)
    : await admin.from("seller_registration_intents").insert(intentPayload);

  if (intentResult.error) {
    return NextResponse.json({ error: "Satıcı bilgileri güvenli biçimde kaydedilemedi." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (otpError) {
    return NextResponse.json(
      { error: "Kod şu anda gönderilemedi. Biraz bekleyip yeniden deneyin." },
      { status: otpError.status === 429 ? 429 : 400 },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

