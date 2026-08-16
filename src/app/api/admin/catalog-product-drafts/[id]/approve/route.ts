import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import {
  CATALOG_IMAGE_BUCKET,
  CATALOG_IMAGE_DRAFT_BUCKET,
  validateCatalogProductPng,
} from "@/lib/catalog-product-generation";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext<"/api/admin/catalog-product-drafts/[id]/approve">) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu özellik yalnız superadmin hesabına açıktır." }, { status: 403 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Geçersiz ürün taslağı." }, { status: 400 });
  const body = await request.json().catch(() => null) as { activateNow?: unknown } | null;
  const activateNow = body?.activateNow !== false;

  const admin = createSupabaseAdminClient();
  const { data: draft, error: draftError } = await admin
    .from("catalog_product_drafts")
    .select("id, proposed_slug, image_object_path, status")
    .eq("id", id)
    .maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "Ürün taslağı bulunamadı." }, { status: 404 });
  if (draft.status !== "PENDING") return NextResponse.json({ error: "Bu taslak daha önce sonuçlandırılmış." }, { status: 409 });

  const { data: privateFile, error: downloadError } = await admin.storage
    .from(CATALOG_IMAGE_DRAFT_BUCKET)
    .download(draft.image_object_path);
  if (downloadError || !privateFile) {
    return NextResponse.json({ error: "Onaylanacak taslak görsel bulunamadı." }, { status: 409 });
  }

  const image = Buffer.from(await privateFile.arrayBuffer());
  let validImage = false;
  try {
    validImage = await validateCatalogProductPng(image);
  } catch {
    validImage = false;
  }
  if (!validImage) {
    return NextResponse.json({ error: "Taslak görsel 4096×4096 şeffaf PNG standardını karşılamıyor." }, { status: 422 });
  }

  const publicObjectPath = `${draft.proposed_slug}.png`;
  const { error: uploadError } = await admin.storage.from(CATALOG_IMAGE_BUCKET).upload(publicObjectPath, image, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Katalog görseli yayınlanamadı: ${uploadError.message}` }, { status: 409 });
  }

  const { data: publicData } = admin.storage.from(CATALOG_IMAGE_BUCKET).getPublicUrl(publicObjectPath);
  const imageUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  const { data: productId, error: approveError } = await admin.rpc("approve_catalog_product_draft", {
    p_draft_id: id,
    p_image_url: imageUrl,
    p_activate_now: activateNow,
    p_approved_by: user.id,
  });
  if (approveError || !productId) {
    await admin.storage.from(CATALOG_IMAGE_BUCKET).remove([publicObjectPath]);
    return NextResponse.json({ error: approveError?.message || "Ürün kataloğa eklenemedi." }, { status: 409 });
  }

  await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).remove([draft.image_object_path]);
  const { data: product, error: productError } = await admin
    .from("catalog_products")
    .select("id, slug, name, category, image_url, is_active")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return NextResponse.json({ ok: true, productId, imageUrl, active: activateNow }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: true, product }, { headers: { "Cache-Control": "no-store" } });
}
