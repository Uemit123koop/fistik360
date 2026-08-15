"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import type { LocationSelection } from "@/lib/location-types";
import type { PriceQuote } from "@/lib/neighborhood-billing";
import {
  SELLER_TYPE_CONTENT,
  type SellerType,
  WHOLESALE_CATEGORIES,
} from "@/lib/seller-registration";

type Step = 1 | 2 | 3 | 4 | 5;
type BillingPlan = "FREE" | "MONTH" | "YEAR";

interface SellerFormData {
  sellerType: SellerType | "";
  businessName: string;
  authorizedFullName: string;
  email: string;
  phone: string;
  categories: string[];
  kvkkAccepted: boolean;
  privacyAccepted: boolean;
  invoiceReceiptDeclared: boolean;
}

interface BillingAddressForm {
  contactName: string;
  street: string;
  buildingNo: string;
  addressNote: string;
  postalCode: string;
  identityNumber: string;
}

const initialForm: SellerFormData = {
  sellerType: "",
  businessName: "",
  authorizedFullName: "",
  email: "",
  phone: "",
  categories: [],
  kvkkAccepted: false,
  privacyAccepted: false,
  invoiceReceiptDeclared: false,
};

const emptyBillingAddress: BillingAddressForm = {
  contactName: "",
  street: "",
  buildingNo: "",
  addressNote: "",
  postalCode: "",
  identityNumber: "",
};

// locations[] içindeki mahallelerin en sık tekrar eden il/ilçesini bulur — fatura
// mahallesi seçicisini bununla tohumlarız (kullanıcı isterse değiştirebilir).
function mostCommonLocationSeed(locs: LocationSelection[]): { provinceId?: string; districtId?: string } {
  if (locs.length === 0) return {};
  const counts = new Map<string, number>();
  for (const loc of locs) {
    const key = `${loc.provinceId}::${loc.districtId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey = "";
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  const [provinceId, districtId] = bestKey.split("::");
  return { provinceId, districtId };
}

const PLAN_OPTIONS: Array<{ id: BillingPlan; title: string; price: string; unit: string; description: string }> = [
  { id: "FREE", title: "Ücretsiz", price: "Ücretsiz", unit: "1 mahalle", description: "Sadece 1 mahalle seçeceksin, sonsuza kadar ücretsiz." },
  { id: "MONTH", title: "Aylık Plan", price: "899₺", unit: "mahalle / ay", description: "İstediğin kadar mahalle ekle; hacim indirimi otomatik hesaplanır." },
  { id: "YEAR", title: "Yıllık Plan", price: "8990₺", unit: "mahalle / yıl", description: "Yıllık öde, 2 ay bedava kazan." },
];

// Çoklu mahalle ekleme adımında bir sonraki indirim kademesine kaç mahalle
// kaldığını gösteren teşvik edici mesaj — kullanıcıyı arka arkaya mahalle
// eklemeye özendirmek için (istenen "comic" tonlu uyarı).
function nextTierMessage(count: number): string {
  if (count >= 11) return "Zirvedesin! En yüksek indirim (%20) cebinde.";
  const nextThreshold = count < 4 ? 4 : count < 7 ? 7 : 11;
  const nextRate = nextThreshold === 4 ? 10 : nextThreshold === 7 ? 15 : 20;
  const remaining = nextThreshold - count;
  return `${remaining} mahalle daha ekle, %${nextRate} indirime atla!`;
}

export function SellerRegistrationForm({ onStepChange }: { onStepChange?: (step: number) => void } = {}) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellerFormData>(initialForm);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<{ message: string; redirectTo: string } | null>(null);

  const [billingPlan, setBillingPlan] = useState<BillingPlan | "">("");
  const [pendingLocation, setPendingLocation] = useState<LocationSelection | null>(null);
  const [locations, setLocations] = useState<LocationSelection[]>([]);
  const [billingAddress, setBillingAddress] = useState<BillingAddressForm>(emptyBillingAddress);
  const [billingLocation, setBillingLocation] = useState<LocationSelection | null>(null);
  const [quote, setQuote] = useState<(PriceQuote & { totalAreas: number }) | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const sellerContent = form.sellerType ? SELLER_TYPE_CONTENT[form.sellerType] : null;
  const isMultiPlan = billingPlan === "MONTH" || billingPlan === "YEAR";
  const billingLocationSeed = useMemo(() => mostCommonLocationSeed(locations), [locations]);

  useEffect(() => {
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!isMultiPlan || locations.length === 0) return;
    let cancelled = false;
    fetch("/api/pricing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAreas: locations.length, billingInterval: billingPlan }),
    })
      .then((res) => res.json())
      .then((data: PriceQuote & { totalAreas: number; error?: string }) => {
        if (!cancelled) setQuote(data.error ? null : data);
      })
      .catch(() => { if (!cancelled) setQuote(null); })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length, billingPlan]);

  function update<K extends keyof SellerFormData>(key: K, value: SellerFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function chooseSellerType(sellerType: SellerType) {
    update("sellerType", sellerType);
    setStep(2);
  }

  function choosePlan(plan: BillingPlan) {
    setBillingPlan(plan);
    setLocations([]);
    setPendingLocation(null);
    setQuote(null);
    setError("");
    setStep(4);
  }

  function toggleCategory(category: string) {
    update(
      "categories",
      form.categories.includes(category)
        ? form.categories.filter((item) => item !== category)
        : [...form.categories, category],
    );
  }

  function validateDetails() {
    if (!form.businessName.trim() || !form.authorizedFullName.trim()) return "İşletme ve yetkili bilgilerini tamamlayın.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Geçerli bir e-posta adresi girin.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Geçerli bir telefon numarası girin.";
    if (form.sellerType === "WHOLESALE_SELLER" && form.categories.length === 0) return "En az bir toptan ürün kategorisi seçin.";
    if (!form.kvkkAccepted || !form.privacyAccepted || !form.invoiceReceiptDeclared) return "Devam etmek için tüm onay ve beyanları işaretleyin.";
    return "";
  }

  function addLocationToList() {
    if (!pendingLocation) return;
    if (locations.some((loc) => loc.settlementId === pendingLocation.settlementId)) {
      setError("Bu mahalle zaten listede.");
      return;
    }
    setLocations((current) => [...current, pendingLocation]);
    setPendingLocation(null);
    setQuoteLoading(true);
    setError("");
  }

  function removeLocation(index: number) {
    const next = locations.filter((_, i) => i !== index);
    setLocations(next);
    if (next.length === 0) setQuote(null);
    else setQuoteLoading(true);
  }

  function validateBillingAddress() {
    const identity = billingAddress.identityNumber.replace(/\D/g, "");
    if (!billingAddress.contactName.trim() || !billingAddress.street.trim() || !billingAddress.buildingNo.trim()) {
      return "Fatura ünvanı, sokak ve bina no gerekli.";
    }
    if (!billingLocation) return "Fatura mahalleni seç.";
    if (!/^\d{10}$|^\d{11}$/.test(identity)) return "Geçerli bir Vergi No (10 hane) veya TC Kimlik No (11 hane) gir.";
    return "";
  }

  function composeBillingAddressLine() {
    const note = billingAddress.addressNote.trim();
    return `${billingAddress.street.trim()} No:${billingAddress.buildingNo.trim()}${note ? `, ${note}` : ""}`;
  }

  async function requestOtp() {
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (form.sellerType === "NUT_STORE") {
      if (locations.length === 0) {
        setError("En az bir mahalle seç.");
        setStep(4);
        return;
      }
      if (isMultiPlan) {
        const addressError = validateBillingAddress();
        if (addressError) {
          setError(addressError);
          setStep(4);
          return;
        }
      }
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seller/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Doğrulama kodu gönderilemedi.");
        return;
      }
      setOtpSent(true);
      setStep(5);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setError("E-postanıza gelen 6 haneli kodu girin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seller/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          token: otp,
          locations,
          billingPlan: isMultiPlan ? billingPlan : undefined,
          billingAddress: isMultiPlan
            ? {
                contactName: billingAddress.contactName,
                identityNumber: billingAddress.identityNumber,
                postalCode: billingAddress.postalCode,
                address: composeBillingAddressLine(),
                province: billingLocation?.provinceName ?? "",
                district: billingLocation?.districtName ?? "",
                neighborhood: billingLocation?.settlementName ?? "",
              }
            : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Kod doğrulanamadı.");
        return;
      }
      if (result.warning) {
        // Hesap açıldı ama ödeme/mahalle aktivasyonu bir nedenle atlandı — kullanıcı
        // sebebi görmeden sessizce panele düşmesin, burada durup göstersin.
        setWarning({ message: result.warning, redirectTo: result.redirectTo ?? "/dashboard" });
        return;
      }
      window.location.href = result.redirectTo ?? "/dashboard";
    } catch {
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const totalSteps = form.sellerType === "NUT_STORE" ? 5 : 3;
  const visibleStep = form.sellerType === "WHOLESALE_SELLER" && step === 5 ? 3 : step;
  const stepTitle = step === 1 ? "Nasıl satış yapacaksın?"
    : step === 2 ? "İşletmeni tanıyalım."
    : step === 3 ? "Bir plan seç."
    : step === 4 ? "Mahalle(ler)ini seç."
    : "E-postanı doğrula.";

  return (
    <div aria-busy={busy} className="@container">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Mağazanı aç</p>
          <h2 className="mt-1.5 font-serif text-xl font-bold text-[var(--color-ink)] @sm:text-2xl">{stepTitle}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-extrabold text-[var(--color-primary-dark)]">
          {visibleStep}/{totalSteps}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-strong)]" aria-label={`Kayıt ilerlemesi: ${totalSteps} adımın ${visibleStep}. adımı`}>
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(visibleStep / totalSteps) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="mt-6 grid gap-3 @sm:grid-cols-2">
          {(Object.keys(SELLER_TYPE_CONTENT) as SellerType[]).map((sellerType) => {
            const item = SELLER_TYPE_CONTENT[sellerType];
            return (
              <button key={sellerType} type="button" onClick={() => chooseSellerType(sellerType)} className="group rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none">
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--color-accent)]">{item.destination}</span>
                <h3 className="mt-3 text-lg font-bold text-[var(--color-ink)]">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-text)]">{item.description}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary-dark)]">Seç ve devam et <ArrowIcon className="h-3.5 w-3.5" /></span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && sellerContent && (
        <form className="mt-6 space-y-5" onSubmit={(event) => {
          event.preventDefault();
          const validationError = validateDetails();
          if (validationError) {
            setError(validationError);
            return;
          }
          if (form.sellerType === "NUT_STORE") {
            setError("");
            setStep(3);
          } else {
            void requestOtp();
          }
        }}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[var(--color-primary-soft)] p-3.5">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent)]">Seçilen hesap</p><p className="mt-0.5 text-sm font-bold text-[var(--color-ink)]">{sellerContent.shortTitle} · {sellerContent.destination}</p></div>
            <button type="button" className="text-link" onClick={() => setStep(1)}>Değiştir</button>
          </div>
          <div className="grid gap-4 @sm:grid-cols-2">
            <label className="form-field">İşletme adı
              <input className="form-control" value={form.businessName} onChange={(event) => update("businessName", event.target.value)} maxLength={120} autoComplete="organization" required />
            </label>
            <label className="form-field">Yetkili ad soyad
              <input className="form-control" value={form.authorizedFullName} onChange={(event) => update("authorizedFullName", event.target.value)} maxLength={120} autoComplete="name" required />
            </label>
            <label className="form-field">E-posta
              <input className="form-control" value={form.email} onChange={(event) => update("email", event.target.value)} type="email" autoComplete="email" placeholder="isletme@ornek.com" required />
            </label>
            <label className="form-field">Telefon numarası
              <input className="form-control" value={form.phone} onChange={(event) => update("phone", event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" maxLength={20} required />
            </label>
          </div>

          {form.sellerType === "WHOLESALE_SELLER" && (
            <fieldset>
              <legend className="text-sm font-bold text-[var(--color-ink)]">Hangi ürünleri sunuyorsun?</legend>
              <p className="mt-1 text-sm text-[var(--color-muted-text)]">Bir veya daha fazla kategori seçebilirsin.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 @sm:grid-cols-3 @lg:grid-cols-4">
                {WHOLESALE_CATEGORIES.map((category) => {
                  const selected = form.categories.includes(category);
                  return <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={selected} className={`min-h-12 rounded-[12px] border px-3 py-2 text-sm font-bold transition-colors ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "border-[var(--color-border)] bg-white text-[var(--color-muted-text)] hover:border-[var(--color-primary-light)]"}`}>{category}</button>;
                })}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-bold text-[var(--color-ink)]">Onaylar ve ticari beyan</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-sm leading-5">
              <input type="checkbox" checked={form.kvkkAccepted} onChange={(event) => update("kvkkAccepted", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span><Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">KVKK Aydınlatma Metni</Link> kapsamında kişisel verilerimin işlenmesi hakkında bilgilendirildim.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-sm leading-5">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span><Link href="/sayfalar/gizlilik-politikasi" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Gizlilik Politikası</Link> ile <Link href="/sayfalar/kullanim-sartlari" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Kullanım Şartları</Link> metinlerini okudum ve kabul ediyorum.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-sm leading-5">
              <input type="checkbox" checked={form.invoiceReceiptDeclared} onChange={(event) => update("invoiceReceiptDeclared", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span>Siparişe ait geçerli fiş veya faturayı müşteriye/alıcı işletmeye teslim edeceğimi beyan ederim.</span>
            </label>
          </fieldset>

          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-2.5 @sm:flex-row @sm:justify-between">
            <button type="button" onClick={() => setStep(1)} className="button-secondary">Geri</button>
            <button type="submit" disabled={busy} className="button-primary">{busy ? "Kod gönderiliyor..." : form.sellerType === "NUT_STORE" ? "Devam et" : "E-posta kodunu gönder"} <ArrowIcon /></button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3">
            {PLAN_OPTIONS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => choosePlan(plan.id)}
                className="group flex items-center justify-between gap-4 rounded-[16px] border border-[var(--color-border)] bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]"
              >
                <div>
                  <p className="text-base font-bold text-[var(--color-ink)]">{plan.title}</p>
                  <p className="mt-1 text-sm leading-5 text-[var(--color-muted-text)]">{plan.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold text-[var(--color-primary-dark)]">{plan.price}</p>
                  <p className="text-xs text-[var(--color-muted-text)]">{plan.unit}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--color-muted-text)]">
            Aylık/yıllık planlarda 4+ mahallede %10, 7+&apos;de %15, 11+&apos;de %20 indirim otomatik uygulanır.{" "}
            <Link href="/fiyatlandirma" className="text-link">Fiyatlandırmayı gör</Link>
          </p>
          <div className="flex justify-start">
            <button type="button" onClick={() => setStep(2)} className="button-secondary">Geri</button>
          </div>
        </div>
      )}

      {step === 4 && billingPlan === "FREE" && (
        <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void requestOtp(); }}>
          <div className="rounded-[14px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4">
            <p className="text-sm font-bold text-[var(--color-ink)]">İlk hizmet mahallen ücretsiz</p>
            <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-text)]">Ürünlerin ve paketlerin seçtiğin bu mahallenin mağaza vitrininde gösterilir. Daha sonra ücretli planla ek mahalleler açabilirsin.</p>
          </div>
          <TurkeyLocationFields value={pendingLocation} onChange={(loc) => { setPendingLocation(loc); if (loc) setLocations([loc]); else setLocations([]); }} />
          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-2.5 @sm:flex-row @sm:justify-between">
            <button type="button" onClick={() => setStep(3)} className="button-secondary">Geri</button>
            <button type="submit" disabled={busy || locations.length === 0} className="button-primary">{busy ? "Kod gönderiliyor..." : "Mahallemi seç ve kodu gönder"} <ArrowIcon /></button>
          </div>
        </form>
      )}

      {step === 4 && isMultiPlan && (
        <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void requestOtp(); }}>
          <div className="rounded-[14px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4">
            <p className="text-sm font-bold text-[var(--color-ink)]">Mahalle ekle, artıya bas</p>
            <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-text)]">Seçtiğin her mahalle {billingPlan === "MONTH" ? "899₺/ay" : "8990₺/yıl"}. Ne kadar çok mahalle, o kadar yüksek indirim.</p>
          </div>

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
          </div>

          {locations.length > 0 && (
            <ul className="space-y-2">
              {locations.map((loc, index) => (
                <li key={`${loc.settlementId}-${index}`} className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--color-border-soft)] bg-white p-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-[var(--color-ink)]">{loc.settlementName} Mahallesi</span>
                    <span className="block text-xs text-[var(--color-muted-text)]">{loc.districtName}, {loc.provinceName}</span>
                  </span>
                  <button type="button" onClick={() => removeLocation(index)} className="shrink-0 text-xs font-bold text-[#8a3324] hover:underline">Kaldır</button>
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-hidden rounded-[18px] bg-[#12382b] p-5 text-white shadow-[0_14px_32px_rgba(18,56,43,.28)]">
            {locations.length === 0 ? (
              <p className="text-sm text-white/70">Fiyatı görmek için en az bir mahalle ekle.</p>
            ) : quoteLoading ? (
              <p className="text-sm text-white/70">Fiyat hesaplanıyor...</p>
            ) : quote ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#d7ec9c]">
                    {billingPlan === "MONTH" ? "Aylık toplam" : "Yıllık toplam"}
                  </p>
                  {quote.discountRate > 0 && (
                    <span className="rounded-full bg-[#d7ec9c] px-2.5 py-1 text-[11px] font-extrabold text-[#12382b]">
                      %{Math.round(quote.discountRate * 100)} indirim
                    </span>
                  )}
                </div>
                <p className="mt-2 font-serif text-3xl font-bold tracking-[-0.02em]">
                  {quote.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 })}
                  <span className="ml-1.5 text-base font-bold text-white/55">/ {billingPlan === "MONTH" ? "ay" : "yıl"}</span>
                </p>
                <p className="mt-2 text-xs text-white/65">
                  {quote.totalAreas} mahalle × {quote.unitPrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 })}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/70">Fiyat şu anda hesaplanamadı.</p>
            )}
          </div>

          {locations.length > 0 && (
            <div className="rounded-[14px] border-2 border-dashed border-[var(--color-accent)] bg-[#fff9ec] p-3.5 text-center">
              <p className="text-sm font-extrabold text-[#8a5a17]">{nextTierMessage(locations.length)}</p>
            </div>
          )}

          {locations.length > 0 && (
            <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
              <div className="text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-accent)]">Son adım</p>
                <h3 className="mt-1.5 font-serif text-2xl font-bold text-[var(--color-ink)]">Fatura bilgileri</h3>
                <div aria-hidden="true" className="mx-auto mt-3 h-px w-16 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
                <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-[var(--color-muted-text)]">
                  Ödemeni İyzico&apos;nun güvenli altyapısıyla tamamlayacaksın; bu bilgiler faturana işlenir.
                </p>
              </div>

              <fieldset className="mt-6 grid gap-4 @sm:grid-cols-2">
                <label className="form-field @sm:col-span-2">Fatura ünvanı (Ad Soyad)
                  <input className="form-control" value={billingAddress.contactName} onChange={(e) => setBillingAddress({ ...billingAddress, contactName: e.target.value })} maxLength={120} required />
                </label>
                <label className="form-field @sm:col-span-2">Vergi No veya TC Kimlik No
                  <input className="form-control" value={billingAddress.identityNumber} onChange={(e) => setBillingAddress({ ...billingAddress, identityNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })} inputMode="numeric" maxLength={11} placeholder="10 haneli Vergi No veya 11 haneli TC Kimlik No" required />
                </label>

                <div className="@sm:col-span-2">
                  <p className="mb-2 text-xs font-bold text-[var(--color-muted-text)]">Fatura mahallen</p>
                  <TurkeyLocationFields
                    value={billingLocation}
                    onChange={setBillingLocation}
                    compact
                    seedProvinceId={billingLocationSeed.provinceId}
                    seedDistrictId={billingLocationSeed.districtId}
                  />
                </div>

                <label className="form-field">Sokak
                  <input className="form-control" value={billingAddress.street} onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })} maxLength={150} placeholder="Örn. Atatürk Caddesi" required />
                </label>
                <label className="form-field">Bina No
                  <input className="form-control" value={billingAddress.buildingNo} onChange={(e) => setBillingAddress({ ...billingAddress, buildingNo: e.target.value })} maxLength={20} placeholder="Örn. 12/3" required />
                </label>
                <label className="form-field @sm:col-span-2">Ek adres <span className="font-normal opacity-60">(isteğe bağlı)</span>
                  <input className="form-control" value={billingAddress.addressNote} onChange={(e) => setBillingAddress({ ...billingAddress, addressNote: e.target.value })} maxLength={150} placeholder="Örn. Kat 2, Daire 4" />
                </label>
                <label className="form-field @sm:col-span-2">Posta kodu <span className="font-normal opacity-60">(isteğe bağlı)</span>
                  <input className="form-control" value={billingAddress.postalCode} onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })} maxLength={10} />
                </label>
              </fieldset>
            </div>
          )}

          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-2.5 @sm:flex-row @sm:justify-between">
            <button type="button" onClick={() => setStep(3)} className="button-secondary">Geri</button>
            <button type="submit" disabled={busy || locations.length === 0} className="button-primary">
              {busy ? "Kod gönderiliyor..." : "Mahallelerimi seç ve kodu gönder"} <ArrowIcon />
            </button>
          </div>
        </form>
      )}

      {step === 5 && (
        <div className="mt-6">
          <div className="rounded-[14px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-primary-dark)]"><ShieldIcon className="h-4.5 w-4.5" /></span>
            <p className="mt-3 text-sm font-bold text-[var(--color-ink)]">6 haneli kod {form.email} adresine gönderildi.</p>
            <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-text)]">
              {isMultiPlan
                ? "Kodu doğruladığında seçtiğin mahalleler için hemen İyzico ödeme sayfasına yönlendirilirsin."
                : "Kodun süresi dolduysa aynı bilgilerle yeniden gönderebilirsin."}
            </p>
          </div>
          <label className="form-field mx-auto mt-5 max-w-xs text-center">Doğrulama kodu
            <input className="form-control text-center font-mono text-2xl tracking-[0.32em]" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus />
          </label>
          {error && <p className="mx-auto mt-4 max-w-xs rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          {warning && (
            <p className="mx-auto mt-4 max-w-xs rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 font-semibold text-amber-900" role="alert">
              {warning.message}
            </p>
          )}
          {warning ? (
            <div className="mx-auto mt-5 max-w-xs">
              <Link href={warning.redirectTo} className="button-primary w-full">Panele git <ArrowIcon /></Link>
            </div>
          ) : (
            <div className="mx-auto mt-5 flex max-w-xs flex-col gap-2.5">
              <button type="button" onClick={() => void verifyOtp()} disabled={busy || otp.length !== 6} className="button-primary w-full">{busy ? "Doğrulanıyor..." : isMultiPlan ? "Doğrula ve ödemeye geç" : "Doğrula ve panele geç"} <ArrowIcon /></button>
              <button type="button" onClick={() => void requestOtp()} disabled={busy || !otpSent} className="button-secondary w-full">Kodu yeniden gönder</button>
              <button type="button" onClick={() => setStep(form.sellerType === "NUT_STORE" ? 4 : 2)} disabled={busy} className="text-link mx-auto">Bilgileri düzenle</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
