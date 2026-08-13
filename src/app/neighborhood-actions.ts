"use server";

import { cookies } from "next/headers";
import { NEIGHBORHOOD_COOKIE, resolveLocalNeighborhoodId, type NeighborhoodPreference } from "@/lib/neighborhood";

export async function setNeighborhoodPreference(picked: {
  provinceName: string;
  districtName: string;
  neighborhoodName: string;
}) {
  const id = await resolveLocalNeighborhoodId(picked.provinceName, picked.districtName, picked.neighborhoodName);
  const preference: NeighborhoodPreference = {
    id,
    name: picked.neighborhoodName,
    district: picked.districtName,
    province: picked.provinceName,
  };
  const store = await cookies();
  store.set(NEIGHBORHOOD_COOKIE, JSON.stringify(preference), {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
}

export async function clearNeighborhoodPreference() {
  const store = await cookies();
  store.delete(NEIGHBORHOOD_COOKIE);
}
