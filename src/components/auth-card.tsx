"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";

interface AuthCardProps { initialError?: string; }

export function AuthCard({ initialError = "" }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(nextMode: string) {
    setMode(nextMode);
    setError("");
    setConfirmationEmail("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "İşlem başarısız");
        return;
      }

      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(email);
        return;
      }

      router.replace(result.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className="rounded-[18px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-5" role="status" aria-live="polite">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary-dark)]"><ShieldIcon /></span>
        <p className="mt-4 text-lg font-bold text-[var(--color-ink)]">E-postanı doğrula</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]"><strong className="text-[var(--color-ink)]">{confirmationEmail}</strong> adresine gönderilen bağlantıyı açarak hesabını etkinleştir. Ardından giriş yapabilirsin.</p>
        <button type="button" onClick={() => changeMode("login")} className="button-primary mt-5 w-full">Girişe dön <ArrowIcon /></button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isSubmitting}>
      <div className="grid grid-cols-2 rounded-[14px] bg-[var(--color-surface-strong)] p-1" aria-label="Kimlik doğrulama modu">
        <button type="button" onClick={() => changeMode("login")} className={`min-h-11 rounded-[11px] px-3 text-sm font-bold transition duration-200 ${mode === "login" ? "bg-white text-[var(--color-primary-dark)] shadow-sm" : "text-[var(--color-muted-text)] hover:text-[var(--color-ink)]"}`} aria-pressed={mode === "login"}>Giriş</button>
        <button type="button" onClick={() => changeMode("register")} className={`min-h-11 rounded-[11px] px-3 text-sm font-bold transition duration-200 ${mode === "register" ? "bg-white text-[var(--color-primary-dark)] shadow-sm" : "text-[var(--color-muted-text)] hover:text-[var(--color-ink)]"}`} aria-pressed={mode === "register"}>Kayıt</button>
      </div>

      <label className="form-field" htmlFor="auth-email">E-posta
        <input id="auth-email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control" type="email" autoComplete="email" placeholder="ornek@eposta.com" required />
      </label>
      <label className="form-field" htmlFor="auth-password">Şifre
        <input id="auth-password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} placeholder="En az 6 karakter" required />
        {mode === "register" && <span className="text-xs font-normal text-[var(--color-muted-text)]">Hesabını etkinleştirmek için e-posta doğrulaması gerekir.</span>}
      </label>

      {error && <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="button-primary w-full">
        {isSubmitting ? <><span className="loading-dot" aria-hidden="true" /> İşleniyor...</> : mode === "login" ? <>Giriş yap <ArrowIcon /></> : <>Hesap oluştur <ArrowIcon /></>}
      </button>
    </form>
  );
}
