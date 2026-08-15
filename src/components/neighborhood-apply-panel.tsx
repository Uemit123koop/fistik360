"use client";

import { useState } from "react";

interface NeighborhoodOption {
  id: string;
  neighborhood: string;
  district: string;
}

export function NeighborhoodApplyPanel({ neighborhoods }: { neighborhoods: NeighborhoodOption[] }) {
  const [sourceId, setSourceId] = useState(neighborhoods[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  async function apply() {
    if (!sourceId || busy) return;
    setBusy(true);
    setFeedback({});
    try {
      const response = await fetch("/api/store/neighborhoods/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceNeighborhoodId: sourceId, targetNeighborhoodIds: "all" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ error: result.error ?? "Ayarlar uygulanamadı." });
        return;
      }
      const sourceName = neighborhoods.find((n) => n.id === sourceId)?.neighborhood ?? "Seçilen mahalle";
      setFeedback({ success: `${sourceName}'nin teslimat ve ödeme ayarları ${result.appliedCount} mahalleye uygulandı.` });
    } catch {
      setFeedback({ error: "Bağlantı kurulamadı." });
    } finally {
      setBusy(false);
    }
  }

  if (neighborhoods.length < 2) return null;

  return (
    <div className="mt-5 rounded-[20px] border border-[var(--color-border)] bg-white p-5 sm:p-6">
      <p className="text-sm font-extrabold text-[var(--color-ink)]">Ayarları tüm mahallelere uygula</p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--color-muted-text)]">
        Bir mahalleyi referans seç; teslimat ve ödeme ayarları o mahalledeki gibi tüm diğer mahallelerine kopyalanır.
        İstersen bunun yerine bir mahalleye tek tek girip kendine özel ayar da yapabilirsin.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="form-control sm:max-w-xs"
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
          disabled={busy}
        >
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>{n.neighborhood} ({n.district})</option>
          ))}
        </select>
        <button type="button" onClick={() => void apply()} disabled={busy || !sourceId} className="button-primary shrink-0">
          {busy ? "Uygulanıyor..." : "Tüm mahallelere uygula"}
        </button>
      </div>
      {feedback.error && <p className="mt-3 rounded-[12px] bg-red-50 p-3 text-xs font-semibold text-red-800" role="alert">{feedback.error}</p>}
      {feedback.success && <p className="mt-3 rounded-[12px] bg-emerald-50 p-3 text-xs font-semibold text-emerald-800" role="status">{feedback.success}</p>}
    </div>
  );
}
