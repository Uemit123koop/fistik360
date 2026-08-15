import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// /admin girişi genel /giriş akışından ayrı ve kasıtlı olarak tek bir e-postaya
// kilitli: sadece ADMIN_LOGIN_EMAIL eşleşirse kod gönderilir, başka hiçbir
// hesap (ADMIN rolünde olsa bile) buradan giriş deneyemez.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const allowedEmail = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    return NextResponse.json({ error: "Admin girişi yapılandırılmadı." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }
  if (email !== allowedEmail) {
    return NextResponse.json({ error: "Bu e-posta ile giriş yapılamaz." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return NextResponse.json(
      { error: error.status === 429 ? "Çok sık kod istendi. Lütfen biraz bekleyin." : "Giriş kodu gönderilemedi." },
      { status: error.status === 429 ? 429 : 400 },
    );
  }

  return NextResponse.json(
    { ok: true, otpSent: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
