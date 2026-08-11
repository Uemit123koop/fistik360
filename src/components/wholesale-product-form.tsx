"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WHOLESALE_CATEGORIES } from "@/lib/seller-registration";

export function WholesaleProductForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/wholesale/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, isActive: formData.get("isActive") === "true" }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Ürün kaydedilemedi."); return; }
      router.replace("/dashboard/wholesale/products");
      router.refresh();
    } catch { setError("Bağlantı kurulamadı."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2"><label className="form-field">Ürün adı<input name="name" className="form-control" maxLength={140} required /></label><label className="form-field">Kategori<select name="category" className="form-control" required><option value="">Seçin</option>{WHOLESALE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field">Menşei<input name="origin" className="form-control" maxLength={100} placeholder="Gaziantep" /></label><label className="form-field">Ürün türü<input name="productType" className="form-control" maxLength={100} placeholder="Boz iç, W320..." /></label></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><label className="form-field">Satış birimi<select name="unit" className="form-control" defaultValue="kg"><option value="kg">kg</option><option value="ton">ton</option><option value="adet">adet</option></select></label><label className="form-field">Stok<input name="stockQuantity" className="form-control" type="number" inputMode="decimal" min="0" step="0.01" required /></label><label className="form-field">Minimum sipariş<input name="minimumOrderQuantity" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label><label className="form-field">Birim fiyat (TL)<input name="unitPrice" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label></div>
      <label className="form-field">Ürün açıklaması<textarea name="description" className="form-control min-h-28 resize-y" maxLength={1500} /></label>
      <label className="form-field">Ürün görseli URL<input name="imageUrl" className="form-control" type="url" placeholder="https://..." /></label>
      <label className="flex min-h-12 items-center gap-3 rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm font-semibold"><input name="isActive" value="true" type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" /> Ürünü toptan pazarda aktif yayınla</label>
      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="button-primary">{busy ? "Kaydediliyor..." : "Toptan ürünü kaydet"}</button>
    </form>
  );
}

