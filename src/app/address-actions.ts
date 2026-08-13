"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth";
import type { LocationSelection } from "@/lib/location-types";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { upsertNeighborhoodRecord } from "@/lib/turkiye-locations";

export interface AddressActionResult {
  ok: boolean;
  message: string;
}

export interface NewAddressInput {
  location: LocationSelection;
  street: string;
  buildingNo: string;
  apartmentNo?: string;
  label?: string;
  makeDefault?: boolean;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function addAddressAction(input: NewAddressInput): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") {
    return { ok: false, message: "Adres eklemek için giriş yapmalısın." };
  }
  const street = input.street.trim();
  const buildingNo = input.buildingNo.trim();
  if (!street || !buildingNo) {
    return { ok: false, message: "Sokak ve bina no zorunludur." };
  }

  // TurkeyLocationFields, turkiyeapi.dev'in sayısal id'leriyle çalışır — bu yüzden
  // müşterinin seçtiği il/ilçe/mahalle'yi Supabase'deki gerçek neighborhoods.id'ye
  // (upsertNeighborhoodRecord ile) çevirmeden customer_addresses'e yazamayız.
  const admin = createSupabaseAdminClient();
  let neighborhoodId: string;
  try {
    const resolved = await upsertNeighborhoodRecord(admin, input.location);
    neighborhoodId = resolved.id;
  } catch {
    return { ok: false, message: "Seçilen mahalle doğrulanamadı." };
  }

  const supabase = await createSupabaseServerClient();

  if (input.makeDefault) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", user.id).eq("is_default", true);
  }

  const { count: existingCount } = await supabase
    .from("customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id);
  const isFirstAddress = !existingCount;

  const { error } = await supabase.from("customer_addresses").insert({
    customer_id: user.id,
    neighborhood_id: neighborhoodId,
    street,
    building_no: buildingNo,
    apartment_no: input.apartmentNo?.trim() || null,
    label: input.label?.trim() || null,
    is_default: Boolean(input.makeDefault) || isFirstAddress,
  });

  if (error) return { ok: false, message: "Adres kaydedilemedi." };

  revalidatePath("/dashboard/customer");
  return { ok: true, message: "Adres eklendi." };
}

export async function setDefaultAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") return { ok: false, message: "Giriş gerekli." };
  if (!isUuid(addressId)) return { ok: false, message: "Geçersiz adres." };

  const supabase = await createSupabaseServerClient();
  await supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", user.id).eq("is_default", true);
  const { error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", user.id);

  if (error) return { ok: false, message: "Varsayılan adres güncellenemedi." };
  revalidatePath("/dashboard/customer");
  return { ok: true, message: "Varsayılan adres güncellendi." };
}

export async function deleteAddressAction(addressId: string): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") return { ok: false, message: "Giriş gerekli." };
  if (!isUuid(addressId)) return { ok: false, message: "Geçersiz adres." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", user.id);
  if (error) return { ok: false, message: "Adres silinemedi." };

  revalidatePath("/dashboard/customer");
  return { ok: true, message: "Adres silindi." };
}
