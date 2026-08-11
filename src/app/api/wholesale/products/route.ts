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
  if (user.role !== "WHOLESALE_SELLER") {
    return NextResponse.json({ error: "Bu işlem yalnız toptancı hesabına açıktır." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const catalogProductId = typeof body?.catalogProductId === "string" ? body.catalogProductId : "";
  const stockQuantity = amount(body?.stockQuantity);
  const minimumOrderQuantity = amount(body?.minimumOrderQuantity);
  const unitPrice = amount(body?.unitPrice);
  if (!isUuid(catalogProductId) || stockQuantity < 0 || minimumOrderQuantity <= 0 || unitPrice <= 0) {
    return NextResponse.json({ error: "Katalog ürünü, stok, minimum sipariş ve fiyatı kontrol edin." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: catalogProduct } = await supabase
    .from("catalog_products")
    .select("id, name, category, description, wholesale_unit, image_url")
    .eq("id", catalogProductId)
    .eq("is_active", true)
    .eq("available_to_wholesale", true)
    .maybeSingle();
  if (!catalogProduct) {
    return NextResponse.json({ error: "Katalog ürünü bulunamadı veya toptan satışa kapalı." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("wholesale_products")
    .insert({
      seller_id: user.id,
      catalog_product_id: catalogProduct.id,
      name: catalogProduct.name,
      category: catalogProduct.category,
      unit: catalogProduct.wholesale_unit,
      stock_quantity: stockQuantity,
      minimum_order_quantity: minimumOrderQuantity,
      unit_price: unitPrice,
      description: catalogProduct.description,
      image_url: catalogProduct.image_url,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "Bu ürün toptan kataloğunuzda zaten var." : "Toptan ürün kaydedilemedi." },
      { status: error.code === "23505" ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
