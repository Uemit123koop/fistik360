"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationOption, LocationSelection } from "@/lib/location-types";

interface LocationFieldsProps {
  value: LocationSelection | null;
  onChange: (value: LocationSelection | null) => void;
  compact?: boolean;
}

async function loadOptions(level: "provinces" | "districts" | "settlements", parentId?: string) {
  const search = new URLSearchParams({ level });
  if (parentId) search.set("parentId", parentId);
  const response = await fetch(`/api/locations?${search.toString()}`);
  const payload = (await response.json()) as { items?: LocationOption[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Konumlar yüklenemedi.");
  return payload.items ?? [];
}

export function TurkeyLocationFields({ value, onChange, compact = false }: LocationFieldsProps) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [settlements, setSettlements] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState(value?.provinceId ?? "");
  const [districtId, setDistrictId] = useState(value?.districtId ?? "");
  const [settlementId, setSettlementId] = useState(value?.settlementId ?? "");
  const [loading, setLoading] = useState<"provinces" | "districts" | "settlements" | null>("provinces");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadOptions("provinces")
      .then((items) => { if (active) setProvinces(items); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provinceId) {
      return;
    }
    let active = true;
    loadOptions("districts", provinceId)
      .then((items) => { if (active) setDistricts(items); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(null); });
    return () => { active = false; };
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) {
      return;
    }
    let active = true;
    loadOptions("settlements", districtId)
      .then((items) => { if (active) setSettlements(items); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(null); });
    return () => { active = false; };
  }, [districtId]);

  const selection = useMemo(() => {
    const province = provinces.find((item) => item.id === provinceId);
    const district = districts.find((item) => item.id === districtId);
    const settlement = settlements.find((item) => item.id === settlementId);
    if (!province || !district || !settlement || !settlement.type) return null;
    return {
      provinceId: province.id,
      provinceName: province.name,
      districtId: district.id,
      districtName: district.name,
      settlementId: settlement.id,
      settlementName: settlement.name,
      settlementType: settlement.type,
    } satisfies LocationSelection;
  }, [districtId, districts, provinceId, provinces, settlementId, settlements]);

  useEffect(() => {
    const unchanged = value?.provinceId === selection?.provinceId
      && value?.districtId === selection?.districtId
      && value?.settlementId === selection?.settlementId;
    if (!unchanged) onChange(selection);
  }, [onChange, selection, value?.districtId, value?.provinceId, value?.settlementId]);

  const gridClass = compact ? "grid gap-3 md:grid-cols-3" : "grid gap-4 sm:grid-cols-3";

  return (
    <div>
      <div className={gridClass}>
        <label className="form-field">İl
          <select
            className="form-control"
            value={provinceId}
            onChange={(event) => {
              setProvinceId(event.target.value);
              setDistrictId("");
              setSettlementId("");
              setLoading(event.target.value ? "districts" : null);
              setError("");
              onChange(null);
            }}
            disabled={loading === "provinces"}
            required
          >
            <option value="">{loading === "provinces" ? "İller yükleniyor..." : "İl seç"}</option>
            {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="form-field">İlçe
          <select
            className="form-control"
            value={districtId}
            onChange={(event) => {
              setDistrictId(event.target.value);
              setSettlementId("");
              setLoading(event.target.value ? "settlements" : null);
              setError("");
              onChange(null);
            }}
            disabled={!provinceId || loading === "districts"}
            required
          >
            <option value="">{loading === "districts" ? "İlçeler yükleniyor..." : "İlçe seç"}</option>
            {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="form-field">Mahalle
          <select
            className="form-control"
            value={settlementId}
            onChange={(event) => setSettlementId(event.target.value)}
            disabled={!districtId || loading === "settlements"}
            required
          >
            <option value="">{loading === "settlements" ? "Mahalleler yükleniyor..." : "Mahalle seç"}</option>
            {settlements.map((item) => (
              <option key={`${item.type}-${item.id}`} value={item.id}>
                {item.name} Mahallesi
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-[var(--color-muted-text)]">
        Türkiye genelindeki il, ilçe ve mahalle verileri doğrulanarak yüklenir.
      </p>
    </div>
  );
}

export function PublicNeighborhoodFinder() {
  const router = useRouter();
  const [location, setLocation] = useState<LocationSelection | null>(null);

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!location) return;
        const search = new URLSearchParams({
          il: location.provinceName,
          ilce: location.districtName,
          mahalle: location.settlementId,
          mahalleAdi: location.settlementName,
        });
        router.push(`/magazalar?${search.toString()}`);
      }}
    >
      <TurkeyLocationFields value={location} onChange={setLocation} />
      <button type="submit" className="button-primary mt-6 w-full sm:w-auto" disabled={!location}>
        Mahallemdeki mağazaları göster
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </form>
  );
}
