import { NextResponse } from "next/server";
import { normalizeTurkishPhone } from "@/lib/phone";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: unknown; token?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizeTurkishPhone(body.phone) : null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!phone || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "Telefon ve 6 haneli kodu kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error || !data.user) {
    return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "CUSTOMER") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Bu telefon numarası bir müşteri hesabına ait değil." }, { status: 403 });
  }

  return NextResponse.json(
    { ok: true, fullName: profile.full_name },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
