import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isUuid } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidDiscount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 90;
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/store/packages/[id]">) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") return NextResponse.json({ error: "Bu işlem yalnız kuruyemişçi hesabına açıktır." }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Paket bilgisi geçersiz." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const isActive = body?.isActive === true;

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza kaydı bulunamadı." }, { status: 404 });

  const { data: existingPackage } = await supabase.from("packages").select("id").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!existingPackage) return NextResponse.json({ error: "Paket bulunamadı." }, { status: 404 });

  // Sadece vitrin durumu değişiyorsa (productIds gönderilmediyse) hızlı yol:
  // fiyata/içeriğe dokunma, tek kolon güncelle.
  if (!Array.isArray(body?.productIds)) {
    const { error } = await supabase.from("packages").update({ is_active: isActive }).eq("id", id).eq("store_id", store.id);
    if (error) return NextResponse.json({ error: "Paket güncellenemedi." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const name = text(body?.name, 140);
  const discountPercent = isValidDiscount(body?.discountPercent) ? body.discountPercent : null;
  const productIds = Array.from(new Set(body.productIds.filter((pid): pid is string => typeof pid === "string" && isUuid(pid))));

  if (!name || discountPercent === null || productIds.length === 0) {
    return NextResponse.json({ error: "Paket adı, indirim yüzdesi ve en az bir ürün seçimi zorunludur." }, { status: 400 });
  }

  const { data: products, error: productsError } = await supabase
    .from("retail_products")
    .select("id, price, quantity, unit")
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

  const { error: deleteItemsError } = await supabase.from("package_items").delete().eq("package_id", id);
  if (deleteItemsError) return NextResponse.json({ error: "Paket içeriği güncellenemedi." }, { status: 400 });

  const { error: insertItemsError } = await supabase.from("package_items").insert(
    products.map((product) => ({ package_id: id, product_id: product.id, quantity: product.quantity, unit: product.unit })),
  );
  if (insertItemsError) return NextResponse.json({ error: "Paket içeriği kaydedilemedi." }, { status: 400 });

  const { error } = await supabase
    .from("packages")
    .update({
      name,
      package_type: text(body?.packageType, 100) || null,
      image_url: text(body?.imageUrl, 1000) || null,
      price,
      discount_percent: discountPercent,
      is_active: isActive,
    })
    .eq("id", id)
    .eq("store_id", store.id);

  if (error) return NextResponse.json({ error: "Paket güncellenemedi." }, { status: 400 });
  return NextResponse.json({ ok: true, price });
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/store/packages/[id]">) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "NUT_STORE") return NextResponse.json({ error: "Bu işlem yalnız kuruyemişçi hesabına açıktır." }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Paket bilgisi geçersiz." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) return NextResponse.json({ error: "Mağaza kaydı bulunamadı." }, { status: 404 });

  const { data, error } = await supabase.from("packages").delete().eq("id", id).eq("store_id", store.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Paket silinemedi." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Paket bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
