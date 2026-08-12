import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { getCustomerCart } from "@/lib/cart";

export async function GET() {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ authRequired: true, cart: null });
  }

  try {
    const cart = await getCustomerCart(user.id);
    return NextResponse.json({ authRequired: false, cart });
  } catch {
    return NextResponse.json({ authRequired: false, cart: null, error: "Sepet okunamadı." }, { status: 500 });
  }
}
