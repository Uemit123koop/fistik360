import { NextResponse } from "next/server";
import { isUuid } from "@/lib/cart";
import { mixLineTotal, pricePerGram, type WeighableUnit } from "@/lib/custom-mix-pricing";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const MIN_GRAMS = 50;
const MAX_GRAMS = 1000;
const GRAMS_STEP = 50;
const MAX_ITEMS = 12;

interface MixItemInput {
  retailProductId?: unknown;
  grams?: unknown;
}

function isValidGrams(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_GRAMS &&
    value <= MAX_GRAMS &&
    value % GRAMS_STEP === 0
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { storeId?: unknown; items?: MixItemInput[] } | null;
  const storeId = typeof body?.storeId === "string" ? body.storeId : "";
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  const items = rawItems
    .filter(
      (item): item is { retailProductId: string; grams: number } =>
        typeof item.retailProductId === "string" && isUuid(item.retailProductId) && isValidGrams(item.grams),
    )
    .slice(0, MAX_ITEMS);

  if (!isUuid(storeId) || items.length === 0) {
    return NextResponse.json({ error: "Karışım için en az bir ürün ve geçerli bir gramaj seç." }, { status: 400 });
  }

  const uniqueProductIds = [...new Set(items.map((item) => item.retailProductId))];
  const admin = createSupabaseAdminClient();
  const { data: products, error: productsError } = await admin
    .from("retail_products")
    .select("id, name, price, quantity, unit, is_active, is_in_stock")
    .eq("store_id", storeId)
    .in("id", uniqueProductIds);

  if (productsError) {
    return NextResponse.json({ error: "Ürünler okunamadı." }, { status: 500 });
  }

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  const lineItems: Array<{
    retailProductId: string;
    name: string;
    grams: number;
    unitPriceSnapshot: number;
    linePrice: number;
  }> = [];

  for (const item of items) {
    const product = productById.get(item.retailProductId);
    if (!product || !product.is_active || !product.is_in_stock) {
      return NextResponse.json({ error: "Seçilen ürünlerden biri artık satışta değil." }, { status: 409 });
    }
    const perGram = pricePerGram(Number(product.price), Number(product.quantity), product.unit as WeighableUnit);
    if (perGram === null) {
      return NextResponse.json({ error: `${product.name} adet bazlı satıldığı için karışıma eklenemez.` }, { status: 400 });
    }
    lineItems.push({
      retailProductId: product.id,
      name: product.name,
      grams: item.grams,
      unitPriceSnapshot: perGram,
      linePrice: mixLineTotal(perGram, item.grams),
    });
  }

  const totalWeightGrams = lineItems.reduce((sum, item) => sum + item.grams, 0);
  const totalPriceAmount = Math.round(lineItems.reduce((sum, item) => sum + item.linePrice, 0) * 100) / 100;
  const nameSnapshot = `Kendi Karışımı: ${lineItems.map((item) => `${item.name} ${item.grams}g`).join(", ")}`.slice(0, 500);

  const { data: mix, error: mixError } = await admin
    .from("cart_custom_mixes")
    .insert({
      store_id: storeId,
      name_snapshot: nameSnapshot,
      total_weight_grams: totalWeightGrams,
      total_price_amount: totalPriceAmount,
    })
    .select("id")
    .single();

  if (mixError || !mix) {
    return NextResponse.json({ error: "Karışım oluşturulamadı." }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("cart_custom_mix_items").insert(
    lineItems.map((item) => ({
      custom_mix_id: mix.id,
      retail_product_id: item.retailProductId,
      product_name_snapshot: item.name,
      grams: item.grams,
      unit_price_snapshot: item.unitPriceSnapshot,
      line_price_amount: item.linePrice,
    })),
  );

  if (itemsError) {
    await admin.from("cart_custom_mixes").delete().eq("id", mix.id);
    return NextResponse.json({ error: "Karışım kalemleri kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json(
    { id: mix.id, totalWeightGrams, totalPriceAmount, nameSnapshot },
    { status: 201 },
  );
}
