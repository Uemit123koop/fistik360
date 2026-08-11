import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { isOrderStatus, transitionError, type OrderStatus } from "@/lib/orders";
import { isSameOrigin } from "@/lib/request-guards";
import { isUuid } from "@/lib/cart";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ─── Sipariş durum geçişi ────────────────────────────────────────────────────
// YETKİ: siparişin mağaza sahibi satıcı, siparişi veren müşteri ya da ADMIN.
//   · Müşteri yalnız kendi PENDING siparişini iptal edebilir.
//   · Diğer tüm geçişler satıcı/yöneticiye aittir.
// `orders` tablosunda authenticated rolünün UPDATE yetkisi yok; güncelleme
// service_role ile yapılır, bu yüzden sahiplik kontrolü burada zorunludur.

type Actor = "customer" | "store" | "admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Sipariş kimliği geçersiz." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const target = body?.status;
  if (!isOrderStatus(target)) {
    return NextResponse.json({ error: "Hedef durum geçersiz." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: order, error: readError } = await admin
    .from("orders")
    .select("id, status, customer_id, store_id, payment_method, payment_status")
    .eq("id", id)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: "Sipariş okunamadı." }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });

  // Sahiplik — kayıt bulunduktan SONRA, veri dönmeden ÖNCE.
  let actor: Actor | null = null;
  if (user.role === "ADMIN") {
    actor = "admin";
  } else if (order.customer_id === user.id) {
    actor = "customer";
  } else {
    const { data: store } = await admin
      .from("stores")
      .select("id")
      .eq("id", order.store_id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (store) actor = "store";
  }
  if (!actor) return NextResponse.json({ error: "Bu siparişe erişim yetkin yok." }, { status: 403 });

  if (actor === "customer" && !(order.status === "PENDING" && target === "CANCELLED")) {
    return NextResponse.json(
      { error: "Bu durum değişikliğini yalnız satıcı yapabilir. Onay bekleyen siparişini iptal edebilirsin." },
      { status: 403 },
    );
  }

  const invalid = transitionError(order.status as OrderStatus, target);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Tahsilat durumu siparişin durumuyla birlikte ilerler.
  const patch: Record<string, unknown> = { status: target, updated_at: new Date().toISOString() };
  if (target === "CANCELLED" && order.payment_status !== "PAID") {
    patch.payment_status = "CANCELLED";
  } else if (target === "DELIVERED" && order.payment_method !== "BANK_TRANSFER") {
    patch.payment_status = "PAID";
  }

  // Yarış koruması: yalnızca beklenen mevcut durumdan güncelle.
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("status", order.status)
    .select("id, status, payment_status")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("[orders] durum güncellenemedi:", updateError?.code);
    return NextResponse.json(
      { error: "Sipariş durumu bu arada değişti. Sayfayı yenileyin." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, order: updated });
}
