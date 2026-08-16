"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/marketplace-ui";

export interface CatalogProductOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_url: string | null;
  retail_quantity: number;
  retail_unit: string;
  wholesale_unit: string;
}

function ProductImage({ product }: { product: CatalogProductOption }) {
  return (
    <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface)]">
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="80px"
          className="object-contain p-1.5"
        />
      ) : (
        <span className="flex h-full items-center justify-center px-2 text-center text-[10px] font-bold leading-4 text-[var(--color-muted-text)]">
          Görsel hazırlanıyor
        </span>
      )}
    </span>
  );
}

function CatalogSelect({ products }: { products: CatalogProductOption[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery = !normalizedQuery || `${product.name} ${product.category}`.toLocaleLowerCase("tr-TR").includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);
  const selectedProduct = products.find((product) => product.id === selectedId);

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-extrabold text-[var(--color-ink)]">Fıstık360 ürün kataloğu</legend>
      <label htmlFor="catalog-product-native-select" className="sr-only">Katalog ürünü</label>
      <select
        id="catalog-product-native-select"
        name="catalogProductId"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        required
        className="sr-only"
      >
        <option value="">Ürün seçin</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>

      <div className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="form-field text-xs">
          Ürün ara
          <input
            className="form-control bg-white"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Örn. çiğ badem"
          />
        </label>
        <label className="form-field text-xs">
          Kategori
          <select className="form-control bg-white" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Tüm kategoriler</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <p className="text-xs font-semibold text-[var(--color-muted-text)]" aria-live="polite">
        {visibleProducts.length} ürün gösteriliyor
      </p>

      <div className="grid max-h-[520px] gap-2 overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-white p-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => {
          const selected = product.id === selectedId;
          return (
            <button
              key={product.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedId(product.id)}
              className={`group flex min-h-[104px] items-center gap-3 rounded-[16px] border p-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[0_0_0_1px_var(--color-primary)]" : "border-[var(--color-border-soft)] bg-white hover:border-[var(--color-primary-light)] hover:bg-[var(--color-surface)]"}`}
            >
              <ProductImage product={product} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--color-accent)]">{product.category}</span>
                <span className="mt-1 block text-sm font-bold leading-5 text-[var(--color-ink)]">{product.name}</span>
                <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${selected ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted-text)]"}`}>
                  {selected ? "Seçildi" : "Ürünü seç"}
                </span>
              </span>
            </button>
          );
        })}
        {!visibleProducts.length && (
          <p className="col-span-full p-8 text-center text-sm text-[var(--color-muted-text)]">Bu filtrelerle eşleşen ürün bulunamadı.</p>
        )}
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-3 rounded-[18px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-3">
          <ProductImage product={selectedProduct} />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[var(--color-primary)]">Seçilen katalog ürünü</p>
            <p className="mt-1 font-bold text-[var(--color-primary-dark)]">{selectedProduct.name}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-text)]">Adı, kategorisi ve görseli Fıstık360 tarafından merkezi yönetilir.</p>
          </div>
        </div>
      )}
    </fieldset>
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
    if (!formData.get("catalogProductId")) {
      setError("Devam etmek için katalogdan bir ürün seçin.");
      setBusy(false);
      return;
    }
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
        Katalogdan ürünü görseliyle seç; mağazana özel yalnız miktar, satış birimi ve fiyat bilgisini gir.
      </div>
      <CatalogSelect products={products} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="form-field">Miktar<input name="quantity" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue="250" required /></label>
        <label className="form-field">Satış birimi<select name="unit" className="form-control" defaultValue="gram" required><option value="gram">Gram</option><option value="kg">Kilogram</option><option value="adet">Adet</option><option value="paket">Paket</option></select></label>
        <label className="form-field">Satış fiyatı (TL)<input name="price" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>
      </div>
      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <button type="submit" disabled={busy || products.length === 0} className="button-primary">{busy ? "Kaydediliyor..." : <>Fiyatlandır ve satışa aç <ArrowIcon /></>}</button>
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
    if (!formData.get("catalogProductId")) {
      setError("Devam etmek için katalogdan bir ürün seçin.");
      setBusy(false);
      return;
    }
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
        Ürünü merkezi katalogdan görseliyle seç; yalnız ticari stok, minimum sipariş ve fiyat bilgilerini belirle.
      </div>
      <CatalogSelect products={products} />
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="form-field">Stok miktarı<input name="stockQuantity" className="form-control" type="number" inputMode="decimal" min="0" step="0.01" required /></label>
        <label className="form-field">Minimum sipariş<input name="minimumOrderQuantity" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>
        <label className="form-field">Birim fiyat (TL)<input name="unitPrice" className="form-control" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label>
      </div>
      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <button type="submit" disabled={busy || products.length === 0} className="button-primary">{busy ? "Kaydediliyor..." : <>Toptan pazarda yayınla <ArrowIcon /></>}</button>
    </form>
  );
}
