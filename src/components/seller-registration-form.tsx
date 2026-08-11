"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import type { LocationSelection } from "@/lib/location-types";
import {
  SELLER_TYPE_CONTENT,
  type SellerType,
  WHOLESALE_CATEGORIES,
} from "@/lib/seller-registration";

type Step = 1 | 2 | 3 | 4;

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

export function SellerRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellerFormData>(initialForm);
  const [otp, setOtp] = useState("");
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const sellerContent = form.sellerType ? SELLER_TYPE_CONTENT[form.sellerType] : null;

  function update<K extends keyof SellerFormData>(key: K, value: SellerFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function chooseSellerType(sellerType: SellerType) {
    update("sellerType", sellerType);
    setStep(2);
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

  async function requestOtp() {
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (form.sellerType === "NUT_STORE" && !location) {
      setError("Ücretsiz ana mahalleni seç.");
      setStep(3);
      return;
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
      setStep(4);
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
        body: JSON.stringify({ email: form.email, token: otp, location }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Kod doğrulanamadı.");
        return;
      }
      router.replace(result.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const totalSteps = form.sellerType === "NUT_STORE" ? 4 : 3;
  const visibleStep = form.sellerType === "WHOLESALE_SELLER" && step === 4 ? 3 : step;

  return (
    <div aria-busy={busy}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Mağazanı aç</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            {step === 1 ? "Nasıl satış yapacaksın?" : step === 2 ? "İşletmeni tanıyalım." : step === 3 ? "Ana mahalleni seç." : "E-postanı doğrula."}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-extrabold text-[var(--color-primary-dark)]">
          {visibleStep}/{totalSteps}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-strong)]" aria-label={`Kayıt ilerlemesi: ${totalSteps} adımın ${visibleStep}. adımı`}>
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(visibleStep / totalSteps) * 100}%` }} />
      </div>

      {step === 1 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(Object.keys(SELLER_TYPE_CONTENT) as SellerType[]).map((sellerType) => {
            const item = SELLER_TYPE_CONTENT[sellerType];
            return (
              <button key={sellerType} type="button" onClick={() => chooseSellerType(sellerType)} className="group min-h-56 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)] motion-reduce:transform-none">
                <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-accent)]">{item.destination}</span>
                <h3 className="mt-5 text-2xl font-bold text-[var(--color-ink)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--color-primary-dark)]">Seç ve devam et <ArrowIcon /></span>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && sellerContent && (
        <form className="mt-8 space-y-6" onSubmit={(event) => {
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--color-primary-soft)] p-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">Seçilen hesap</p><p className="mt-1 font-bold text-[var(--color-ink)]">{sellerContent.shortTitle} · {sellerContent.destination}</p></div>
            <button type="button" className="text-link" onClick={() => setStep(1)}>Değiştir</button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
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
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WHOLESALE_CATEGORIES.map((category) => {
                  const selected = form.categories.includes(category);
                  return <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={selected} className={`min-h-12 rounded-[12px] border px-3 py-2 text-sm font-bold transition-colors ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "border-[var(--color-border)] bg-white text-[var(--color-muted-text)] hover:border-[var(--color-primary-light)]"}`}>{category}</button>;
                })}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-[var(--color-ink)]">Onaylar ve ticari beyan</legend>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--color-border)] p-4 text-sm leading-6">
              <input type="checkbox" checked={form.kvkkAccepted} onChange={(event) => update("kvkkAccepted", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span><Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">KVKK Aydınlatma Metni</Link> kapsamında kişisel verilerimin işlenmesi hakkında bilgilendirildim.</span>
            </label>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--color-border)] p-4 text-sm leading-6">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span><Link href="/sayfalar/gizlilik-politikasi" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Gizlilik Politikası</Link> ile <Link href="/sayfalar/kullanim-sartlari" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Kullanım Şartları</Link> metinlerini okudum ve kabul ediyorum.</span>
            </label>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--color-border)] p-4 text-sm leading-6">
              <input type="checkbox" checked={form.invoiceReceiptDeclared} onChange={(event) => update("invoiceReceiptDeclared", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span>Siparişe ait geçerli fiş veya faturayı müşteriye/alıcı işletmeye teslim edeceğimi beyan ederim.</span>
            </label>
          </fieldset>

          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(1)} className="button-secondary">Geri</button>
            <button type="submit" disabled={busy} className="button-primary">{busy ? "Kod gönderiliyor..." : "E-posta kodunu gönder"} <ArrowIcon /></button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); void requestOtp(); }}>
          <div className="rounded-[18px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-5">
            <p className="font-bold text-[var(--color-ink)]">İlk hizmet mahallen ücretsiz</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Ürünlerin ve paketlerin seçtiğin bu mahallenin mağaza vitrininde gösterilir. Daha sonra ücretli planla ek mahalleler açabilirsin.</p>
          </div>
          <TurkeyLocationFields value={location} onChange={setLocation} />
          {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep(2)} className="button-secondary">Geri</button>
            <button type="submit" disabled={busy || !location} className="button-primary">{busy ? "Kod gönderiliyor..." : "Mahallemi seç ve kodu gönder"} <ArrowIcon /></button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="mt-8">
          <div className="rounded-[18px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary-dark)]"><ShieldIcon /></span>
            <p className="mt-4 font-bold text-[var(--color-ink)]">6 haneli kod {form.email} adresine gönderildi.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Kodun süresi dolduysa aynı bilgilerle yeniden gönderebilirsin. Supabase gönderim limitleri korunur.</p>
          </div>
          <label className="form-field mx-auto mt-6 max-w-md text-center">Doğrulama kodu
            <input className="form-control text-center font-mono text-2xl tracking-[0.32em]" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus />
          </label>
          {error && <p className="mx-auto mt-4 max-w-md rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
            <button type="button" onClick={() => void verifyOtp()} disabled={busy || otp.length !== 6} className="button-primary w-full">{busy ? "Doğrulanıyor..." : "Doğrula ve panele geç"} <ArrowIcon /></button>
            <button type="button" onClick={() => void requestOtp()} disabled={busy || !otpSent} className="button-secondary w-full">Kodu yeniden gönder</button>
            <button type="button" onClick={() => setStep(form.sellerType === "NUT_STORE" ? 3 : 2)} disabled={busy} className="text-link mx-auto">Bilgileri düzenle</button>
          </div>
        </div>
      )}
    </div>
  );
}
