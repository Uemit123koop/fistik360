"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/marketplace-ui";

export interface CatalogProductOption {
  id: string;
  name: string;
  category: string;
  retail_quantity: number;
  retail_unit: string;
  wholesale_unit: string;
}

function CatalogSelect({ products }: { products: CatalogProductOption[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, CatalogProductOption[]>();
    for (const product of products) map.set(product.category, [...(map.get(product.category) ?? []), product]);
    return [...map.entries()];
  }, [products]);

  return (
    <label className="form-field">Fıstık360 ürün kataloğu
      <select name="catalogProductId" className="form-control" required defaultValue="">
        <option value="" disabled>Ürün seçin</option>
        {groups.map(([category, items]) => (
          <optgroup key={category} label={category}>
            {items.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </optgroup>
        ))}
      </select>
      <span className="text-xs font-normal text-[var(--color-muted-text)]">Ürün adı, kategori, miktar ve görsel Fıstık360 kataloğundan gelir.</span>
    </label>
  );
}

export function StoreCatalogPriceForm({ products }: { products: CatalogProductOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Ürün fiyatı kaydedilemedi.");
        return;
      }
      router.replace("/dashboard/store/products");
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-[16px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 text-sm leading-6 text-[var(--color-primary-dark)]">
        Kendi ürün adını oluşturmana gerek yok. Katalogdan ürünü seç ve mağazandaki satış fiyatını gir; ürün doğrudan vitrinin ve sepet akışınla bağlanır.
      </div>
      <CatalogSelect products={products} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="form-field">Miktar
          <input name="quantity" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue="250" required />
        </label>
        <label className="form-field">Satış birimi
          <select name="unit" className="form-control" defaultValue="gram" required>
            <option value="gram">Gram</option>
            <option value="kg">Kilogram</option>
            <option value="adet">Adet</option>
            <option value="paket">Paket</option>
          </select>
        </label>
        <label className="form-field">Satış fiyatı (TL)
          <input name="price" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required />
        </label>
      </div>
      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <button type="submit" disabled={busy || products.length === 0} className="button-primary">
        {busy ? "Kaydediliyor..." : <>Fiyatlandır ve satışa aç <ArrowIcon /></>}
      </button>
    </form>
  );
}

export function WholesaleCatalogPriceForm({ products }: { products: CatalogProductOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/wholesale/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Toptan ürün kaydedilemedi.");
        return;
      }
      router.replace("/dashboard/wholesale/products");
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-[16px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 text-sm leading-6 text-[var(--color-primary-dark)]">
        Ürün kimliği Fıstık360 kataloğundan gelir. Toptan satış için yalnız ticari stok, minimum sipariş ve fiyat bilgilerini belirlersin.
      </div>
      <CatalogSelect products={products} />
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="form-field">Stok miktarı<input name="stockQuantity" className="form-control" type="number" inputMode="decimal" min="0" step="0.01" required /></label>
        <label className="form-field">Minimum sipariş<input name="minimumOrderQuantity" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>
        <label className="form-field">Birim fiyat (TL)<input name="unitPrice" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>
      </div>
      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <button type="submit" disabled={busy || products.length === 0} className="button-primary">
        {busy ? "Kaydediliyor..." : <>Toptan pazarda yayınla <ArrowIcon /></>}
      </button>
    </form>
  );
}
