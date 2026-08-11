"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublishCheck, StorePlatformStatus } from "@/lib/store-publish";

interface Props {
  initial: {
    store: {
      id: string;
      name: string;
      isActive: boolean;
      platformStatus: StorePlatformStatus;
      publishedAt: string | null;
    };
    checks: PublishCheck[];
    allReady: boolean;
  };
}

interface ApiResult {
  error?: string;
  store?: {
    isActive: boolean;
    platformStatus: StorePlatformStatus;
    publishedAt: string | null;
  };
}

async function writePublishApi(method: "POST" | "PATCH", body?: Record<string, unknown>) {
  const response = await fetch("/api/store/publish", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok) throw new Error(result.error ?? "İşlem tamamlanamadı.");
  return result;
}

export function StorePublishPanel({ initial }: Props) {
  const router = useRouter();
  const [store, setStore] = useState(initial.store);
  const [busy, setBusy] = useState<"publish" | "availability" | null>(null);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const isPublished = store.platformStatus === "ACTIVE";
  const isSuspended = store.platformStatus === "SUSPENDED";
  const missingChecks = initial.checks.filter((check) => !check.ready);

  async function publishStore() {
    if (!initial.allReady || isPublished || isSuspended) return;
    setBusy("publish");
    setFeedback({});
    try {
      const result = await writePublishApi("POST");
      if (result.store) setStore((current) => ({ ...current, ...result.store }));
      setFeedback({ success: "Mağazanız yayına alındı. Artık mahallenizde görünür ve sipariş alabilir." });
      router.refresh();
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "Mağaza yayına alınamadı." });
    } finally {
      setBusy(null);
    }
  }

  async function toggleAvailability() {
    const nextActive = !store.isActive;
    if (!nextActive && !window.confirm("Mağazanız geçici olarak kapatılsın mı? Yeni sipariş alamazsınız; mevcut siparişler etkilenmez.")) return;
    setBusy("availability");
    setFeedback({});
    try {
      const result = await writePublishApi("PATCH", { isActive: nextActive });
      if (result.store) setStore((current) => ({ ...current, ...result.store }));
      setFeedback({
        success: nextActive
          ? "Mağazanız yeniden açıldı ve vitrinde görünür."
          : "Mağazanız geçici olarak kapatıldı. Mevcut siparişleriniz etkilenmez.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "Mağaza durumu güncellenemedi." });
    } finally {
      setBusy(null);
    }
  }

  const status = isSuspended
    ? { label: "Askıya alındı", description: "Mağaza platform tarafından askıya alınmış.", tone: "border-red-200 bg-red-50 text-red-900" }
    : isPublished && store.isActive
      ? { label: "Yayında", description: "Mağazanız vitrinde görünür ve yeni sipariş alabilir.", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" }
      : isPublished
        ? { label: "Tatil modunda", description: "Mağazanız vitrinde görünmez ve yeni sipariş almaz.", tone: "border-amber-200 bg-amber-50 text-amber-900" }
        : { label: initial.allReady ? "Yayına hazır" : "Hazırlanıyor", description: initial.allReady ? "Tüm zorunlu adımlar tamamlandı." : `${missingChecks.length} zorunlu adım eksik.`, tone: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]" };

  return (
    <div className="space-y-6">
      <section className={`rounded-[20px] border p-5 sm:p-6 ${status.tone}`} aria-labelledby="publish-status-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.13em]">Yayın durumu</p>
            <h2 id="publish-status-title" className="mt-2 text-2xl font-bold">{status.label}</h2>
            <p className="mt-2 text-sm leading-6 opacity-80">{status.description}</p>
          </div>
          {isPublished && <Link href={`/magaza/${store.id}`} className="button-secondary shrink-0">Mağaza vitrinini gör</Link>}
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="publish-checklist-title">
        <div>
          <p className="eyebrow">Yayın kontrolü</p>
          <h2 id="publish-checklist-title" className="mt-2 text-2xl font-bold">Mağazan hazır mı?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Eksik adımları tamamladığınızda yayın düğmesi otomatik olarak kullanılabilir olur.</p>
        </div>

        <ul className="mt-6 space-y-3">
          {initial.checks.map((check) => (
            <li key={check.key} className="flex flex-col gap-4 rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${check.ready ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`} aria-hidden="true">
                  {check.ready ? <CheckIcon /> : <CrossIcon />}
                </span>
                <div>
                  <p className="font-extrabold">{check.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted-text)]">{check.description}</p>
                </div>
              </div>
              {check.ready ? <span className="shrink-0 text-sm font-extrabold text-emerald-800">Tamam</span> : <Link href={check.href} className="button-secondary w-full shrink-0 sm:w-auto">{check.actionLabel}</Link>}
            </li>
          ))}
        </ul>

        {!isPublished && !isSuspended && (
          <div className="mt-6 border-t border-[var(--color-border-soft)] pt-6">
            {!initial.allReady && <p className="mb-4 text-sm font-semibold text-[var(--color-muted-text)]">Eksik: {missingChecks.map((check) => check.label).join(", ")}</p>}
            <button type="button" onClick={() => void publishStore()} disabled={!initial.allReady || busy !== null} className="button-primary w-full sm:w-auto">
              {busy === "publish" ? "Yayına alınıyor..." : initial.allReady ? "Mağazamı yayına al" : "Önce eksikleri tamamla"}
            </button>
          </div>
        )}
      </section>

      {isPublished && (
        <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="vacation-mode-title">
          <p className="eyebrow">Mağaza anahtarı</p>
          <h2 id="vacation-mode-title" className="mt-2 text-2xl font-bold">Tatil modu</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
            Mağazayı geçici kapattığınızda vitrinde görünmez ve yeni sipariş alınmaz. Mevcut siparişleriniz etkilenmez; platform yayın durumunuz değişmez.
          </p>
          <button type="button" onClick={() => void toggleAvailability()} disabled={busy !== null} className={store.isActive ? "button-secondary mt-5 w-full sm:w-auto" : "button-primary mt-5 w-full sm:w-auto"}>
            {busy === "availability" ? "Güncelleniyor..." : store.isActive ? "Mağazamı geçici kapat" : "Mağazamı tekrar aç"}
          </button>
        </section>
      )}

      {isSuspended && (
        <p className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-900" role="alert">
          Platform askısı satıcı tarafından kaldırılamaz. Destek ekibiyle iletişime geçin.
        </p>
      )}
      <div aria-live="polite">
        {feedback.error && <p className="rounded-[14px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>}
        {feedback.success && <p className="rounded-[14px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>}
      </div>
    </div>
  );
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CrossIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" /></svg>;
}
