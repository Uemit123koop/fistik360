"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PasswordlessAuthCard } from "@/components/passwordless-auth-card";

interface AuthModalContextValue {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal, AuthModalProvider içinde kullanılmalı.");
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, openModal, closeModal }), [isOpen, openModal, closeModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModalPanel />
    </AuthModalContext.Provider>
  );
}

export function AuthTriggerButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { openModal } = useAuthModal();
  return (
    <button type="button" onClick={openModal} className={className} aria-haspopup="dialog">
      {children}
    </button>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AuthModalPanel() {
  const { isOpen, closeModal } = useAuthModal();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Giriş yap veya kayıt ol">
      <div className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in" onClick={closeModal} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-[22px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] animate-modal-in sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Fıstık360</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[var(--color-ink)]">Giriş yap veya kayıt ol</h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-6">
          <PasswordlessAuthCard onAuthenticated={closeModal} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
