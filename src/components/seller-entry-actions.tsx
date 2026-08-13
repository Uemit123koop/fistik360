"use client";

import { useEffect } from "react";
import { useAuthModal } from "@/components/auth-modal";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";

function moveToOnboarding() {
  const section = document.getElementById("onboarding");
  if (!section) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.history.replaceState(null, "", "#onboarding");
  section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => section.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
}

export function SellerEntryHashFocus() {
  useEffect(() => {
    if (window.location.hash.slice(1) !== "onboarding") return;
    const frame = window.requestAnimationFrame(moveToOnboarding);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return null;
}

export function SellerEntryActions() {
  const { openModal } = useAuthModal();

  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
      <article className="flex flex-col rounded-[18px] border border-white/15 bg-white/8 p-3 backdrop-blur-sm sm:rounded-[20px] sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[#dce7c7]"><ShieldIcon className="h-5 w-5" /></span>
        <p className="mt-3 text-xs font-semibold leading-5 text-white/70 sm:text-sm">Zaten hesabın var mı?</p>
        <h2 className="mt-1 text-base font-extrabold text-white sm:text-xl">Hesabına devam et.</h2>
        <button type="button" onClick={() => openModal()} className="mt-3 inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-sm font-extrabold text-[var(--color-primary-dark)] transition-colors duration-200 hover:bg-[#eff6e2] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white sm:mt-4 sm:gap-2 sm:px-5">
          Giriş Yap <ArrowIcon />
        </button>
      </article>
      <article className="flex flex-col rounded-[18px] border border-[#dbe9a7]/45 bg-[#d7ec9c]/12 p-3 backdrop-blur-sm sm:rounded-[20px] sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7ec9c] font-serif text-lg font-black text-[var(--color-primary-dark)]" aria-hidden="true">+</span>
        <p className="mt-3 text-xs font-semibold leading-5 text-white/70 sm:text-sm">Yeni mağaza mı açmak istiyorsun?</p>
        <h2 className="mt-1 text-base font-extrabold text-white sm:text-xl">Satış kanalını kur.</h2>
        <a href="#onboarding" onClick={(event) => { event.preventDefault(); moveToOnboarding(); }} className="mt-3 inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[#d7ec9c] px-3 text-sm font-extrabold text-[var(--color-primary-dark)] transition-colors duration-200 hover:bg-[#e7f5bd] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white sm:mt-4 sm:gap-2 sm:px-5">
          Mağaza Aç <ArrowIcon />
        </a>
      </article>
    </div>
  );
}
