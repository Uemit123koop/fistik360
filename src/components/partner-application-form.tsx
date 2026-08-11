"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PARTNER_CATEGORIES } from "@/lib/partner";

const steps = ["İşletme", "Marka", "Belgeler", "Doğrulama"];
const stepFields = [
  ["companyName", "authorizedPerson", "email", "phone", "taxNumber", "taxOffice"],
  ["brandName", "foundedYear", "website", "instagram", "brandDescription", "categories"],
  ["logo", "cover", "taxDocument", "foodDocument", "trademarkDocument"],
  ["shipsNationwide", "termsAccepted"],
];
type Message = { type: "error" | "success"; text: string } | null;

export function PartnerApplicationForm() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [submitted, setSubmitted] = useState(false);
  const draft = useRef(new FormData());
  const progress = useMemo(() => `${((step + 1) / steps.length) * 100}%`, [step]);

  async function requestOtp() {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/partner/auth/request-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ type: "error", text: result.error });
    setOtpSent(true); setMessage({ type: "success", text: "6 haneli kod e-posta adresine gönderildi." });
  }

  async function verifyOtp() {
    setBusy(true); setMessage(null);
    const response = await fetch("/api/partner/auth/verify-otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token: otp }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ type: "error", text: result.error });
    setVerified(true); setMessage({ type: "success", text: "E-posta doğrulandı. Başvurunu gönderebilirsin." });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visibleData = new FormData(event.currentTarget);
    for (const key of stepFields[step]) draft.current.delete(key);
    for (const [key, value] of visibleData.entries()) {
      if (!(value instanceof File) || value.size > 0) draft.current.append(key, value);
    }
    if (step < steps.length - 1) {
      setStep((value) => value + 1); setMessage(null); window.scrollTo({ top: 0, behavior: "smooth" }); return;
    }
    if (!verified) return setMessage({ type: "error", text: "Başvuruyu göndermeden önce e-postanı doğrula." });
    setBusy(true); setMessage(null);
    const response = await fetch("/api/partner/applications", { method: "POST", body: draft.current });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage({ type: "error", text: result.error });
    setSubmitted(true);
  }

  if (submitted) return <div className="border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-7 sm:p-10"><p className="eyebrow">Başvuru alındı</p><h2 className="mt-3 font-serif text-3xl font-bold">Markan inceleme sırasına eklendi.</h2><p className="mt-4 max-w-2xl leading-7 text-[var(--color-muted-text)]">Belgelerini inceleyip sonucu doğruladığın e-posta adresinden paylaşacağız.</p><Link href="/" className="button-primary mt-7">Ana sayfaya dön</Link></div>;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[220px_1fr]" encType="multipart/form-data">
      <aside className="self-start border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] lg:sticky lg:top-28">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-strong)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200" style={{ width: progress }} /></div>
        <p className="mt-3 text-sm font-bold">{step + 1}/{steps.length} · {steps[step]}</p>
        <ol className="mt-4 hidden space-y-1 lg:block">{steps.map((label, index) => <li key={label} className={`flex min-h-11 items-center gap-3 px-3 text-sm font-bold ${index === step ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : index < step ? "text-[var(--color-primary)]" : "text-[var(--color-muted-text)]"}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${index <= step ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-strong)]"}`}>{index + 1}</span>{label}</li>)}</ol>
      </aside>

      <div className="border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-8">
        {step === 0 && <fieldset className="grid gap-5 sm:grid-cols-2"><legend className="mb-2 text-2xl font-bold sm:col-span-2">İşletme bilgilerin</legend><p className="mb-3 text-sm text-[var(--color-muted-text)] sm:col-span-2">Sözleşme ve değerlendirme için temel firma bilgilerini paylaş.</p><Field label="Firma unvanı" name="companyName" required /><Field label="Yetkili ad soyad" name="authorizedPerson" required /><Field label="E-posta" name="email" type="email" required value={email} onChange={setEmail} /><Field label="Telefon" name="phone" type="tel" required /><Field label="Vergi numarası" name="taxNumber" inputMode="numeric" pattern="[0-9]{10,11}" required /><Field label="Vergi dairesi" name="taxOffice" required /></fieldset>}
        {step === 1 && <fieldset className="grid gap-5 sm:grid-cols-2"><legend className="mb-2 text-2xl font-bold sm:col-span-2">Markanı tanıt</legend><Field label="Marka adı" name="brandName" required /><Field label="Kuruluş yılı" name="foundedYear" type="number" min="1800" max={new Date().getFullYear()} /><Field label="Web sitesi" name="website" type="url" placeholder="https://" /><Field label="Instagram" name="instagram" placeholder="@markanız" /><label className="form-field sm:col-span-2">Marka hikâyesi<textarea className="form-control min-h-36 resize-y" name="brandDescription" minLength={40} maxLength={3000} required placeholder="Ürünlerini, üretim yaklaşımını ve markanı farklı kılan şeyi anlat." /></label><div className="sm:col-span-2"><p className="form-field">Ürün kategorileri</p><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{PARTNER_CATEGORIES.map((category) => <label key={category} className="flex min-h-12 items-center gap-3 border border-[var(--color-border)] p-3 text-sm font-bold"><input type="checkbox" name="categories" value={category} className="h-5 w-5 accent-[var(--color-primary)]" />{category}</label>)}</div></div></fieldset>}
        {step === 2 && <fieldset><legend className="text-2xl font-bold">Logo ve belgeler</legend><p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Logo ve kapak marka mağazanda kullanılır. Resmî belgeler private alanda tutulur ve yalnız yetkili admin tarafından görülür.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><FileField label="Marka logosu *" name="logo" accept="image/jpeg,image/png,image/webp,image/avif" required /><FileField label="Kapak görseli" name="cover" accept="image/jpeg,image/png,image/webp,image/avif" /><FileField label="Vergi / şirket belgesi *" name="taxDocument" accept="application/pdf,image/jpeg,image/png" required /><FileField label="Gıda işletme belgesi *" name="foodDocument" accept="application/pdf,image/jpeg,image/png" required /><FileField label="Marka tescil belgesi" name="trademarkDocument" accept="application/pdf,image/jpeg,image/png" /></div></fieldset>}
        {step === 3 && <fieldset><legend className="text-2xl font-bold">E-postanı doğrula</legend><p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]"><strong>{email || "E-posta adresine"}</strong> 6 haneli tek kullanımlık kod göndereceğiz.</p><div className="mt-6 max-w-lg space-y-4"><button type="button" onClick={requestOtp} disabled={busy || !email || verified} className="button-secondary w-full">{otpSent ? "Kodu yeniden gönder" : "Doğrulama kodu gönder"}</button>{otpSent && !verified && <div className="flex flex-col gap-3 sm:flex-row"><label className="form-field flex-1">6 haneli kod<input className="form-control text-center font-mono text-xl tracking-[.3em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" /></label><button type="button" onClick={verifyOtp} disabled={busy || otp.length !== 6} className="button-primary self-end">Doğrula</button></div>}<label className="flex min-h-12 items-start gap-3 border border-[var(--color-border)] p-4 text-sm leading-6"><input type="checkbox" name="shipsNationwide" value="true" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" /><span>Siparişleri kendi depomdan hazırlayıp Türkiye geneline gönderebiliyorum.</span></label><label className="flex min-h-12 items-start gap-3 bg-[var(--color-surface)] p-4 text-sm leading-6"><input type="checkbox" name="termsAccepted" value="true" required className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]" /><span>Partner programı koşullarını ve bilgilerimin başvuru değerlendirmesi amacıyla işlenmesini kabul ediyorum.</span></label></div></fieldset>}
        {step === 3 && <p className="mt-4 text-sm leading-6 text-[var(--color-muted-text)]">Başvuru onayından önce <Link href="/sayfalar/kullanim-sartlari" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Kullanım Şartları</Link>, <Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">KVKK Aydınlatma Metni</Link> ve <Link href="/sayfalar/gizlilik-politikasi" className="font-bold text-[var(--color-primary-dark)] underline underline-offset-2">Gizlilik Politikası</Link> bağlantılarını inceleyebilirsiniz.</p>}
        {message && <div role={message.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-6 border p-4 text-sm font-bold ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"}`}>{message.text}</div>}
        <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[var(--color-border-soft)] bg-white/95 pb-[max(0rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-sm"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || busy} className="button-secondary">Geri</button><button type="submit" disabled={busy || (step === 3 && !verified)} className="button-primary">{busy ? "İşleniyor…" : step === 3 ? "Başvuruyu gönder" : "Devam et"}</button></div>
      </div>
    </form>
  );
}

function Field({ label, name, value, onChange, ...props }: { label: string; name: string; value?: string; onChange?: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange">) { return <label className="form-field">{label}<input className="form-control" name={name} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} {...props} /></label>; }
function FileField({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="form-field">{label}<input className="form-control file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-primary-soft)] file:px-3 file:py-1 file:font-bold file:text-[var(--color-primary-dark)]" type="file" name={name} {...props} /></label>; }
