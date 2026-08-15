import { NextResponse } from "next/server";
import { isUuid } from "@/lib/cart";
import { getServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidDiscount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 90;
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") return NextResponse.json({ error: "Bu işlem yalnız kuruyemişçi hesabına açıktır." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = text(body?.name, 140);
  const discountPercent = isValidDiscount(body?.discountPercent) ? body.discountPercent : null;
  const productIds = Array.isArray(body?.productIds)
    ? Array.from(new Set(body.productIds.filter((id): id is string => typeof id === "string" && isUuid(id))))
    : [];

  if (!name || discountPercent === null || productIds.length === 0) {
    return NextResponse.json({ error: "Paket adı, indirim yüzdesi ve en az bir ürün seçimi zorunludur." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza kaydı bulunamadı." }, { status: 404 });

  const { data: products, error: productsError } = await supabase
    .from("retail_products")
    .select("id, name, price, quantity, unit")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("is_in_stock", true)
    .in("id", productIds);

  if (productsError) return NextResponse.json({ error: "Ürünler okunamadı." }, { status: 500 });
  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ error: "Seçilen ürünlerden biri artık aktif/stokta değil." }, { status: 409 });
  }

  const subtotal = products.reduce((sum, product) => sum + Number(product.price), 0);
  const price = Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100;

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .insert({
      store_id: store.id,
      name,
      package_type: text(body?.packageType, 100) || null,
      price,
      discount_percent: discountPercent,
      image_url: text(body?.imageUrl, 1000) || null,
      is_active: body?.isActive === true,
    })
    .select("id")
    .single();

  if (pkgError || !pkg) return NextResponse.json({ error: "Paket kaydedilemedi." }, { status: 400 });

  const { error: itemsError } = await supabase.from("package_items").insert(
    products.map((product) => ({
      package_id: pkg.id,
      product_id: product.id,
      quantity: product.quantity,
      unit: product.unit,
    })),
  );

  if (itemsError) {
    await supabase.from("packages").delete().eq("id", pkg.id);
    return NextResponse.json({ error: "Paket ürünleri kaydedilemedi." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: pkg.id }, { status: 201 });
}
