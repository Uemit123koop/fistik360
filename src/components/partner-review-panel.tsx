"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyBrand } from "@/lib/partner";

export function PartnerReviewPanel({ applicationId, brandName, status }: { applicationId: string; brandName: string; status: string }) {
  const [note, setNote] = useState("");
  const [slug, setSlug] = useState(slugifyBrand(brandName));
  const [commissionRate, setCommissionRate] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("PARTNER");
  const [partnerLevel, setPartnerLevel] = useState("STANDARD");
  const [contractStartDate, setContractStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function act(action: string) {
    setBusy(true); setError("");
    const response = await fetch(`/api/admin/partner-applications/${applicationId}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note, slug, commissionRate, fulfillmentType, partnerLevel, contractStartDate }),
    });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setError(result.error || "İşlem tamamlanamadı.");
    router.refresh();
  }

  return <section className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="text-lg font-bold">Değerlendirme</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="form-field">Marka adresi<input className="form-control" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={status === "APPROVED"} /></label><label className="form-field">Komisyon oranı (%)<input className="form-control" type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} /></label><label className="form-field">Fulfillment<select className="form-control" value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)}><option value="PARTNER">Partner</option><option value="FISTIK360">Fıstık360</option></select></label><label className="form-field">Partner seviyesi<select className="form-control" value={partnerLevel} onChange={(event) => setPartnerLevel(event.target.value)}><option value="STANDARD">Standard</option><option value="SELECT">Select</option><option value="PREMIUM">Premium</option></select></label><label className="form-field">Sözleşme başlangıcı<input className="form-control" type="date" value={contractStartDate} onChange={(event) => setContractStartDate(event.target.value)} /></label></div><label className="form-field mt-4">Admin notu<textarea className="form-control min-h-28" value={note} onChange={(event) => setNote(event.target.value)} /></label>{error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}<div className="mt-5 flex flex-wrap gap-2">{status === "PENDING" && <button type="button" onClick={() => act("review")} disabled={busy} className="button-secondary">İncelemeye al</button>}{["PENDING", "UNDER_REVIEW"].includes(status) && <><button type="button" onClick={() => act("approve")} disabled={busy} className="button-primary">Onayla ve partner aç</button><button type="button" onClick={() => act("reject")} disabled={busy} className="button-secondary border-red-300 text-red-700">Reddet</button></>}{status === "APPROVED" && <button type="button" onClick={() => act("suspend")} disabled={busy} className="button-secondary border-red-300 text-red-700">Partneri askıya al</button>}</div></section>;
}
