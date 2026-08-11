import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
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
