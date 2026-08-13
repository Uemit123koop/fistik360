import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { getCustomerCart } from "@/lib/cart";
import { resolveAvailableMethods } from "@/lib/orders";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ authRequired: true, cart: null, availableMethods: [], customer: null });
  }

  try {
    const cart = await getCustomerCart(user.id);
    const supabase = await createSupabaseServerClient();
    const [{ data: profile }, { data: payment }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      cart
        ? supabase
            .from("store_payment_settings")
            .select("cash_on_delivery, card_on_delivery, bank_transfer")
            .eq("store_id", cart.store.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      authRequired: false,
      cart,
      availableMethods: resolveAvailableMethods(payment),
      customer: { fullName: profile?.full_name ?? null, phone: profile?.phone ?? null },
    });
  } catch {
    return NextResponse.json(
      { authRequired: false, cart: null, availableMethods: [], customer: null, error: "Sepet okunamadı." },
      { status: 500 },
    );
  }
}
