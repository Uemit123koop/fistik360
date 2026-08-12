"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";

type AuthMode = "login" | "register";

export function PasswordlessAuthCard({
  initialError = "",
  allowRegister = true,
  onAuthenticated,
}: {
  initialError?: string;
  allowRegister?: boolean;
  onAuthenticated?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPhase("email");
    setOtp("");
    setError("");
    setResendIn(0);
  }

  async function requestOtp() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Kod gönderilemedi.");
        return;
      }
      setPhase("otp");
      setResendIn(60);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "email") {
      await requestOtp();
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("E-postanıza gelen 6 haneli kodu girin.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Kod doğrulanamadı.");
        return;
      }
      onAuthenticated?.();
      router.replace(result.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
      {allowRegister && <div className="grid grid-cols-2 rounded-[14px] bg-[var(--color-surface-strong)] p-1" aria-label="Kimlik doğrulama modu">
        <button type="button" onClick={() => changeMode("login")} className={`min-h-11 rounded-[11px] px-3 text-sm font-bold transition ${mode === "login" ? "bg-white text-[var(--color-primary-dark)] shadow-sm" : "text-[var(--color-muted-text)]"}`} aria-pressed={mode === "login"}>Giriş</button>
        <button type="button" onClick={() => changeMode("register")} className={`min-h-11 rounded-[11px] px-3 text-sm font-bold transition ${mode === "register" ? "bg-white text-[var(--color-primary-dark)] shadow-sm" : "text-[var(--color-muted-text)]"}`} aria-pressed={mode === "register"}>Kayıt</button>
      </div>}

      {phase === "email" ? (
        <>
          {mode === "register" && (
            <label className="form-field" htmlFor="auth-full-name">Ad soyad
              <input id="auth-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="form-control" autoComplete="name" maxLength={120} required />
            </label>
          )}
          <label className="form-field" htmlFor="auth-email">E-posta
            <input id="auth-email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" type="email" autoComplete="email" placeholder="ornek@eposta.com" required />
            <span className="text-xs font-normal text-[var(--color-muted-text)]">
              {mode === "login" ? "Yalnız kayıtlı e-posta adreslerine giriş kodu gönderilir." : "Hesabın 6 haneli e-posta koduyla doğrulanır; şifre oluşturmazsın."}
            </span>
          </label>
        </>
      ) : (
        <div className="rounded-[16px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary-dark)]"><ShieldIcon /></span>
          <p className="mt-4 font-bold text-[var(--color-ink)]">6 haneli kodu gir</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-text)]"><strong>{email}</strong> adresini kontrol et.</p>
          <label className="form-field mt-4" htmlFor="auth-otp">Doğrulama kodu
            <input id="auth-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="form-control text-center font-mono text-2xl tracking-[.32em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus required />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => { setPhase("email"); setOtp(""); setError(""); }} className="text-link">E-postayı değiştir</button>
            <button type="button" onClick={() => void requestOtp()} disabled={busy || resendIn > 0} className="text-link disabled:cursor-not-allowed disabled:opacity-50">
              {resendIn > 0 ? `${resendIn} sn sonra yeniden gönder` : "Kodu yeniden gönder"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}

      <button type="submit" disabled={busy || (phase === "otp" && otp.length !== 6)} className="button-primary w-full">
        {busy ? <><span className="loading-dot" aria-hidden="true" /> İşleniyor...</> : phase === "email" ? <>Kodu gönder <ArrowIcon /></> : <>Doğrula ve panele geç <ArrowIcon /></>}
      </button>
    </form>
  );
}
