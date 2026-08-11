"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PARTNER_CATEGORIES } from "@/lib/partner";

export function BrandProductForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/partner/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, publish: form.get("publish") === "true" }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setError(result.error || "Ürün kaydedilemedi.");
    router.push("/dashboard/partner/products"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Ürün adı" name="name" required /><label className="form-field">Kategori<select className="form-control" name="category" required defaultValue=""><option value="" disabled>Seçin</option>{PARTNER_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field sm:col-span-2">Ürün açıklaması<textarea className="form-control min-h-32" name="description" required /></label><Field label="İçindekiler" name="ingredients" /><Field label="Menşei" name="origin" /><Field label="İşleme türü" name="processingType" placeholder="Kavrulmuş, çiğ…" /><div /><div className="sm:col-span-2 border-t border-[var(--color-border-soft)] pt-5"><h2 className="text-xl font-bold">İlk varyant</h2><p className="mt-1 text-sm text-[var(--color-muted-text)]">Gramaj, fiyat ve stok varyant bazında tutulur.</p></div><Field label="Varyant etiketi" name="variantLabel" placeholder="250 g" required /><Field label="SKU" name="sku" required /><Field label="Miktar" name="weight" type="number" min="0.001" step="0.001" required /><label className="form-field">Birim<select className="form-control" name="unit" defaultValue="GRAM"><option value="GRAM">Gram</option><option value="KILOGRAM">Kilogram</option><option value="ADET">Adet</option></select></label><Field label="Fiyat (TL)" name="price" type="number" min="0" step="0.01" required /><Field label="Stok" name="stock" type="number" min="0" step="1" required /><Field label="Barkod (opsiyonel)" name="barcode" inputMode="numeric" pattern="[0-9]{8,14}" /><label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-[var(--color-border)] p-3 text-sm font-bold"><input type="checkbox" name="publish" value="true" className="h-5 w-5 accent-[var(--color-primary)]" />Hemen yayınla</label>{error && <p role="alert" className="sm:col-span-2 text-sm font-bold text-red-700">{error}</p>}<div className="sm:col-span-2"><button type="submit" disabled={busy} className="button-primary">{busy ? "Kaydediliyor…" : "Ürünü kaydet"}</button></div></form>;
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="form-field">{label}<input className="form-control" name={name} {...props} /></label>; }
