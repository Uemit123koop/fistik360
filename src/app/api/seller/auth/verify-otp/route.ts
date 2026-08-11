import { NextResponse } from "next/server";
import { roleToDashboardPath } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { LocationSelection } from "@/lib/location-types";
import { saveSellerPrimaryLocation, validateLocationSelection } from "@/lib/turkiye-locations";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; token?: unknown; location?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(token)) {
    return NextResponse.json({ error: "E-posta ve 6 haneli kodu kontrol edin." }, { status: 400 });
  }

  let location: LocationSelection | null = null;
  if (body?.location && typeof body.location === "object") {
    try {
      location = await validateLocationSelection(body.location as LocationSelection);
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
  if (intent?.seller_type === "NUT_STORE" && !location) {
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
  if (role === "NUT_STORE" && !location) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Kuruyemişçi hesabı için ana mahalle seçimi zorunludur." }, { status: 400 });
  }

  if (role === "NUT_STORE" && location) {
    try {
      await saveSellerPrimaryLocation(admin, data.user.id, location);
    } catch {
      return NextResponse.json({
        ok: true,
        role,
        warning: "Hesabın açıldı; ana mahalleni panelden tekrar seçmelisin.",
        redirectTo: "/dashboard/store/profile?onboarding=mahalle",
      });
    }
  }

  return NextResponse.json(
    { ok: true, role, redirectTo: roleToDashboardPath(role) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
