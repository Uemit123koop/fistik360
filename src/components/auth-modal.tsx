"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PasswordlessAuthCard } from "@/components/passwordless-auth-card";

interface OpenModalOptions {
  onAuthenticated?: () => void;
  initialError?: string;
}

interface AuthModalContextValue {
  isOpen: boolean;
  initialError: string;
  openModal: (options?: OpenModalOptions) => void;
  closeModal: () => void;
  notifyAuthenticated: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal, AuthModalProvider içinde kullanılmalı.");
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialError, setInitialError] = useState("");
  const successCallbackRef = useRef<(() => void) | null>(null);

  const openModal = useCallback((options?: OpenModalOptions) => {
    successCallbackRef.current = options?.onAuthenticated ?? null;
    setInitialError(options?.initialError ?? "");
    setIsOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const notifyAuthenticated = useCallback(() => {
    setIsOpen(false);
    successCallbackRef.current?.();
    successCallbackRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ isOpen, initialError, openModal, closeModal, notifyAuthenticated }),
    [isOpen, initialError, openModal, closeModal, notifyAuthenticated],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModalUrlTrigger />
      <AuthModalPanel />
    </AuthModalContext.Provider>
  );
}

// /giris gibi sunucu taraflı yönlendirmeler, herhangi bir genel sayfaya
// ?auth=login(&error=...) ile düşer; bu bileşen o parametreyi görünce modalı
// açar ve URL'i temizler (SellerEntryHashFocus'taki hash-okuma deseniyle aynı
// mantık: useSearchParams yerine window.location, Suspense gereksinimini bypass eder).
function AuthModalUrlTrigger() {
  const { openModal } = useAuthModal();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "login") return;
    const error = params.get("error");
    openModal({ initialError: error === "confirmation" ? "E-posta doğrulama bağlantısı geçersiz veya süresi dolmuş." : undefined });
    params.delete("auth");
    params.delete("error");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function AuthTriggerButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { openModal } = useAuthModal();
  return (
    <button type="button" onClick={() => openModal()} className={className} aria-haspopup="dialog">
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
  const { isOpen, initialError, closeModal, notifyAuthenticated } = useAuthModal();

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
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Giriş yap veya kayıt ol">
      <div className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in" onClick={closeModal} aria-hidden="true" />
      <div className="relative flex w-full max-w-none flex-col overflow-y-auto bg-white p-6 shadow-[var(--shadow-soft)] animate-modal-in sm:max-w-lg sm:rounded-[26px] sm:border sm:border-[var(--color-border)] sm:p-10">
        <div className="flex items-start justify-between gap-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-0">
          <div>
            <p className="eyebrow">Fıstık360</p>
            <h2 className="mt-1 font-serif text-3xl font-bold text-[var(--color-ink)] sm:text-2xl">Giriş yap veya kayıt ol</h2>
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
        <div className="mx-auto mt-8 w-full max-w-sm flex-1 sm:mt-6 sm:flex-none">
          <PasswordlessAuthCard initialError={initialError} onAuthenticated={notifyAuthenticated} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
