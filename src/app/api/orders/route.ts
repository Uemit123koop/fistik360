import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { canStoreReceiveOrders, isPaymentMethod, storeUnavailableMessage } from "@/lib/orders";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ─── Sepetten sipariş oluşturma ──────────────────────────────────────────────
// TUTAR: İstemciden hiçbir fiyat kabul edilmez. Ara toplam, teslimat ücreti ve
// toplam `create_order_from_cart` içinde `calculate_cart_totals` ile hesaplanır.
// YETKİ: `orders` tablosunda authenticated rolünün INSERT yetkisi yoktur; kayıt
// yalnız service_role ile ve yalnız bu RPC üzerinden açılabilir. RPC de kendi
// içinde `auth.role() = 'service_role'` kontrolü yapar.
// ÖDEME: Yöntemin mağaza tarafından kabul edildiği ve havalede aktif varsayılan
// IBAN bulunduğu RPC içinde doğrulanır; IBAN siparişe snapshot'lanır.

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// RPC'den gelen Postgres hatalarını kullanıcıya gösterilebilir mesaja çevirir.
function orderErrorMessage(message: string): { status: number; error: string } {
  if (message.includes("Active customer cart not found")) {
    return { status: 409, error: "Aktif sepetin bulunamadı. Sepetini yenileyip tekrar dene." };
  }
  if (message.includes("Minimum order amount")) {
    return { status: 400, error: "Minimum sepet tutarına ulaşılmadı." };
  }
  if (message.includes("Store payment settings are incomplete")) {
    return { status: 409, error: "Mağazanın ödeme ayarları eksik; sipariş alınamıyor." };
  }
  if (message.includes("is not accepted by this store")) {
    return { status: 400, error: "Bu ödeme yöntemi mağaza tarafından kabul edilmiyor." };
  }
  if (message.includes("no active default bank account")) {
    return { status: 409, error: "Mağazanın tanımlı havale hesabı yok; başka bir ödeme yöntemi seç." };
  }
  if (message.includes("Customer delivery details are required")) {
    return { status: 400, error: "Ad, telefon ve teslimat adresi zorunludur." };
  }
  return { status: 400, error: "Sipariş oluşturulamadı." };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Sipariş yalnız tüketici hesaplarıyla verilebilir." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentMethod = body?.paymentMethod;
  if (!isPaymentMethod(paymentMethod)) {
    return NextResponse.json({ error: "Ödeme yöntemi geçersiz." }, { status: 400 });
  }

  const customerName = text(body?.customerName, 120);
  const customerPhone = text(body?.customerPhone, 20);
  const deliveryAddress = text(body?.deliveryAddress, 500);
  const customerNote = text(body?.customerNote, 500);
  if (!customerName || !customerPhone || !deliveryAddress) {
    return NextResponse.json({ error: "Ad, telefon ve teslimat adresi zorunludur." }, { status: 400 });
  }
  if (body?.contractAccepted !== true || body?.privacyAcknowledged !== true) {
    return NextResponse.json({ error: "Sipariş için yasal onayların işaretlenmesi gerekir." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: cart, error: cartError } = await admin
    .from("carts")
    .select("id, store_id")
    .eq("customer_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (cartError) return NextResponse.json({ error: "Sepet okunamadı." }, { status: 500 });
  if (!cart) return NextResponse.json({ error: "Aktif sepetin yok." }, { status: 409 });

  const { count: itemCount } = await admin
    .from("cart_items")
    .select("id", { count: "exact", head: true })
    .eq("cart_id", cart.id);
  if (!itemCount) return NextResponse.json({ error: "Sepetin boş." }, { status: 409 });

  // Mağaza uygunluk guard'ı — RPC bunu kontrol etmiyor, uygulama katmanının işi.
  const { data: store } = await admin
    .from("stores")
    .select("id, is_active, platform_status")
    .eq("id", cart.store_id)
    .maybeSingle();
  if (!canStoreReceiveOrders(store)) {
    return NextResponse.json({ error: storeUnavailableMessage(store) }, { status: 409 });
  }

  const { data: orderId, error } = await admin.rpc("create_order_from_cart", {
    p_cart_id: cart.id,
    p_customer_id: user.id,
    p_payment_method: paymentMethod,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_delivery_address: deliveryAddress,
    p_customer_note: customerNote || null,
  });

  if (error || !orderId) {
    const mapped = orderErrorMessage(error?.message ?? "");
    console.error("[orders] sipariş oluşturulamadı:", error?.code, error?.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  // Havale seçildiyse sepet çekmecesindeki başarı ekranı IBAN'ı anında
  // göstersin diye burada da döndürüyoruz — müşteri sipariş geçmişine
  // gitmeden ödemeyi yapabilsin.
  const { data: placedOrder } = await admin
    .from("orders")
    .select("total_amount, bank_account_holder_snapshot, bank_iban_snapshot")
    .eq("id", orderId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    orderId,
    total: placedOrder ? Number(placedOrder.total_amount) : null,
    bankAccountHolder: placedOrder?.bank_account_holder_snapshot ?? null,
    bankIban: placedOrder?.bank_iban_snapshot ?? null,
  });
}
