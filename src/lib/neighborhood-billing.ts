import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationSelection } from "@/lib/location-types";
import { upsertNeighborhoodRecord } from "@/lib/turkiye-locations";

export type BillingInterval = "MONTH" | "YEAR";

export interface PriceQuote {
  unitPrice: number;
  discountRate: number;
  paidAreas: number;
  amount: number;
}

export async function getActiveAreaCount(admin: SupabaseClient, storeId: string): Promise<number> {
  const { count, error } = await admin
    .from("store_neighborhoods")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);
  if (error) throw new Error("Aktif mahalle sayısı okunamadı.");
  return count ?? 0;
}

// newAreas: bu işlemde satın alınan mahalle sayısı (ücretlendirilen kısım).
// totalAreasAfter: işlem sonrası mağazanın toplam aktif mahalle sayısı (indirim kademesi
// buna göre belirlenir). Kayıt sırasında Aylık/Yıllık seçilince ikisi eşittir (mağaza
// henüz hiç mahalleye sahip değil); panelden "ek mahalle ekle" akışında
// newAreas=1, totalAreasAfter=mevcut aktif sayı+1 olur.
export async function calculatePrice(
  admin: SupabaseClient,
  newAreas: number,
  totalAreasAfter: number,
  billingInterval: BillingInterval,
): Promise<PriceQuote> {
  const { data, error } = await admin.rpc("calculate_multi_neighborhood_price", {
    p_new_areas: newAreas,
    p_total_areas_after: totalAreasAfter,
    p_billing_interval: billingInterval,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Fiyat hesaplanamadı.");
  return {
    unitPrice: Number(row.unit_price),
    discountRate: Number(row.discount_rate),
    paidAreas: Number(row.paid_areas),
    amount: Number(row.amount),
  };
}

// Ödeme başarılı olduktan SONRA (İyzico callback'i) çağrılır. saveSellerPrimaryLocation
// ile aynı il/ilçe/mahalle upsert'ini paylaşır. Tek ödeme birden fazla mahalleyi
// (kayıt sırasında Aylık/Yıllık plan seçilince) birlikte aktive edebildiği için tüm
// liste tek transactional adımda işlenir. Bu mahalleler ÜCRETLİDİR — "bedava" değildir;
// mağazanın henüz hiç primary'si yoksa (ör. doğrudan ücretli planla kayıt) listedeki ilk
// mahalle yalnızca vitrin/görünüm amaçlı primary işaretlenir, ödemesi diğerleriyle aynıdır.
export async function activatePaidServiceAreas(
  admin: SupabaseClient,
  storeId: string,
  rawSelections: LocationSelection[],
  purchaseId: string,
): Promise<{ storeNeighborhoodIds: string[] }> {
  const { data: existingPrimary } = await admin
    .from("store_neighborhoods")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_primary", true)
    .eq("is_active", true)
    .maybeSingle();
  let primaryAssigned = Boolean(existingPrimary);

  const storeNeighborhoodIds: string[] = [];

  for (const rawSelection of rawSelections) {
    const { id: neighborhoodId, selection } = await upsertNeighborhoodRecord(admin, rawSelection);

    const { data: existing, error: existingError } = await admin
      .from("store_neighborhoods")
      .select("id, is_active")
      .eq("store_id", storeId)
      .eq("neighborhood_id", neighborhoodId)
      .maybeSingle();
    if (existingError) throw new Error("Hizmet alanı okunamadı.");

    const assignPrimary = !primaryAssigned;
    if (assignPrimary) primaryAssigned = true;

    const areaPayload = {
      store_id: storeId,
      neighborhood_id: neighborhoodId,
      province: selection.provinceName,
      district: selection.districtName,
      neighborhood: selection.settlementName,
      is_primary: assignPrimary,
      is_active: true,
      activated_at: new Date().toISOString(),
    };

    const areaResult = existing
      ? await admin.from("store_neighborhoods").update(areaPayload).eq("id", existing.id).select("id").single()
      : await admin.from("store_neighborhoods").insert(areaPayload).select("id").single();
    if (areaResult.error || !areaResult.data) throw new Error("Ücretli mahalle etkinleştirilemedi.");

    storeNeighborhoodIds.push(areaResult.data.id as string);
  }

  const { error: purchaseUpdateError } = await admin
    .from("neighborhood_purchases")
    .update({ status: "SUCCESS", store_neighborhood_ids: storeNeighborhoodIds, completed_at: new Date().toISOString() })
    .eq("id", purchaseId)
    .eq("status", "PENDING");
  if (purchaseUpdateError) throw new Error("Ödeme kaydı güncellenemedi.");

  return { storeNeighborhoodIds };
}

export async function markPurchaseFailed(admin: SupabaseClient, purchaseId: string): Promise<void> {
  await admin
    .from("neighborhood_purchases")
    .update({ status: "FAILED", completed_at: new Date().toISOString() })
    .eq("id", purchaseId)
    .eq("status", "PENDING");
}
