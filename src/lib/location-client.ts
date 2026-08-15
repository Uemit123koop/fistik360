"use client";

import type { LocationSelection } from "@/lib/location-types";

// TurkeyLocationFields, Supabase'in kendi id'leri yerine turkiyeapi.dev'in sayısal
// id'lerini kullanır (bkz. /api/locations) — bu yüzden bir konumu seed etmek için
// Supabase id'lerini değil, il/ilçe/mahalle adlarını aynı API'de arayıp karşılık
// gelen sayısal id'leri buluyoruz.
export async function resolveLocationFromNames(
  provinceName: string,
  districtName: string,
  neighborhoodName: string,
): Promise<LocationSelection | null> {
  const sameName = (a: string, b: string) => a.localeCompare(b, "tr", { sensitivity: "base" }) === 0;
  try {
    const provinceRes = await fetch(`/api/locations?level=provinces`);
    const provinceJson = (await provinceRes.json()) as { items?: { id: string; name: string }[] };
    const province = provinceJson.items?.find((item) => sameName(item.name, provinceName));
    if (!province) return null;

    const districtRes = await fetch(`/api/locations?level=districts&parentId=${province.id}`);
    const districtJson = (await districtRes.json()) as { items?: { id: string; name: string }[] };
    const district = districtJson.items?.find((item) => sameName(item.name, districtName));
    if (!district) return null;

    const settlementRes = await fetch(`/api/locations?level=settlements&parentId=${district.id}`);
    const settlementJson = (await settlementRes.json()) as { items?: { id: string; name: string; type?: "NEIGHBORHOOD" }[] };
    const settlement = settlementJson.items?.find((item) => sameName(item.name, neighborhoodName));
    if (!settlement || !settlement.type) return null;

    return {
      provinceId: province.id,
      provinceName: province.name,
      districtId: district.id,
      districtName: district.name,
      settlementId: settlement.id,
      settlementName: settlement.name,
      settlementType: settlement.type,
    };
  } catch {
    return null;
  }
}
