"use client";

import { useEffect, useState } from "react";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import type { LocationSelection } from "@/lib/location-types";
import type { BillingInterval, PriceQuote } from "@/lib/neighborhood-billing";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const money = (value: number) => moneyFormatter.format(value);

interface BillingAddressForm {
  contactName: string;
  address: string;
  district: string;
  province: string;
  postalCode: string;
  identityNumber: string;
}

const emptyBillingAddress: BillingAddressForm = {
  contactName: "",
  address: "",
  district: "",
  province: "",
  postalCode: "",
  identityNumber: "",
};

export function AddNeighborhoodForm({ initialBillingAddress }: { initialBillingAddress: BillingAddressForm | null }) {
  const [pendingLocation, setPendingLocation] = useState<LocationSelection | null>(null);
  const [locations, setLocations] = useState<LocationSelection[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTH");
  const [billingAddress, setBillingAddress] = useState<BillingAddressForm>(initialBillingAddress ?? emptyBillingAddress);
  // Kayıtlı fatura bilginiz varsa (önceki bir mahalle alımından), her seferinde
  // aynı 6 alanlı formu baştan doldurtmak yerine özet gösterip yalnız "Değiştir"
  // denince tam formu açıyoruz.
  const [showBillingForm, setShowBillingForm] = useState(!initialBillingAddress);
  const [quote, setQuote] = useState<(PriceQuote & { totalAreasAfter: number }) | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Liste boşsa bir önceki fiyatı sıfırlamaya gerek yok — render tarafı
    // zaten locations.length === 0 iken quote'u hiç okumuyor.
    if (locations.length === 0) return;
    let cancelled = false;
    fetch("/api/seller/neighborhoods/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingInterval, newAreas: locations.length }),
    })
      .then((res) => res.json())
      .then((data: PriceQuote & { totalAreasAfter: number; error?: string }) => {
        if (!cancelled) setQuote(data.error ? null : data);
      })
      .catch(() => { if (!cancelled) setQuote(null); })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [locations.length, billingInterval]);

  function addLocationToList() {
    if (!pendingLocation) return;
    if (locations.some((loc) => loc.settlementId === pendingLocation.settlementId)) {
      setListError("Bu mahalle zaten listede.");
      return;
    }
    setLocations((current) => [...current, pendingLocation]);
    setPendingLocation(null);
    setListError(null);
    setQuoteLoading(true);
  }

  function removeLocation(index: number) {
    const next = locations.filter((_, i) => i !== index);
    setLocations(next);
    if (next.length > 0) setQuoteLoading(true);
  }

  const identityValid = /^\d{11}$/.test(billingAddress.identityNumber.replace(/\D/g, ""));
  const canSubmit = locations.length > 0
    && billingAddress.contactName.trim() !== ""
    && billingAddress.address.trim() !== ""
    && billingAddress.district.trim() !== ""
    && billingAddress.province.trim() !== ""
    && identityValid
    && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/neighborhoods/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSelections: locations, billingInterval, billingAddress }),
      });
      const result = await response.json();
      if (!response.ok || !result.paymentPageUrl) {
        setError(result.error ?? "Ödeme başlatılamadı.");
        setBusy(false);
        return;
      }
      window.location.href = result.paymentPageUrl;
    } catch {
      setError("Bağlantı kurulamadı.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div key={locations.length} className="rounded-[16px] border border-dashed border-[var(--color-border)] p-4">
        <TurkeyLocationFields
          value={pendingLocation}
          onChange={setPendingLocation}
          compact
          seedProvinceId={locations.at(-1)?.provinceId}
          seedDistrictId={locations.at(-1)?.districtId}
          autoFocusSettlement
          required={false}
        />
        {locations.length > 0 && (
          <p className="mt-2 text-xs text-[var(--color-muted-text)]">İl/ilçe son eklediğin mahalleyle aynı geldi, farklıysa değiştirebilirsin.</p>
        )}
        <button type="button" onClick={addLocationToList} disabled={!pendingLocation} className="button-secondary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-45">
          + Listeye ekle
        </button>
        {listError && <p className="mt-2 text-xs font-semibold text-[#8a3324]" role="alert">{listError}</p>}
      </div>

      {locations.length > 0 && (
        <ul className="space-y-2">
          {locations.map((loc, index) => (
            <li key={`${loc.settlementId}-${index}`} className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[var(--color-ink)]">{loc.settlementName} Mahallesi</span>
                <span className="block text-xs text-[var(--color-muted-text)]">{loc.districtName}, {loc.provinceName}</span>
              </span>
              <button type="button" onClick={() => removeLocation(index)} className="shrink-0 text-xs font-bold text-[#8a3324] hover:underline">Kaldır</button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="grid gap-3">
        <legend className="text-sm font-bold text-[var(--color-ink)]">Ödeme dönemi</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["MONTH", "YEAR"] as const).map((interval) => (
            <label
              key={interval}
              className={`flex cursor-pointer items-center gap-3 rounded-[14px] border p-3.5 text-sm ${
                billingInterval === interval ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] bg-white"
              }`}
            >
              <input type="radio" name="billing-interval" checked={billingInterval === interval} onChange={() => setBillingInterval(interval)} className="h-5 w-5 accent-[var(--color-primary)]" />
              <span className="font-bold text-[var(--color-ink)]">{interval === "MONTH" ? "Aylık" : "Yıllık"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm">
        {locations.length === 0 ? (
          <p className="text-[var(--color-muted-text)]">Fiyatı görmek için en az bir mahalle listeye ekle.</p>
        ) : quoteLoading ? (
          <p className="text-[var(--color-muted-text)]">Fiyat hesaplanıyor...</p>
        ) : quote ? (
          <>
            <p className="font-bold text-[var(--color-ink)]">
              {locations.length} mahalle eklersen toplam {quote.totalAreasAfter} mahalle olur → {money(quote.amount)} / {billingInterval === "MONTH" ? "ay" : "yıl"}
            </p>
            {quote.discountRate > 0 && (
              <p className="mt-1 text-xs font-semibold text-[var(--color-primary-dark)]">%{Math.round(quote.discountRate * 100)} hacim indirimi uygulandı.</p>
            )}
          </>
        ) : (
          <p className="text-[var(--color-muted-text)]">Fiyat şu anda hesaplanamadı.</p>
        )}
      </div>

      {!showBillingForm && initialBillingAddress ? (
        <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface-strong)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--color-ink)]">Fatura bilgin</p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-muted-text)]">
                {billingAddress.contactName} · {billingAddress.address}, {billingAddress.district}/{billingAddress.province}
              </p>
            </div>
            <button type="button" onClick={() => setShowBillingForm(true)} className="text-link shrink-0 text-sm">Değiştir</button>
          </div>
        </div>
      ) : (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-bold text-[var(--color-ink)] sm:col-span-2">Fatura bilgileri</legend>
          <label className="form-field">Ad soyad
            <input className="form-control" value={billingAddress.contactName} onChange={(e) => setBillingAddress({ ...billingAddress, contactName: e.target.value })} maxLength={120} required />
          </label>
          <label className="form-field">TC Kimlik No
            <input className="form-control" value={billingAddress.identityNumber} onChange={(e) => setBillingAddress({ ...billingAddress, identityNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })} inputMode="numeric" maxLength={11} required />
          </label>
          <label className="form-field sm:col-span-2">Açık adres
            <input className="form-control" value={billingAddress.address} onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })} maxLength={300} required />
          </label>
          <label className="form-field">İlçe
            <input className="form-control" value={billingAddress.district} onChange={(e) => setBillingAddress({ ...billingAddress, district: e.target.value })} maxLength={80} required />
          </label>
          <label className="form-field">İl
            <input className="form-control" value={billingAddress.province} onChange={(e) => setBillingAddress({ ...billingAddress, province: e.target.value })} maxLength={80} required />
          </label>
          <label className="form-field">Posta kodu <span className="font-normal opacity-60">(isteğe bağlı)</span>
            <input className="form-control" value={billingAddress.postalCode} onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })} maxLength={10} />
          </label>
          {initialBillingAddress && (
            <button type="button" onClick={() => { setBillingAddress(initialBillingAddress); setShowBillingForm(false); }} className="text-link justify-self-start text-sm sm:col-span-2">
              Vazgeç, kayıtlı bilgiyi kullan
            </button>
          )}
        </fieldset>
      )}

      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}

      <button type="submit" disabled={!canSubmit} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45">
        {busy
          ? "Yönlendiriliyor..."
          : locations.length > 1
            ? `İyzico ile öde ve ${locations.length} mahalleyi ekle`
            : "İyzico ile öde ve mahalleyi ekle"}
      </button>
    </form>
  );
}
