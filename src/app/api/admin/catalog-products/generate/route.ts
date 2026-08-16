import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import {
  CATALOG_IMAGE_DRAFT_BUCKET,
  CATALOG_IMAGE_PROMPT_VERSION,
  generateCatalogProductImage,
  inferCatalogProductPlacement,
  slugifyCatalogProductName,
} from "@/lib/catalog-product-generation";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 300;

function generationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "OPENAI_API_KEY_NOT_CONFIGURED") {
    return NextResponse.json({ error: "Görsel üretimi henüz yapılandırılmadı. Sunucuya OPENAI_API_KEY ekleyin." }, { status: 503 });
  }
  if (message.startsWith("IMAGE_GENERATION_FAILED:")) {
    return NextResponse.json({ error: "Görsel servisi isteği tamamlayamadı. Lütfen kısa bir süre sonra yeniden deneyin." }, { status: 502 });
  }
  if (message === "IMAGE_GENERATION_EMPTY") {
    return NextResponse.json({ error: "Görsel servisi boş sonuç döndürdü. Lütfen yeniden deneyin." }, { status: 502 });
  }
  return NextResponse.json({ error: message || "Görsel üretilemedi." }, { status: 500 });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu özellik yalnız superadmin hesabına açıktır." }, { status: 403 });

  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 140) {
    return NextResponse.json({ error: "Ürün adı 2 ile 140 karakter arasında olmalıdır." }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Görsel üretimi henüz yapılandırılmadı. Sunucuya OPENAI_API_KEY ekleyin." }, { status: 503 });
  }

  const slug = slugifyCatalogProductName(name);
  if (!slug) return NextResponse.json({ error: "Bu ürün adından geçerli bir katalog slug'ı üretilemedi." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const [{ data: existingProduct }, { data: existingDraft }] = await Promise.all([
    admin.from("catalog_products").select("id").eq("slug", slug).maybeSingle(),
    admin.from("catalog_product_drafts").select("id").eq("proposed_slug", slug).eq("status", "PENDING").maybeSingle(),
  ]);
  if (existingProduct) return NextResponse.json({ error: "Bu adla bir katalog ürünü zaten var." }, { status: 409 });
  if (existingDraft) return NextResponse.json({ error: "Bu ürün için zaten onay bekleyen bir taslak var." }, { status: 409 });

  const placement = inferCatalogProductPlacement(name);
  const { data: subcategory } = placement.subcategorySlug
    ? await admin.from("catalog_categories").select("id").eq("slug", placement.subcategorySlug).maybeSingle()
    : { data: null };

  let generated: Awaited<ReturnType<typeof generateCatalogProductImage>>;
  try {
    generated = await generateCatalogProductImage(name);
  } catch (error) {
    return generationError(error);
  }

  const draftId = randomUUID();
  const objectPath = `${user.id}/${draftId}.png`;
  const { error: uploadError } = await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).upload(objectPath, generated.image, {
    contentType: "image/png",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Taslak görsel güvenli alana kaydedilemedi: ${uploadError.message}` }, { status: 500 });
  }

  const { data: draft, error: insertError } = await admin
    .from("catalog_product_drafts")
    .insert({
      id: draftId,
      proposed_name: name,
      proposed_slug: slug,
      category: placement.category,
      description: placement.description,
      subcategory_id: subcategory?.id ?? null,
      image_object_path: objectPath,
      generation_prompt: generated.prompt,
      prompt_version: CATALOG_IMAGE_PROMPT_VERSION,
      created_by: user.id,
    })
    .select("id, proposed_name, proposed_slug, category, description, status, created_at")
    .single();
  if (insertError || !draft) {
    await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).remove([objectPath]);
    const conflict = insertError?.code === "23505";
    return NextResponse.json({ error: conflict ? "Bu ürün için zaten onay bekleyen bir taslak var." : "Ürün taslağı kaydedilemedi." }, { status: conflict ? 409 : 500 });
  }

  const { data: signed, error: signError } = await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).createSignedUrl(objectPath, 3600);
  if (signError || !signed?.signedUrl) {
    await admin.from("catalog_product_drafts").delete().eq("id", draftId);
    await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).remove([objectPath]);
    return NextResponse.json({ error: "Taslak önizleme bağlantısı oluşturulamadı." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    draft: {
      id: draft.id,
      proposed_name: draft.proposed_name,
      proposed_slug: draft.proposed_slug,
      category: draft.category,
      description: draft.description,
      status: draft.status,
      created_at: draft.created_at,
      preview_url: signed.signedUrl,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
