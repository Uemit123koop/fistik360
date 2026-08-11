"use client";

import { useState } from "react";
import { WHOLESALE_CATEGORIES } from "@/lib/seller-registration";

interface Props {
  initial: {
    businessName: string;
    description: string;
    phone: string;
    logoUrl: string;
    coverUrl: string;
    categories: string[];
    isActive: boolean;
  };
}

export function WholesaleProfileForm({ initial }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  function toggleCategory(category: string) {
    setForm((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category] }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback({});
    try {
      const response = await fetch("/api/wholesale/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      setFeedback(response.ok ? { success: "Toptancı vitrinin güncellendi." } : { error: result.error ?? "Profil güncellenemedi." });
    } catch {
      setFeedback({ error: "Bağlantı kurulamadı." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field">İşletme adı<input className="form-control" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} maxLength={120} required /></label>
        <label className="form-field">Telefon<input className="form-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} type="tel" inputMode="tel" maxLength={20} /></label>
      </div>
      <label className="form-field">Hakkımızda<textarea className="form-control min-h-32 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1500} placeholder="Tedarik gücünüzü, ürün kalitenizi ve hizmet verdiğiniz bölgeleri anlatın." /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field">Logo URL<input className="form-control" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} type="url" placeholder="https://..." /></label>
        <label className="form-field">Kapak görseli URL<input className="form-control" value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} type="url" placeholder="https://..." /></label>
      </div>
      <fieldset><legend className="font-bold">Ürün kategorileri</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{WHOLESALE_CATEGORIES.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={form.categories.includes(category)} className={`min-h-11 rounded-[12px] border px-3 text-sm font-bold ${form.categories.includes(category) ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "border-[var(--color-border)]"}`}>{category}</button>)}</div></fieldset>
      <label className="flex min-h-12 items-start gap-3 rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="mt-0.5 h-5 w-5 accent-[var(--color-primary)]" /><span><strong>Vitrini yayınla.</strong><br />Yayınlandığında kuruyemişçi hesapları profilini ve aktif ürünlerini görebilir.</span></label>
      {feedback.error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>}
      {feedback.success && <p className="rounded-[12px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>}
      <button type="submit" disabled={busy} className="button-primary">{busy ? "Kaydediliyor..." : "Profili kaydet"}</button>
    </form>
  );
}

