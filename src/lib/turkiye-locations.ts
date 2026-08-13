import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationOption, LocationSelection, SettlementType } from "@/lib/location-types";

const API_BASE = "https://api.turkiyeapi.dev/v2";

interface ApiListResponse {
  data?: Array<{ id?: number | string; name?: string }>;
}

function numericId(value: string) {
  return /^\d+$/.test(value) ? value : null;
}

async function fetchList(path: string): Promise<LocationOption[]> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });

  if (!response.ok) throw new Error("Türkiye konum verisi şu anda alınamadı.");
  const payload = (await response.json()) as ApiListResponse;
  return (payload.data ?? []).flatMap((item) => {
    if (item.id == null || typeof item.name !== "string") return [];
    return [{ id: String(item.id), name: item.name.trim() }];
  });
}

export async function getLocationOptions(level: "provinces" | "districts" | "settlements", parentId?: string) {
  if (level === "provinces") {
    return fetchList("/provinces?fields=id,name&sort=name&limit=100");
  }

  const id = parentId ? numericId(parentId) : null;
  if (!id) throw new Error("Geçerli bir üst konum seçin.");

  if (level === "districts") {
    return fetchList(`/districts?provinceId=${id}&fields=id,name&sort=name&limit=1000`);
  }

  const neighborhoods = await fetchList(
    `/neighborhoods?districtId=${id}&fields=id,name&sort=name&limit=1000`,
  );
  return neighborhoods
    .map((item) => ({ ...item, type: "NEIGHBORHOOD" as const }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function validateLocationSelection(value: LocationSelection): Promise<LocationSelection> {
  const provinceId = numericId(value.provinceId);
  const districtId = numericId(value.districtId);
  const settlementId = numericId(value.settlementId);
  if (!provinceId || !districtId || !settlementId) throw new Error("Konum seçimi geçersiz.");

  const provinces = await getLocationOptions("provinces");
  const province = provinces.find((item) => item.id === provinceId);
  const districts = await getLocationOptions("districts", provinceId);
  const district = districts.find((item) => item.id === districtId);
  const settlements = await getLocationOptions("settlements", districtId);
  const settlement = settlements.find((item) => item.id === settlementId);

  if (!province || !district || !settlement || !settlement.type) {
    throw new Error("Seçilen il, ilçe veya mahalle doğrulanamadı.");
  }

  return {
    provinceId,
    provinceName: province.name,
    districtId,
    districtName: district.name,
    settlementId,
    settlementName: settlement.name,
    settlementType: settlement.type,
  };
}

// İl/ilçe/mahalle kayıtlarını upsert edip nihai `neighborhoods.id`'yi döner. Hem
// ücretsiz ilk mahalle (saveSellerPrimaryLocation) hem ücretli ek mahalle
// (neighborhood-billing.ts'teki activatePaidServiceArea) bu upsert'i paylaşır.
export async function upsertNeighborhoodRecord(
  admin: SupabaseClient,
  rawSelection: LocationSelection,
): Promise<{ id: string; selection: LocationSelection }> {
  const selection = await validateLocationSelection(rawSelection);

  const { data: province, error: provinceError } = await admin
    .from("provinces")
    .upsert({ name: selection.provinceName }, { onConflict: "name" })
    .select("id")
    .single();
  if (provinceError || !province) throw new Error("İl kaydı oluşturulamadı.");

  const { data: district, error: districtError } = await admin
    .from("districts")
    .upsert(
      { province_id: province.id, name: selection.districtName },
      { onConflict: "province_id,name" },
    )
    .select("id")
    .single();
  if (districtError || !district) throw new Error("İlçe kaydı oluşturulamadı.");

  const { data: neighborhood, error: neighborhoodError } = await admin
    .from("neighborhoods")
    .upsert(
      {
        district_id: district.id,
        name: selection.settlementName,
        settlement_type: selection.settlementType satisfies SettlementType,
        is_active: true,
      },
      { onConflict: "district_id,name" },
    )
    .select("id")
    .single();
  if (neighborhoodError || !neighborhood) throw new Error("Mahalle kaydı oluşturulamadı.");

  return { id: neighborhood.id, selection };
}

export async function saveSellerPrimaryLocation(
  admin: SupabaseClient,
  userId: string,
  rawSelection: LocationSelection,
) {
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (storeError || !store) throw new Error("Mağaza kaydı bulunamadı.");

  const { id: neighborhoodId, selection } = await upsertNeighborhoodRecord(admin, rawSelection);

  const { data: existingAreas, error: areasError } = await admin
    .from("store_neighborhoods")
    .select("id, neighborhood_id, is_primary")
    .eq("store_id", store.id);
  if (areasError) throw new Error("Hizmet alanı okunamadı.");

  const existingTarget = existingAreas?.find((area) => area.neighborhood_id === neighborhoodId);
  const currentPrimary = existingAreas?.find((area) => area.is_primary);

  if (currentPrimary && currentPrimary.id !== existingTarget?.id) {
    const { error } = await admin
      .from("store_neighborhoods")
      .update({ is_primary: false })
      .eq("id", currentPrimary.id);
    if (error) throw new Error("Ana hizmet alanı güncellenemedi.");
  }

  const areaPayload = {
    store_id: store.id,
    neighborhood_id: neighborhoodId,
    province: selection.provinceName,
    district: selection.districtName,
    neighborhood: selection.settlementName,
    is_primary: true,
    is_active: true,
    activated_at: new Date().toISOString(),
  };

  const areaResult = existingTarget
    ? await admin.from("store_neighborhoods").update(areaPayload).eq("id", existingTarget.id)
    : await admin.from("store_neighborhoods").insert(areaPayload);
  if (areaResult.error) throw new Error("Ücretsiz ana hizmet alanı kaydedilemedi.");

  const { error: storeUpdateError } = await admin
    .from("stores")
    .update({
      province: selection.provinceName,
      district: selection.districtName,
      neighborhood: selection.settlementName,
    })
    .eq("id", store.id)
    .eq("owner_id", userId);
  if (storeUpdateError) throw new Error("Mağaza konumu güncellenemedi.");

  const { data: onboarding, error: onboardingReadError } = await admin
    .from("seller_onboardings")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (onboardingReadError) throw new Error("Onboarding durumu okunamadı.");

  if (onboarding && onboarding.status !== "COMPLETED") {
    const { data: updatedOnboarding, error: onboardingUpdateError } = await admin
      .from("seller_onboardings")
      .update({ current_step: "DELIVERY_AND_PAYMENT" })
      .eq("id", onboarding.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (onboardingUpdateError || !updatedOnboarding) {
      throw new Error("Onboarding teslimat adımına geçirilemedi.");
    }
  }

  return { selection, storeId: store.id };
}
