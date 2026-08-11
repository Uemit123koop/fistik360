import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; fullName?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";

  if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email) || !fullName) {
    return NextResponse.json({ error: "Ad soyad ve geçerli e-posta adresi gerekli." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { full_name: fullName },
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.status === 429 ? "Çok sık kod istendi. Lütfen biraz bekleyin." : "Kayıt kodu gönderilemedi." },
      { status: error.status === 429 ? 429 : 400 },
    );
  }

  return NextResponse.json(
    { ok: true, otpSent: true },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
