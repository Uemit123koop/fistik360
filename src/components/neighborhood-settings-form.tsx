"use client";

import { useState } from "react";

interface Settings {
  minimumOrderAmount: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number | null;
  cashOnDelivery: boolean;
  cardOnDelivery: boolean;
  bankTransfer: boolean;
}

function moneyInput(value: number | null) {
  return value === null ? "" : String(value);
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

export function NeighborhoodSettingsForm({
  neighborhoodId,
  neighborhoodName,
  initial,
  initialHasOverride,
}: {
  neighborhoodId: string;
  neighborhoodName: string;
  initial: Settings;
  initialHasOverride: boolean;
}) {
  const [form, setForm] = useState({
    minimumOrderAmount: moneyInput(initial.minimumOrderAmount),
    standardDeliveryFee: moneyInput(initial.standardDeliveryFee),
    freeDeliveryThreshold: moneyInput(initial.freeDeliveryThreshold),
    cashOnDelivery: initial.cashOnDelivery,
    cardOnDelivery: initial.cardOnDelivery,
    bankTransfer: initial.bankTransfer,
  });
  const [hasOverride, setHasOverride] = useState(initialHasOverride);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [errors, setErrors] = useState<{ minimum?: string; fee?: string; threshold?: string; payment?: string }>({});
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  function togglePayment(key: "cashOnDelivery" | "cardOnDelivery" | "bankTransfer") {
    const next = { ...form, [key]: !form[key] };
    if (!next.cashOnDelivery && !next.cardOnDelivery && !next.bankTransfer) {
      setErrors({ ...errors, payment: "En az bir ödeme yöntemi açık kalmalıdır." });
      return;
    }
    setForm(next);
    setErrors({ ...errors, payment: undefined });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minimum = parseMoney(form.minimumOrderAmount);
    const fee = parseMoney(form.standardDeliveryFee);
    const threshold = form.freeDeliveryThreshold.trim() === "" ? null : parseMoney(form.freeDeliveryThreshold);
    const nextErrors: typeof errors = {};
    if (minimum === null) nextErrors.minimum = "Sıfır veya daha büyük, en fazla iki ondalıklı bir tutar girin.";
    if (fee === null) nextErrors.fee = "Sıfır veya daha büyük, en fazla iki ondalıklı bir tutar girin.";
    if (form.freeDeliveryThreshold.trim() !== "" && threshold === null) {
      nextErrors.threshold = "Geçerli bir tutar girin veya boş bırakın.";
    } else if (minimum !== null && threshold !== null && threshold < minimum) {
      nextErrors.threshold = "Ücretsiz teslimat eşiği minimum sepet tutarından düşük olamaz.";
    }
    if (!form.cashOnDelivery && !form.cardOnDelivery && !form.bankTransfer) {
      nextErrors.payment = "En az bir ödeme yöntemi açık kalmalıdır.";
    }
    setErrors(nextErrors);
    setFeedback({});
    if (Object.keys(nextErrors).length > 0) return;

    setBusy("save");
    try {
      const response = await fetch(`/api/store/neighborhoods/${neighborhoodId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minimumOrderAmount: minimum,
          standardDeliveryFee: fee,
          freeDeliveryThreshold: threshold,
          cashOnDelivery: form.cashOnDelivery,
          cardOnDelivery: form.cardOnDelivery,
          bankTransfer: form.bankTransfer,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ error: result.error ?? "Ayarlar kaydedilemedi." });
        return;
      }
      setHasOverride(true);
      setFeedback({ success: `${neighborhoodName} için özel ayar kaydedildi.` });
    } catch {
      setFeedback({ error: "Bağlantı kurulamadı." });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    if (busy) return;
    setBusy("reset");
    setFeedback({});
    try {
      const response = await fetch(`/api/store/neighborhoods/${neighborhoodId}/settings`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ error: result.error ?? "Ayar sıfırlanamadı." });
        return;
      }
      setHasOverride(false);
      setFeedback({ success: "Mağaza varsayılanına döndürüldü." });
    } catch {
      setFeedback({ error: "Bağlantı kurulamadı." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="rounded-[16px] bg-[var(--color-surface)] p-4 text-xs font-semibold leading-5 text-[var(--color-muted-text)]">
        {hasOverride
          ? `${neighborhoodName} için özel ayar aktif — mağaza varsayılanından farklı.`
          : `${neighborhoodName} şu an mağaza varsayılan ayarlarını kullanıyor. Aşağıyı değiştirip kaydedersen bu mahalleye özel olur.`}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MoneyField id="nb-minimum" label="Minimum sepet tutarı" value={form.minimumOrderAmount} onChange={(value) => setForm({ ...form, minimumOrderAmount: value })} error={errors.minimum} />
        <MoneyField id="nb-fee" label="Standart teslimat ücreti" value={form.standardDeliveryFee} onChange={(value) => setForm({ ...form, standardDeliveryFee: value })} error={errors.fee} />
        <MoneyField id="nb-threshold" label="Ücretsiz teslimat eşiği" value={form.freeDeliveryThreshold} onChange={(value) => setForm({ ...form, freeDeliveryThreshold: value })} error={errors.threshold} optional />
      </div>

      <fieldset>
        <legend className="text-sm font-extrabold text-[var(--color-ink)]">Kabul edilen ödeme yöntemleri</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {([
            ["cashOnDelivery", "Kapıda nakit"],
            ["cardOnDelivery", "Kapıda kart"],
            ["bankTransfer", "IBAN / havale"],
          ] as const).map(([key, title]) => (
            <label key={key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
              <input type="checkbox" checked={form[key]} onChange={() => togglePayment(key)} disabled={busy !== null} className="h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
              <span className="text-sm font-bold">{title}</span>
            </label>
          ))}
        </div>
        {errors.payment && <p className="mt-2 text-xs font-semibold text-red-700">{errors.payment}</p>}
      </fieldset>

      {feedback.error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>}
      {feedback.success && <p className="rounded-[12px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy !== null} className="button-primary">{busy === "save" ? "Kaydediliyor..." : "Bu mahalleye özel kaydet"}</button>
        {hasOverride && (
          <button type="button" onClick={() => void reset()} disabled={busy !== null} className="button-secondary">
            {busy === "reset" ? "Sıfırlanıyor..." : "Mağaza varsayılanına döndür"}
          </button>
        )}
      </div>
    </form>
  );
}

function MoneyField({ id, label, value, onChange, error, optional = false }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; optional?: boolean }) {
  return (
    <label className="form-field" htmlFor={id}>
      {label}
      <span className="relative">
        <input id={id} className="form-control pr-12 tabular-nums" value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" autoComplete="off" placeholder={optional ? "İsteğe bağlı" : undefined} aria-invalid={Boolean(error)} />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-[var(--color-muted-text)]">TL</span>
      </span>
      {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
    </label>
  );
}
