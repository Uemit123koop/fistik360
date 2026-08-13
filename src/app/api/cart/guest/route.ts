import { NextResponse } from "next/server";
import { isUuid } from "@/lib/cart";
import { resolveGuestCart } from "@/lib/guest-cart-server";
import { resolveAvailableMethods } from "@/lib/orders";
import { isSameOrigin } from "@/lib/request-guards";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

interface GuestEntryInput {
  storeId?: unknown;
  serviceAreaId?: unknown;
  kind?: unknown;
  itemId?: unknown;
  quantity?: unknown;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  let body: { entries?: GuestEntryInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const rawEntries = Array.isArray(body.entries) ? body.entries : [];
  const entries = rawEntries.filter(
    (entry): entry is { storeId: string; serviceAreaId: string; kind: "PRODUCT" | "PACKAGE"; itemId: string; quantity: number } =>
      typeof entry.storeId === "string" && isUuid(entry.storeId) &&
      typeof entry.serviceAreaId === "string" && isUuid(entry.serviceAreaId) &&
      typeof entry.itemId === "string" && isUuid(entry.itemId) &&
      (entry.kind === "PRODUCT" || entry.kind === "PACKAGE") &&
      typeof entry.quantity === "number" && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 99,
  );

  try {
    const cart = await resolveGuestCart(entries);
    let availableMethods: ReturnType<typeof resolveAvailableMethods> = [];
    if (cart) {
      const admin = createSupabaseAdminClient();
      const { data: payment } = await admin
        .from("store_payment_settings")
        .select("cash_on_delivery, card_on_delivery, bank_transfer")
        .eq("store_id", cart.store.id)
        .maybeSingle();
      availableMethods = resolveAvailableMethods(payment);
    }
    return NextResponse.json({ cart, availableMethods });
  } catch {
    return NextResponse.json({ error: "Sepet okunamadı.", cart: null, availableMethods: [] }, { status: 500 });
  }
}
