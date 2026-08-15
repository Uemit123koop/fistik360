"use client";

import { useEffect, useState } from "react";
import { MapPinIcon } from "@/components/marketplace-ui";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import { resolveLocationFromNames } from "@/lib/location-client";
import type { LocationSelection } from "@/lib/location-types";

function StoreIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 10v9a1 1 0 0 0 1 1h4v-6h6v6h4a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10 12 3l9 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6.6 4h3l1.4 4.5-2.2 1.6a12 12 0 0 0 5.1 5.1l1.6-2.2 4.5 1.4v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.6 6.2 2 2 0 0 1 6.6 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PrimaryLocationNames {
  provinceName: string;
  districtName: string;
  neighborhoodName: string;
}

interface Props {
  initial: { name: string; description: string; phone: string; address: string; logoUrl: string; coverUrl: string };
  primaryLocationNames?: PrimaryLocationNames | null;
}

export function StoreProfileForm({ initial, primaryLocationNames }: Props) {
  const [form, setForm] = useState(initial);
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [locationLoading, setLocationLoading] = useState(Boolean(primaryLocationNames));
  const [locationResolveFailed, setLocationResolveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  useEffect(() => {
    if (!primaryLocationNames) return;
    let active = true;
    resolveLocationFromNames(primaryLocationNames.provinceName, primaryLocationNames.districtName, primaryLocationNames.neighborhoodName)
      .then((resolved) => {
        if (!active) return;
        if (resolved) setLocation(resolved);
        else setLocationResolveFailed(true);
      })
      .finally(() => { if (active) setLocationLoading(false); });
    return () => { active = false; };
    // Yalnız ilk mount'ta çalışsın — kullanıcı seçiciyle değiştirdikten sonra bu efekt
    // yeniden tetiklenip seçimini mevcut ana mahalleyle ezmemeli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (locationLoading) return;
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

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="form-field">
            <span className="flex items-center gap-1.5 text-[var(--color-primary-dark)]"><StoreIcon /> İşletme adı</span>
            <input className="form-control" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required />
          </label>
          <label className="form-field">
            <span className="flex items-center gap-1.5 text-[var(--color-primary-dark)]"><PhoneIcon /> Telefon</span>
            <input className="form-control" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} type="tel" inputMode="tel" maxLength={20} />
          </label>
        </div>

        <div className="mt-5 rounded-[16px] bg-[var(--color-surface)] p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary-dark)]"><MapPinIcon className="h-4 w-4" /> Ana hizmet mahallesi</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">
            İlk mahallen ücretsizdir; mağazan bu mahallede görünür. Değiştirmek için aşağıdan yeni bir mahalle seç.
          </p>
          <div className="mt-3.5">
            {locationLoading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[46px] animate-pulse rounded-[12px] bg-[var(--color-border-soft)]" />
                ))}
              </div>
            ) : (
              <TurkeyLocationFields value={location} onChange={setLocation} compact />
            )}
            {locationResolveFailed && (
              <p className="mt-2 text-xs font-semibold text-[#8a3324]">
                Mevcut mahallen otomatik doldurulamadı. Değiştirmek istemiyorsan yukarıdakine dokunma; değiştirmek istiyorsan yeniden seç.
              </p>
            )}
          </div>
        </div>
      </div>

      <label className="form-field">Hakkımızda
        <textarea className="form-control min-h-32 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1500} />
      </label>
      <label className="form-field">Açık adres
        <textarea className="form-control min-h-24 resize-y" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} maxLength={500} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field">Logo URL
          <input className="form-control" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} type="url" placeholder="https://..." />
        </label>
        <label className="form-field">Kapak görseli URL
          <input className="form-control" value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} type="url" placeholder="https://..." />
        </label>
      </div>

      {feedback.error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>}
      {feedback.success && <p className="rounded-[12px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>}

      <button type="submit" disabled={busy || locationLoading} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? "Kaydediliyor..." : locationLoading ? "Mahalle bilgisi yükleniyor..." : "Mağaza profilini kaydet"}
      </button>
    </form>
  );
}
