import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const allowedEmail = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    return NextResponse.json({ error: "Admin girişi yapılandırılmadı." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; token?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (email !== allowedEmail || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "E-posta ve 6 haneli kodu kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  // Bu tek e-posta için rolü daima ADMIN'e sabitle. block_profile_role_updates
  // tetikleyicisi yalnız oturum bağlamlı (auth.uid() dolu) istemci güncellemelerini
  // engelliyor; service-role istemcide auth.uid() boş olduğundan bu güncelleme geçer.
  const admin = createSupabaseAdminClient();
  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "ADMIN" })
    .eq("id", data.user.id)
    .neq("role", "ADMIN");

  if (promoteError) {
    return NextResponse.json({ error: "Admin rolü atanamadı." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, redirectTo: "/dashboard/admin" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
