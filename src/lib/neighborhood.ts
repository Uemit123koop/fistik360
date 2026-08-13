import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const NEIGHBORHOOD_COOKIE = "fistik360_neighborhood";

export interface NeighborhoodPreference {
  // Local `neighborhoods.id` (uuid) — null when the picked address has no
  // match in our own geography tables yet (e.g. no store serves it).
  // NEVER the numeric id from the external turkiyeapi.dev picker; those two
  // id spaces are unrelated.
  id: string | null;
  name: string;
  district: string;
  province: string;
}

export async function getNeighborhoodPreference(): Promise<NeighborhoodPreference | null> {
  const store = await cookies();
  const raw = store.get(NEIGHBORHOOD_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NeighborhoodPreference>;
    if (typeof parsed.name === "string") {
      return {
        id: typeof parsed.id === "string" ? parsed.id : null,
        name: parsed.name,
        district: typeof parsed.district === "string" ? parsed.district : "",
        province: typeof parsed.province === "string" ? parsed.province : "",
      };
    }
  } catch {
    return null;
  }
  return null;
}

// Bridges the external Turkey geography picker (turkiye-locations.ts, numeric
// ids from api.turkiyeapi.dev) to our own `neighborhoods` table (uuid),
// matching by name — the same lookup keys used by
// saveSellerPrimaryLocation's upserts (provinces.name, districts(province_id,name),
// neighborhoods(district_id,name)). Read-only: returns null if no store has
// ever activated that neighborhood locally (nothing to upsert into for a
// customer-side pick).
export async function resolveLocalNeighborhoodId(
  provinceName: string,
  districtName: string,
  neighborhoodName: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data: province } = await supabase.from("provinces").select("id").eq("name", provinceName).maybeSingle();
  if (!province) return null;

  const { data: district } = await supabase
    .from("districts")
    .select("id")
    .eq("province_id", province.id)
    .eq("name", districtName)
    .maybeSingle();
  if (!district) return null;

  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("district_id", district.id)
    .eq("name", neighborhoodName)
    .maybeSingle();

  return neighborhood?.id ?? null;
}
