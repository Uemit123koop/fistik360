"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-[22px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] animate-modal-in focus:outline-none"
      >
        <h2 id={titleId} className="font-serif text-xl font-bold text-[var(--color-ink)]">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">{description}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              destructive
                ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8a3324] px-[1.15rem] text-sm font-extrabold text-white transition-colors hover:bg-[#6e2818] disabled:cursor-not-allowed disabled:opacity-55"
                : "button-primary"
            }
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <><span className="loading-dot" /> İşleniyor</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
