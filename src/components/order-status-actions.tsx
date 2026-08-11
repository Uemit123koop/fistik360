"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUS_LABELS, nextStatuses, type OrderStatus } from "@/lib/orders";

interface Props {
  orderId: string;
  status: OrderStatus;
  /** "store" tüm geçişleri, "customer" yalnız PENDING → CANCELLED iptalini görür. */
  actor: "store" | "customer";
}

export function OrderStatusActions({ orderId, status, actor }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = actor === "customer"
    ? (status === "PENDING" ? (["CANCELLED"] as OrderStatus[]) : [])
    : nextStatuses(status);

  if (options.length === 0) return null;

  async function apply(target: OrderStatus) {
    if (target === "CANCELLED" && !window.confirm("Sipariş iptal edilsin mi? Bu işlem geri alınamaz.")) return;
    setBusy(target);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Durum güncellenemedi.");
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
    <div className="mt-4 border-t border-[var(--color-border-soft)] pt-4">
      <div className="flex flex-wrap gap-2">
        {options.map((target) => (
          <button
            key={target}
            type="button"
            disabled={busy !== null}
            onClick={() => apply(target)}
            className={
              target === "CANCELLED"
                ? "min-h-11 rounded-full border border-red-200 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-45"
                : "button-primary min-h-11 px-4 text-sm disabled:opacity-45"
            }
          >
            {busy === target ? "..." : target === "CANCELLED" ? "İptal et" : `${ORDER_STATUS_LABELS[target]} yap`}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 rounded-[12px] bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
