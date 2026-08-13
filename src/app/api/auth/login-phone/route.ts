import { NextResponse } from "next/server";
import { normalizeTurkishPhone } from "@/lib/phone";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizeTurkishPhone(body.phone) : null;

  if (!phone) {
    return NextResponse.json({ error: "Geçerli bir telefon numarası girin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  // Checkout'ta telefon doğrulaması aynı zamanda ilk kayıt akışı — misafirin
  // hesabı yoksa burada oluşur (test aşamasında supabase/config.toml
  // [auth.sms.test_otp] devrede, gerçek SMS gönderilmez).
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return NextResponse.json(
      { error: error.status === 429 ? "Çok sık kod istendi. Lütfen biraz bekleyin." : "Doğrulama kodu gönderilemedi." },
      { status: error.status === 429 ? 429 : 400 },
    );
  }

  return NextResponse.json(
    { ok: true, otpSent: true, phone },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
