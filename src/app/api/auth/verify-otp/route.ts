import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isUserRole, roleToDashboardPath } from "@/lib/roles";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; token?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "E-posta ve 6 haneli kodu kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Hesap profili doğrulanamadı." }, { status: 403 });
  }

  return NextResponse.json(
    { ok: true, role: profile.role, redirectTo: roleToDashboardPath(profile.role) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
