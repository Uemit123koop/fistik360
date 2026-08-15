"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RetailUnit = "gram" | "kg" | "adet" | "paket";

export interface SellerProductAttributeTag {
  attributeKey: string;
  attributeLabel: string;
  valueKey: string;
  valueLabel: string;
}

export interface SellerProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  is_in_stock: boolean;
  is_active: boolean;
  subcategoryName: string | null;
  mainCategoryName: string | null;
  attributeTags: SellerProductAttributeTag[];
}

function StatusToggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-[var(--color-muted-text)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
      {label}
    </label>
  );
}

export function SellerInventoryManager({ initialProducts }: { initialProducts: SellerProductRow[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function update(id: string, patch: Partial<SellerProductRow>) {
    setProducts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save(product: SellerProductRow) {
    setSaving(product.id);
    setMessage("");
    const response = await fetch(`/api/store/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        isActive: product.is_active,
        isInStock: product.is_in_stock,
      }),
    });
    const payload = await response.json();
    setSaving(null);
    setMessage(response.ok ? `${product.name} kaydedildi.` : (payload.error ?? "Ürün güncellenemedi."));
    if (response.ok) router.refresh();
  }

  if (!products.length) {
    return <p className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-7 text-[var(--color-muted-text)]">Henüz katalogdan ürün seçilmedi.</p>;
  }

  return (
    <div>
      {message && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold">{message}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[var(--color-accent)]">
                  {product.mainCategoryName && product.subcategoryName
                    ? `${product.mainCategoryName} › ${product.subcategoryName}`
                    : product.category}
                </p>
                <h2 className="mt-1 text-lg font-bold">{product.name}</h2>
                {product.attributeTags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {product.attributeTags.map((tag) => (
                      <span key={tag.valueKey} className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted-text)]">
                        {tag.valueLabel}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className={product.is_active ? "badge-success" : "chip"}>{product.is_active ? "Vitrinde" : "Taslak"}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="form-field text-xs">Miktar<input className="form-control" type="number" min="0.01" step="0.01" value={product.quantity} onChange={(event) => update(product.id, { quantity: Number(event.target.value) })} /></label>
              <label className="form-field text-xs">Birim<select className="form-control" value={product.unit} onChange={(event) => update(product.id, { unit: event.target.value as RetailUnit })}><option value="gram">Gram</option><option value="kg">Kilogram</option><option value="adet">Adet</option><option value="paket">Paket</option></select></label>
              <label className="form-field col-span-2 text-xs sm:col-span-1">Fiyat (TL)<input className="form-control" type="number" min="0.01" step="0.01" value={product.price} onChange={(event) => update(product.id, { price: Number(event.target.value) })} /></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)] pt-3">
              <div className="flex flex-wrap gap-4"><StatusToggle checked={product.is_in_stock} onChange={(checked) => update(product.id, { is_in_stock: checked })} label="Stokta" /><StatusToggle checked={product.is_active} onChange={(checked) => update(product.id, { is_active: checked })} label="Vitrinde aktif" /></div>
              <button type="button" onClick={() => save(product)} disabled={saving === product.id} className="button-primary">{saving === product.id ? "Kaydediliyor..." : "Değişiklikleri kaydet"}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

