"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function LogoutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8M10 12h10m0 0-3.5-3.5M20 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function logout() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) throw new Error();
        router.replace("/");
        router.refresh();
      } catch {
        setError("Çıkış yapılamadı. Tekrar dene.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={logout}
        disabled={isPending}
        className={className ?? "flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-[#8a3324] transition-colors duration-200 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-55"}
      >
        {isPending ? <><span className="loading-dot" style={{ borderTopColor: "#8a3324", borderColor: "rgba(138,51,36,.35)" }} /> Çıkış yapılıyor</> : <><LogoutIcon /> Çıkış yap</>}
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-[#8a3324]" role="alert">{error}</p>}
    </div>
  );
}
