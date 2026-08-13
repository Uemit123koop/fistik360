import { NextResponse } from "next/server";
import { activatePaidServiceAreas, markPurchaseFailed } from "@/lib/neighborhood-billing";
import { retrieveCheckoutFormResult } from "@/lib/iyzico";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// İyzico Checkout Form'un `callbackUrl`'i: kullanıcının tarayıcısı ödeme sonrası buraya
// form-urlencoded bir POST ile geri döner (yalnız `token` garanti edilir). Sonucu asla
// callback body'sine güvenerek değil, token'ı İyzico'ya geri sorup (retrieve) doğrulayarak
// işleriz.
export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const resultPage = (status: "success" | "failed" | "error", purchaseId?: string) => {
    const url = new URL("/dashboard/store/neighborhoods", appUrl);
    url.searchParams.set("purchase", purchaseId ?? "");
    url.searchParams.set("status", status);
    return NextResponse.redirect(url, 303);
  };

  let token: string | null = null;
  try {
    const form = await request.formData();
    token = (form.get("token") as string | null) ?? null;
  } catch {
    const json = await request.json().catch(() => null);
    token = typeof json?.token === "string" ? json.token : null;
  }

  if (!token) return resultPage("error");

  const admin = createSupabaseAdminClient();
  const { data: purchase } = await admin
    .from("neighborhood_purchases")
    .select("id, store_id, location_selections, status")
    .eq("iyzico_token", token)
    .maybeSingle();

  if (!purchase) return resultPage("error");
  if (purchase.status !== "PENDING") {
    // Callback iki kez gelmiş olabilir (idempotent): mevcut son duruma göre yönlendir.
    return resultPage(purchase.status === "SUCCESS" ? "success" : "failed", purchase.id);
  }

  try {
    const result = await retrieveCheckoutFormResult(purchase.id, token);
    if (!result.ok) {
      await markPurchaseFailed(admin, purchase.id);
      return resultPage("failed", purchase.id);
    }

    await activatePaidServiceAreas(admin, purchase.store_id, purchase.location_selections, purchase.id);
    if (result.paymentId) {
      await admin.from("neighborhood_purchases").update({ iyzico_payment_id: result.paymentId }).eq("id", purchase.id);
    }
    return resultPage("success", purchase.id);
  } catch {
    await markPurchaseFailed(admin, purchase.id);
    return resultPage("failed", purchase.id);
  }
}
