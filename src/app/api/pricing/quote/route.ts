import { NextResponse } from "next/server";
import { calculatePrice, type BillingInterval } from "@/lib/neighborhood-billing";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Auth gerektirmez: mağaza kaydı henüz tamamlanmadan (hesap/mağaza yokken) satıcı
// adayının kaç mahalle seçtiğine göre fiyatı canlı gösterebilmek için. subscription_plans
// zaten herkese select açık; hesaplama mantığı yalnız DB'deki tek doğruluk kaynağını sarar.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { totalAreas?: unknown; billingInterval?: unknown } | null;
  const totalAreas = Number(body?.totalAreas);
  const billingInterval = body?.billingInterval;

  if (!Number.isInteger(totalAreas) || totalAreas < 1 || totalAreas > 500) {
    return NextResponse.json({ error: "Geçersiz mahalle sayısı." }, { status: 400 });
  }
  if (billingInterval !== "MONTH" && billingInterval !== "YEAR") {
    return NextResponse.json({ error: "Geçersiz ödeme periyodu." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    // Kayıt akışında mağaza henüz hiç mahalleye sahip değil: seçilen HER mahalle ücretli.
    const quote = await calculatePrice(admin, totalAreas, totalAreas, billingInterval as BillingInterval);
    return NextResponse.json({ totalAreas, ...quote });
  } catch {
    return NextResponse.json({ error: "Fiyat hesaplanamadı." }, { status: 500 });
  }
}
