"use client";

import { useState } from "react";
import { ArrowIcon } from "@/components/marketplace-ui";

export function WholesaleInquiryForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/wholesale/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, message }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFeedback({ kind: "error", text: result.error ?? "Talep gönderilemedi." });
        return;
      }
      setMessage("");
      setFeedback({ kind: "success", text: "Alım talebin toptancıya iletildi." });
    } catch {
      setFeedback({ kind: "error", text: "Bağlantı kurulamadı. Yeniden deneyin." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <label className="form-field">Alım notun
        <textarea className="form-control min-h-28 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="İstediğin miktar, teslimat şehri ve varsa özel koşullar..." required />
      </label>
      {feedback && <p className={`mt-3 rounded-[12px] px-4 py-3 text-sm font-semibold ${feedback.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p>}
      <button type="submit" disabled={busy || message.trim().length < 10} className="button-primary mt-4 w-full">{busy ? "Gönderiliyor..." : "Alım talebi gönder"} <ArrowIcon /></button>
    </form>
  );
}

