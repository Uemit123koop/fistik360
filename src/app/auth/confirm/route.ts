import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const emailOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function safeNextPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}

function confirmationErrorRedirect(request: NextRequest) {
  const url = new URL("/giris", request.url);
  url.searchParams.set("error", "confirmation");
  return NextResponse.redirect(url, 303);
}

// Satıcı kaydı yalnız /api/seller/auth/verify-otp üzerinden tamamlanır: rol ataması
// (`complete_seller_registration`) ve ana mahalle kaydı orada yapılır. Kullanıcı
// e-postadaki BAĞLANTIYA tıklayıp buraya düşerse oturum açılır ama o adımlar hiç
// çalışmaz; kişi rolsüz biçimde müşteri paneline düşer ve neden mağazası olmadığını
// anlamaz. Bekleyen bir satıcı kaydı varsa kayıt formuna geri gönderilir.
async function pendingSellerRegistration(email: string | undefined) {
  if (!email) return false;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("seller_registration_intents")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("status", "PENDING_OTP")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch {
    // Service-role anahtarı yoksa akışı bozma; normal yönlendirmeye devam et.
    return false;
  }
}

async function successRedirect(request: NextRequest, next: string, email?: string) {
  if (await pendingSellerRegistration(email)) {
    const url = new URL("/magaza-ac", request.url);
    url.searchParams.set("error", "seller-otp-required");
    url.hash = "onboarding";
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(new URL(next, request.url), 303);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  if (tokenHash && type && emailOtpTypes.has(type as EmailOtpType)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return successRedirect(request, next, data.user?.email);
    }

    return confirmationErrorRedirect(request);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return successRedirect(request, next, data.user?.email);
    }
  }

  return confirmationErrorRedirect(request);
}
