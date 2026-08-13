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
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTH");
  const [billingAddress, setBillingAddress] = useState<BillingAddressForm>(initialBillingAddress ?? emptyBillingAddress);
  const [quote, setQuote] = useState<(PriceQuote & { totalAreasAfter: number }) | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seller/neighborhoods/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingInterval }),
    })
      .then((res) => res.json())
      .then((data: PriceQuote & { totalAreasAfter: number; error?: string }) => {
        if (cancelled) return;
        setQuote(data.error ? null : data);
      })
      .catch(() => { if (!cancelled) setQuote(null); })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [billingInterval]);

  function selectBillingInterval(interval: BillingInterval) {
    setBillingInterval(interval);
    setQuoteLoading(true);
  }

  const identityValid = /^\d{11}$/.test(billingAddress.identityNumber.replace(/\D/g, ""));
  const canSubmit = Boolean(location)
    && billingAddress.contactName.trim() !== ""
    && billingAddress.address.trim() !== ""
    && billingAddress.district.trim() !== ""
    && billingAddress.province.trim() !== ""
    && identityValid
    && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || !location) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/seller/neighborhoods/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationSelection: location, billingInterval, billingAddress }),
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
      <TurkeyLocationFields value={location} onChange={setLocation} compact />

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
              <input type="radio" name="billing-interval" checked={billingInterval === interval} onChange={() => selectBillingInterval(interval)} className="h-5 w-5 accent-[var(--color-primary)]" />
              <span className="font-bold text-[var(--color-ink)]">{interval === "MONTH" ? "Aylık" : "Yıllık"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm">
        {quoteLoading ? (
          <p className="text-[var(--color-muted-text)]">Fiyat hesaplanıyor...</p>
        ) : quote ? (
          <>
            <p className="font-bold text-[var(--color-ink)]">
              Bu mahalleyi eklersen toplam {quote.totalAreasAfter} mahalle olur → {money(quote.amount)} / {billingInterval === "MONTH" ? "ay" : "yıl"}
            </p>
            {quote.discountRate > 0 && (
              <p className="mt-1 text-xs font-semibold text-[var(--color-primary-dark)]">%{Math.round(quote.discountRate * 100)} hacim indirimi uygulandı.</p>
            )}
          </>
        ) : (
          <p className="text-[var(--color-muted-text)]">Fiyat şu anda hesaplanamadı.</p>
        )}
      </div>

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
      </fieldset>

      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}

      <button type="submit" disabled={!canSubmit} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45">
        {busy ? "Yönlendiriliyor..." : "İyzico ile öde ve mahalleyi ekle"}
      </button>
    </form>
  );
}
