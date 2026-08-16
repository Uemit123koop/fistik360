import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "catalog-product-images";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/webp"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasValidSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function storageObjectPath(publicUrl: string | null) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  try {
    const pathname = new URL(publicUrl).pathname;
    const index = pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request, context: RouteContext<"/api/admin/catalog-products/[id]/image">) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu işlem yalnız admin hesabına açıktır." }, { status: 403 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Geçersiz katalog ürünü." }, { status: 400 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "PNG veya WEBP dosyası seçin." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Yalnız PNG ve WEBP kabul edilir; JPEG yüklenemez." }, { status: 415 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Görsel 20 MiB sınırını aşıyor." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) {
    return NextResponse.json({ error: "Dosya uzantısı ve gerçek görsel formatı uyuşmuyor." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product, error: productError } = await admin
    .from("catalog_products")
    .select("id, slug, image_url")
    .eq("id", id)
    .maybeSingle();
  if (productError || !product) return NextResponse.json({ error: "Katalog ürünü bulunamadı." }, { status: 404 });

  const extension = file.type === "image/png" ? "png" : "webp";
  const objectPath = `${product.slug}.${extension}`;
  const previousPath = storageObjectPath(product.image_url);
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Görsel Storage'a yüklenemedi: ${uploadError.message}` }, { status: 400 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  const versionedPublicUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await admin
    .from("catalog_products")
    .update({ image_url: versionedPublicUrl })
    .eq("id", product.id);
  if (updateError) {
    if (previousPath !== objectPath) await admin.storage.from(BUCKET).remove([objectPath]);
    return NextResponse.json({ error: "Görsel yüklendi fakat ürün kaydı güncellenemedi." }, { status: 400 });
  }

  if (previousPath && previousPath !== objectPath) {
    await admin.storage.from(BUCKET).remove([previousPath]);
  }

  return NextResponse.json({ ok: true, imageUrl: versionedPublicUrl }, { headers: { "Cache-Control": "no-store" } });
}
