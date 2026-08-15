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
    .select("id, store_id, location_selections, status, amount, currency")
    .eq("iyzico_token", token)
    .maybeSingle();

  if (!purchase) return resultPage("error");
  if (purchase.status !== "PENDING") {
    // Callback iki kez gelmiş olabilir (idempotent): mevcut son duruma göre yönlendir.
    // PROCESSING, başka bir istek şu an tam bu anda işliyor demektir — henüz kesin bir
    // sonuç yok, "error" ile nötr bir sayfaya düşürüp paneldeki gerçek son duruma bırakıyoruz.
    return resultPage(purchase.status === "SUCCESS" ? "success" : purchase.status === "FAILED" ? "failed" : "error", purchase.id);
  }

  try {
    const result = await retrieveCheckoutFormResult(purchase.id, token);
    if (!result.ok) {
      await markPurchaseFailed(admin, purchase.id);
      return resultPage("failed", purchase.id);
    }

    // Tutar/para birimi doğrulaması: İyzico'nun "bu kadar ödendi" dediği miktar, mağazaya
    // kestiğimiz fiyatla (kuruş toleransıyla) birebir eşleşmeli; eşleşmezse hiçbir mahalle
    // aktifleştirilmez. conversationId/token de retrieve yanıtında geldiyse çapraz kontrol edilir.
    const expectedAmount = Number(purchase.amount);
    const amountMatches = result.paidPrice !== null && Number.isFinite(expectedAmount) && Math.abs(result.paidPrice - expectedAmount) < 0.01;
    const currencyMatches = !result.currency || result.currency === (purchase.currency ?? "TRY");
    const conversationMatches = !result.conversationId || result.conversationId === purchase.id;
    const tokenMatches = !result.token || result.token === token;
    if (!amountMatches || !currencyMatches || !conversationMatches || !tokenMatches) {
      await markPurchaseFailed(admin, purchase.id);
      return resultPage("failed", purchase.id);
    }

    const activation = await activatePaidServiceAreas(admin, purchase.store_id, purchase.location_selections, purchase.id);
    if (!activation.claimed) {
      // Aynı ödeme için eşzamanlı ikinci bir çağrı zaten kazanmış — mahalleye tekrar
      // dokunmadan mevcut son durumu okuyup ona göre yönlendiriyoruz.
      const { data: latest } = await admin.from("neighborhood_purchases").select("status").eq("id", purchase.id).maybeSingle();
      return resultPage(latest?.status === "SUCCESS" ? "success" : latest?.status === "FAILED" ? "failed" : "error", purchase.id);
    }

    if (result.paymentId) {
      await admin.from("neighborhood_purchases").update({ iyzico_payment_id: result.paymentId }).eq("id", purchase.id);
    }
    return resultPage("success", purchase.id);
  } catch {
    await markPurchaseFailed(admin, purchase.id);
    return resultPage("failed", purchase.id);
  }
}
