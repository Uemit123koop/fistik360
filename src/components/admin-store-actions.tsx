"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlatformStatus = "PENDING_ONBOARDING" | "ACTIVE" | "SUSPENDED";

interface Props {
  storeId: string;
  storeName: string;
  platformStatus: PlatformStatus;
}

export function AdminStoreActions({ storeId, storeName, platformStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options: Array<{ action: string; label: string; danger?: boolean; confirm?: string }> =
    platformStatus === "ACTIVE"
      ? [{ action: "suspend", label: "Askıya al", danger: true, confirm: `${storeName} askıya alınsın mı? Mağaza vitrinden kalkar ve yeni sipariş alamaz.` }]
      : platformStatus === "SUSPENDED"
        ? [{ action: "reinstate", label: "Askıyı kaldır" }]
        : [{ action: "publish", label: "Yayına al" }];

  async function apply(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "İşlem tamamlanamadı.");
        return;
      }
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.action}
            type="button"
            disabled={busy !== null}
            onClick={() => apply(option.action, option.confirm)}
            className={
              option.danger
                ? "min-h-10 rounded-full border border-red-200 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-45"
                : "button-primary min-h-10 px-4 text-sm disabled:opacity-45"
            }
          >
            {busy === option.action ? "..." : option.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 rounded-[10px] bg-red-50 p-2.5 text-xs font-semibold text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
