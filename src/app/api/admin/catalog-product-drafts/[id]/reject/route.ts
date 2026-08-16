import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { CATALOG_IMAGE_DRAFT_BUCKET } from "@/lib/catalog-product-generation";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext<"/api/admin/catalog-product-drafts/[id]/reject">) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu özellik yalnız superadmin hesabına açıktır." }, { status: 403 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Geçersiz ürün taslağı." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: draft, error: draftError } = await admin
    .from("catalog_product_drafts")
    .select("id, image_object_path, status")
    .eq("id", id)
    .maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "Ürün taslağı bulunamadı." }, { status: 404 });
  if (draft.status !== "PENDING") return NextResponse.json({ error: "Bu taslak daha önce sonuçlandırılmış." }, { status: 409 });

  const { error: updateError } = await admin
    .from("catalog_product_drafts")
    .update({ status: "REJECTED", rejected_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "PENDING");
  if (updateError) return NextResponse.json({ error: "Taslak reddedilemedi." }, { status: 500 });

  await admin.storage.from(CATALOG_IMAGE_DRAFT_BUCKET).remove([draft.image_object_path]);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
