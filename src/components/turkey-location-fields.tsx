"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setNeighborhoodPreference } from "@/app/neighborhood-actions";
import type { LocationOption, LocationSelection } from "@/lib/location-types";

interface LocationFieldsProps {
  value: LocationSelection | null;
  onChange: (value: LocationSelection | null) => void;
  compact?: boolean;
  // Yalnız ilk mount'ta okunur: il/ilçeyi önceden doldurup sadece mahalle seçimini
  // boş bırakmak için (ör. kayıtta arka arkaya aynı ilçeden birden çok mahalle
  // eklerken il/ilçeyi her seferinde yeniden seçtirmemek — bileşen `key` ile
  // remount edilerek çağrılır).
  seedProvinceId?: string;
  seedDistrictId?: string;
  // Mahalle listesi yüklenir yüklenmez seçiciyi odaklayıp (mümkünse) otomatik açar ve
  // yeşil kenarlıkla vurgular — çoklu mahalle ekleme akışında her ekleme sonrası bir
  // sonraki mahalleyi tek tıkla seçtirmek için. Diğer kullanım yerlerini etkilemez.
  autoFocusSettlement?: boolean;
  // false verilirse select'lerde native `required` uygulanmaz. "Listeye ekle" gibi
  // opsiyonel/tekrarlanabilir bir seçim aracı aynı <form> içindeki asıl submit
  // butonuyla paylaşıldığında, boş kalan bu alan tarayıcının native doğrulamasını
  // tetikleyip odağı buraya kaydırır — formun asıl gönderimini engeller.
  required?: boolean;
}

async function loadOptions(level: "provinces" | "districts" | "settlements", parentId?: string) {
  const search = new URLSearchParams({ level });
  if (parentId) search.set("parentId", parentId);
  const response = await fetch(`/api/locations?${search.toString()}`);
  const payload = (await response.json()) as { items?: LocationOption[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Konumlar yüklenemedi.");
  return payload.items ?? [];
}

export function TurkeyLocationFields({ value, onChange, compact = false, seedProvinceId, seedDistrictId, autoFocusSettlement = false, required = true }: LocationFieldsProps) {
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [settlements, setSettlements] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState(value?.provinceId ?? seedProvinceId ?? "");
  const [districtId, setDistrictId] = useState(value?.districtId ?? seedDistrictId ?? "");
  const [settlementId, setSettlementId] = useState(value?.settlementId ?? "");
  const [loading, setLoading] = useState<"provinces" | "districts" | "settlements" | null>("provinces");
  const [error, setError] = useState("");
  const settlementRef = useRef<HTMLSelectElement>(null);

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

  useEffect(() => {
    if (!autoFocusSettlement || settlementId || settlements.length === 0) return;
    const el = settlementRef.current;
    if (!el) return;
    el.focus();
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
      } catch {
        // Bazı tarayıcılar showPicker'ı yalnız doğrudan bir kullanıcı jestine
        // bağlı çağrılınca kabul eder — sessizce geç, odak zaten sağlandı.
      }
    }
  }, [autoFocusSettlement, settlementId, settlements]);

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
            required={required}
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
            required={required}
          >
            <option value="">{loading === "districts" ? "İlçeler yükleniyor..." : "İlçe seç"}</option>
            {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="form-field">Mahalle
          <select
            ref={settlementRef}
            className={`form-control ${autoFocusSettlement && !settlementId && settlements.length > 0 ? "border-2 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/25" : ""}`}
            value={settlementId}
            onChange={(event) => setSettlementId(event.target.value)}
            disabled={!districtId || loading === "settlements"}
            required={required}
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

export function PublicNeighborhoodFinder({ redirectTo = "/magazalar" }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!location || saving) return;
        setSaving(true);
        setNeighborhoodPreference({
          neighborhoodName: location.settlementName,
          districtName: location.districtName,
          provinceName: location.provinceName,
        }).then(() => {
          const search = new URLSearchParams({
            il: location.provinceName,
            ilce: location.districtName,
            mahalle: location.settlementId,
            mahalleAdi: location.settlementName,
          });
          router.push(`${redirectTo}?${search.toString()}`);
          router.refresh();
        });
      }}
    >
      <TurkeyLocationFields value={location} onChange={setLocation} />
      <button type="submit" className="button-primary mt-6 w-full sm:w-auto" disabled={!location || saving}>
        Mahallemdeki mağazaları göster
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </form>
  );
}
