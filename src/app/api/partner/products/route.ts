import { NextResponse } from "next/server";
import { getActivePartner } from "@/lib/partner-auth";
import { slugifyBrand } from "@/lib/partner";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const access = await getActivePartner();
  if (!access) return NextResponse.json({ error: "Aktif partner hesabı gerekli." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const value = (key: string) => typeof body?.[key] === "string" ? body[key].trim() : "";
  const name = value("name");
  const category = value("category");
  const description = value("description");
  const label = value("variantLabel");
  const sku = value("sku");
  const unit = value("unit");
  const weight = Number(body?.weight);
  const price = Number(body?.price);
  const stock = Number(body?.stock);
  const status = body?.publish === true ? "ACTIVE" : "DRAFT";
  if (!name || !category || !description || !label || !sku || !["GRAM", "KILOGRAM", "ADET"].includes(unit) || weight <= 0 || price < 0 || stock < 0) {
    return NextResponse.json({ error: "Ürün ve varyant alanlarını kontrol edin." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: brand } = await admin.from("brands").select("id").eq("partner_id", access.partner.id).maybeSingle();
  if (!brand) return NextResponse.json({ error: "Partner markası bulunamadı." }, { status: 409 });
  const { data: product, error: productError } = await admin.from("brand_products").insert({ partner_id: access.partner.id, brand_id: brand.id, name, slug: slugifyBrand(name), category, description, ingredients: value("ingredients") || null, origin: value("origin") || null, processing_type: value("processingType") || null, status }).select("id").single();
  if (productError || !product) return NextResponse.json({ error: productError?.message || "Ürün kaydedilemedi." }, { status: 400 });
  const { error: variantError } = await admin.from("brand_product_variants").insert({ product_id: product.id, label, weight, unit, sku, barcode: value("barcode") || null, price, stock, is_active: true });
  if (variantError) {
    await admin.from("brand_products").delete().eq("id", product.id);
    return NextResponse.json({ error: variantError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, productId: product.id }, { status: 201 });
}
