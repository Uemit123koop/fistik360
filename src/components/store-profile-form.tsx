"use client";

import { useState } from "react";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import type { LocationSelection } from "@/lib/location-types";

interface Props {
  initial: { name: string; description: string; phone: string; address: string; logoUrl: string; coverUrl: string };
  currentLocation?: string | null;
}

export function StoreProfileForm({ initial, currentLocation }: Props) {
  const [form, setForm] = useState(initial);
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback({});
    try {
      const response = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, location }),
      });
      const result = await response.json();
      setFeedback(response.ok ? { success: "Mağaza profilin ve mahalle ayarın güncellendi." } : { error: result.error ?? "Profil güncellenemedi." });
    } catch {
      setFeedback({ error: "Bağlantı kurulamadı." });
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2"><label className="form-field">İşletme adı<input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required /></label><label className="form-field">Telefon<input className="form-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} type="tel" inputMode="tel" maxLength={20} /></label></div>
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4"><p className="text-sm font-bold">Ana hizmet mahallesi</p><p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">{currentLocation ? `Şu an: ${currentLocation}. Değiştirmek için yeniden seç.` : "İlk mahallen ücretsizdir; mağazan bu mahallede görünür."}</p></div>
      <TurkeyLocationFields value={location} onChange={setLocation} compact />
    </div>
    <label className="form-field">Hakkımızda<textarea className="form-control min-h-32 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1500} /></label><label className="form-field">Açık adres<textarea className="form-control min-h-24 resize-y" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength={500} /></label><div className="grid gap-5 sm:grid-cols-2"><label className="form-field">Logo URL<input className="form-control" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} type="url" placeholder="https://..." /></label><label className="form-field">Kapak görseli URL<input className="form-control" value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} type="url" placeholder="https://..." /></label></div>{feedback.error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>}{feedback.success && <p className="rounded-[12px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>}<button type="submit" disabled={busy} className="button-primary">{busy ? "Kaydediliyor..." : "Mağaza profilini kaydet"}</button>
  </form>;
}
