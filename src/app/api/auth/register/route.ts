import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { email, password, role } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "E-posta ve şifre gerekli" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Kayıt başarısız" }, { status: 400 });
  }

  const allowedRoles = ["ADMIN", "WHOLESALE_SELLER", "NUT_STORE", "CUSTOMER"];
  const safeRole = allowedRoles.includes(role) ? role : "CUSTOMER";

  await supabase.from("profiles").upsert({ id: data.user.id, email, role: safeRole });

  return NextResponse.json({ user: data.user, role: safeRole });
}
