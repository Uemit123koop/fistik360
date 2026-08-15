"use client";

import { useState } from "react";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });

function CopyButton({ value, copiedLabel = "Kopyalandı" }: { value: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Panoya erişim engellenmişse sessizce geç; kullanıcı elle seçip kopyalayabilir.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
        copied
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-primary)] text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)] hover:text-white"
      }`}
    >
      {copied ? `${copiedLabel} ✓` : "Kopyala"}
    </button>
  );
}

export function BankTransferDetails({
  accountHolder,
  iban,
  amount,
}: {
  accountHolder: string;
  iban: string;
  amount?: number;
}) {
  const cleanIban = iban.replace(/\s+/g, "").toUpperCase();
  const spacedIban = cleanIban.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="rounded-[14px] border border-dashed border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 text-sm leading-6 text-[var(--color-primary-dark)]">
      <p className="font-bold">Havale/EFT bilgileri</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">{accountHolder}</span>
        <CopyButton value={accountHolder} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-xs">{spacedIban}</span>
        <CopyButton value={cleanIban} />
      </div>
      {amount !== undefined && (
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="font-bold">{moneyFormatter.format(amount)}</span>
          <CopyButton value={amount.toFixed(2)} />
        </div>
      )}
    </div>
  );
}
