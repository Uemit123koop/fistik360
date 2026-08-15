import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { getCustomerCart } from "@/lib/cart";
import { resolveAvailableMethods } from "@/lib/orders";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
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

    const availableMethods = resolveAvailableMethods(payment);
    let bankAccountHolder: string | null = null;
    let bankIban: string | null = null;
    if (cart && availableMethods.includes("BANK_TRANSFER")) {
      // store_bank_accounts yalnız mağaza sahibine açık RLS'e sahip — müşteri
      // ödeme adımında gerçek IBAN'ı görebilsin diye burada bilerek admin
      // client ile (yalnız aktif varsayılan hesap) okunuyor.
      const admin = createSupabaseAdminClient();
      const { data: bank } = await admin
        .from("store_bank_accounts")
        .select("account_holder_name, iban")
        .eq("store_id", cart.store.id)
        .eq("is_active", true)
        .eq("is_default", true)
        .maybeSingle();
      bankAccountHolder = bank?.account_holder_name ?? null;
      bankIban = bank?.iban ?? null;
    }

    return NextResponse.json({
      authRequired: false,
      cart,
      availableMethods,
      bankAccountHolder,
      bankIban,
      customer: { fullName: profile?.full_name ?? null, phone: profile?.phone ?? null },
    });
  } catch {
    return NextResponse.json(
      { authRequired: false, cart: null, availableMethods: [], customer: null, error: "Sepet okunamadı." },
      { status: 500 },
    );
  }
}
