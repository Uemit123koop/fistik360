import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isUuid } from "@/lib/cart";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ─── Platform mağaza durumu ──────────────────────────────────────────────────
// `stores.platform_status` ve `published_at` kolonlarını `protect_store_platform_fields`
// tetikleyicisi service_role dışında herkese kapatır; bu yüzden işlem admin
// istemcisiyle yapılır ve yetki kontrolü burada zorunludur.
//
// AYRIM: `platform_status` PLATFORMUN kararıdır (yayın/askı). `is_active` satıcının
// kendi tatil modu anahtarıdır. Askıya alma `is_active`e DOKUNMAZ — aksi halde
// askıdan çıkan mağaza, satıcının kapattığı hâlde kendiliğinden açılırdı.

const ACTIONS = ["publish", "suspend", "reinstate"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const storeId = typeof body?.storeId === "string" ? body.storeId : "";
  const action = body?.action;
  if (!isUuid(storeId)) return NextResponse.json({ error: "Geçersiz mağaza." }, { status: 400 });
  if (!isAction(action)) return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: store, error: readError } = await admin
    .from("stores")
    .select("id, name, platform_status")
    .eq("id", storeId)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: "Mağaza okunamadı." }, { status: 500 });
  if (!store) return NextResponse.json({ error: "Mağaza bulunamadı." }, { status: 404 });

  if (action === "publish" || action === "reinstate") {
    if (store.platform_status === "ACTIVE") {
      return NextResponse.json({ error: "Mağaza zaten yayında." }, { status: 409 });
    }

    // Yayına alırken satıcının kendi kontrol listesi koşulları da sağlanmalı;
    // eksik mağazayı admin de yayınlayamaz (vitrinde boş mağaza oluşmasın).
    const [{ data: area }, { count: productCount }] = await Promise.all([
      admin
        .from("store_neighborhoods")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_primary", true)
        .eq("is_active", true)
        .maybeSingle(),
      admin
        .from("retail_products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("is_in_stock", true),
    ]);

    if (!area) return NextResponse.json({ error: "Mağazanın aktif ana hizmet mahallesi yok." }, { status: 409 });
    if (!productCount) return NextResponse.json({ error: "Mağazanın satılabilir ürünü yok." }, { status: 409 });
  }

  if (action === "suspend" && store.platform_status === "SUSPENDED") {
    return NextResponse.json({ error: "Mağaza zaten askıda." }, { status: 409 });
  }

  const patch: Record<string, unknown> =
    action === "suspend"
      ? { platform_status: "SUSPENDED", updated_at: new Date().toISOString() }
      : { platform_status: "ACTIVE", updated_at: new Date().toISOString() };

  if (action === "publish") patch.published_at = new Date().toISOString();

  // Yarış koruması: yalnızca beklenen mevcut durumdan güncelle.
  const { data: updated, error } = await admin
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .eq("platform_status", store.platform_status)
    .select("id, platform_status")
    .maybeSingle();

  if (error || !updated) {
    console.error("[admin/stores] durum güncellenemedi:", error?.code);
    return NextResponse.json({ error: "Mağaza durumu bu arada değişti. Sayfayı yenileyin." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, platformStatus: updated.platform_status });
}
