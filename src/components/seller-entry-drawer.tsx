"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PasswordlessAuthCard } from "@/components/passwordless-auth-card";
import { SellerRegistrationForm } from "@/components/seller-registration-form";
import { ArrowIcon, MapPinIcon, PackageIcon, ShieldIcon } from "@/components/marketplace-ui";

interface SellerEntryDrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const SellerEntryDrawerContext = createContext<SellerEntryDrawerContextValue | null>(null);

export function useSellerEntryDrawer() {
  const ctx = useContext(SellerEntryDrawerContext);
  if (!ctx) throw new Error("useSellerEntryDrawer, SellerEntryDrawerProvider içinde kullanılmalı.");
  return ctx;
}

export function SellerEntryDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, openDrawer, closeDrawer }), [isOpen, openDrawer, closeDrawer]);

  return (
    <SellerEntryDrawerContext.Provider value={value}>
      {children}
      <SellerEntryDrawerPanel />
    </SellerEntryDrawerContext.Provider>
  );
}

export function SellerEntryTriggerButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { openDrawer } = useSellerEntryDrawer();
  return (
    <button type="button" onClick={openDrawer} className={className} aria-haspopup="dialog">
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

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EntryChoiceCard({
  icon,
  title,
  description,
  ctaLabel,
  emphasized = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  emphasized?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col rounded-[18px] border p-4 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:p-5 ${
        emphasized
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] hover:shadow-[var(--shadow-card-hover)]"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card)]"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${emphasized ? "bg-[var(--color-primary-dark)] text-white" : "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"}`}>
        {icon}
      </span>
      <h3 className="mt-3 whitespace-nowrap text-base font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1 whitespace-nowrap text-sm leading-5 text-[var(--color-muted-text)]">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--color-primary-dark)]">
        {ctaLabel} <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

type ActiveSection = "none" | "login" | "register";

function SellerEntryDrawerPanel() {
  const { isOpen, closeDrawer } = useSellerEntryDrawer();
  const [activeSection, setActiveSection] = useState<ActiveSection>("none");
  const [registrationStep, setRegistrationStep] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Kayıt formu mahalle(ler)/ödeme adımına (4+) ulaşınca içerik yoğunlaşıyor;
  // sol değer önerisi rayını kapatıp modala tüm genişliği veriyoruz.
  const isWideStep = activeSection === "register" && registrationStep >= 4;

  const handleClose = useCallback(() => {
    setActiveSection("none");
    setRegistrationStep(1);
    closeDrawer();
  }, [closeDrawer]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  function reveal(section: ActiveSection) {
    setActiveSection(section);
    setRegistrationStep(1);
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Giriş yap veya mağaza aç">
      <div className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in" onClick={handleClose} aria-hidden="true" />
      <div className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-[var(--shadow-soft)] animate-drawer-in lg:flex-row ${isWideStep ? "lg:max-w-4xl" : "lg:max-w-3xl"}`}>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-md backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <CloseIcon />
        </button>

        {/* Değer önerisi rayı — masaüstünde sol sabit sütun, mobilde üstte bant.
            Kayıt formu mahalle/ödeme adımına ulaşınca (isWideStep) kapanır, modal
            tüm genişliği içerik alanına bırakır. */}
        {!isWideStep && (
          <div className="safe-header relative shrink-0 overflow-hidden bg-[#12382b] px-6 py-6 text-white sm:px-8 sm:py-8 lg:w-[300px] lg:py-10">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(circle at 25% 15%, rgba(215,236,156,.22), transparent 60%)" }}
              aria-hidden="true"
            />
            <div className="relative">
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#d7ec9c] ring-1 ring-white/15">
                Fıstık360 hesabın
              </span>
              <h2 className="mt-4 max-w-xs font-serif text-[1.6rem] font-bold leading-[1.15] lg:max-w-none">
                Mahallenin dijital vitrinini bugün aç, ilk siparişini bu hafta al.
              </h2>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-2.5 text-sm text-white/78"><ClockIcon className="h-4 w-4 shrink-0 text-[#d7ec9c]" /> 5 dakikada kurulum</li>
                <li className="flex items-center gap-2.5 text-sm text-white/78"><ShieldIcon className="h-4 w-4 shrink-0 text-[#d7ec9c]" /> Şifresiz, 6 haneli güvenli giriş</li>
                <li className="flex items-center gap-2.5 text-sm text-white/78"><MapPinIcon className="h-4 w-4 shrink-0 text-[#d7ec9c]" /> İlk hizmet mahallen ücretsiz</li>
              </ul>
            </div>
          </div>
        )}

        {/* İçerik — kaydırılabilir alan */}
        <div className="flex-1 overflow-y-auto">
          <div className={`p-5 sm:p-7 ${isWideStep ? "lg:p-10" : "lg:p-8"}`}>
            <div className="grid gap-3 lg:grid-cols-2">
              <EntryChoiceCard
                icon={<ShieldIcon className="h-5 w-5" />}
                title="Hesabına devam et"
                description="E-posta koduyla giriş yap."
                ctaLabel="Giriş yap"
                onClick={() => reveal("login")}
              />
              <EntryChoiceCard
                icon={<PackageIcon className="h-5 w-5" />}
                title="Yeni mağaza aç"
                description="Kuruyemişçi veya toptancı ol."
                ctaLabel="Hemen başla"
                emphasized
                onClick={() => reveal("register")}
              />
            </div>

            {activeSection !== "none" && (
              <div ref={sectionRef} className="animate-reveal-in mt-6 scroll-mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow">{activeSection === "login" ? "Giriş yap" : "Mağaza kaydı"}</p>
                  <button type="button" onClick={() => { setActiveSection("none"); setRegistrationStep(1); }} className="text-xs font-bold text-[var(--color-muted-text)] transition-colors hover:text-[var(--color-primary-dark)]">
                    ‹ Geri
                  </button>
                </div>
                <div className="@container rounded-[18px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
                  {activeSection === "login" ? (
                    <PasswordlessAuthCard allowRegister={false} onAuthenticated={handleClose} />
                  ) : (
                    <SellerRegistrationForm onStepChange={setRegistrationStep} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
