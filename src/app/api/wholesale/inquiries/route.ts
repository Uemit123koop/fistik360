import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") {
    return NextResponse.json({ error: "Alım talebini yalnız kuruyemişçi hesapları gönderebilir." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { productId?: unknown; message?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(productId) || message.length < 10) {
    return NextResponse.json({ error: "Ürün ve alım notunu kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("wholesale_products")
    .select("id")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Aktif toptan ürün bulunamadı." }, { status: 404 });

  const { error } = await supabase.from("wholesale_inquiries").insert({
    wholesale_product_id: productId,
    requester_id: user.id,
    message,
  });
  if (error) return NextResponse.json({ error: "Alım talebi kaydedilemedi." }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

