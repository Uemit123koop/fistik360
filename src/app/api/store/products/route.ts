import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isUuid } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function amount(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : -1;
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") {
    return NextResponse.json({ error: "Bu işlem yalnız kuruyemişçi hesabına açıktır." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const catalogProductId = typeof body?.catalogProductId === "string" ? body.catalogProductId : "";
  const price = amount(body?.price);
  const quantity = amount(body?.quantity);
  const unit = typeof body?.unit === "string" ? body.unit.trim().toLocaleLowerCase("tr-TR") : "";
  if (!isUuid(catalogProductId) || price <= 0 || quantity <= 0 || !["gram", "kg", "adet", "paket"].includes(unit)) {
    return NextResponse.json({ error: "Katalog ürünü, miktar, birim ve satış fiyatını kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: catalogProduct }] = await Promise.all([
    supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle(),
    supabase
      .from("catalog_products")
      .select("id, name, category, description, retail_quantity, retail_unit, image_url")
      .eq("id", catalogProductId)
      .eq("is_active", true)
      .eq("available_to_retail", true)
      .maybeSingle(),
  ]);

  if (!store) return NextResponse.json({ error: "Mağaza kaydı bulunamadı." }, { status: 404 });
  if (!catalogProduct) return NextResponse.json({ error: "Katalog ürünü bulunamadı veya satışa kapalı." }, { status: 404 });

  const { data, error } = await supabase
    .from("retail_products")
    .insert({
      store_id: store.id,
      catalog_product_id: catalogProduct.id,
      name: catalogProduct.name,
      category: catalogProduct.category,
      description: catalogProduct.description,
      price,
      quantity,
      unit,
      image_url: catalogProduct.image_url,
      is_in_stock: true,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "Bu ürün mağaza kataloğunda zaten var." : "Ürün fiyatı kaydedilemedi." },
      { status: error.code === "23505" ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
