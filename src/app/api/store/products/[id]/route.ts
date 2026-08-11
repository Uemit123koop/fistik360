import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isUuid } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function positiveAmount(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/store/products/[id]">) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") return NextResponse.json({ error: "Bu işlem yalnız kuruyemişçi hesabına açıktır." }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ürün kimliği geçersiz." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const price = positiveAmount(body?.price);
  const quantity = positiveAmount(body?.quantity);
  const unit = typeof body?.unit === "string" ? body.unit.trim().toLocaleLowerCase("tr-TR") : "";
  if (!price || !quantity || !["gram", "kg", "adet", "paket"].includes(unit)) {
    return NextResponse.json({ error: "Fiyat, miktar ve satış birimini kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza kaydı bulunamadı." }, { status: 404 });

  const { data, error } = await supabase
    .from("retail_products")
    .update({
      price,
      quantity,
      unit,
      is_active: body?.isActive === true,
      is_in_stock: body?.isInStock === true,
    })
    .eq("id", id)
    .eq("store_id", store.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Ürün güncellenemedi." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
