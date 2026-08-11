"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AtlasImage, MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import {
  DEMO_CART_KEY,
  DEMO_STORAGE_PREFIX,
  getInitialDemoProducts,
  type DemoSeller,
  type DemoSellerPackage,
  type DemoSellerProduct,
} from "@/lib/demo-sellers";

export interface DemoCartItem {
  id: string;
  kind: "PRODUCT" | "PACKAGE";
  name: string;
  detail: string;
  price: number;
  quantity: number;
}

export interface DemoCartState {
  seller: Pick<DemoSeller, "slug" | "storeId" | "name" | "neighborhood" | "deliveryFee" | "minimumOrder" | "freeDeliveryThreshold">;
  items: DemoCartItem[];
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M3.5 4.5h2l1.7 10.2a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.5L20.5 8H6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" /><circle cx="17.2" cy="19.5" r="1.2" fill="currentColor" /></svg>;
}

export function DemoStorefront({ seller }: { seller: DemoSeller }) {
  const [products, setProducts] = useState(() => getInitialDemoProducts(seller));
  const [packages, setPackages] = useState(() => seller.packages);
  const [category, setCategory] = useState("Tümü");
  const [message, setMessage] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(`${DEMO_STORAGE_PREFIX}${seller.slug}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { products?: DemoSellerProduct[]; packages?: DemoSellerPackage[] };
          if (Array.isArray(parsed.products)) setProducts(parsed.products);
          if (Array.isArray(parsed.packages)) setPackages(parsed.packages);
        } catch {
          window.localStorage.removeItem(`${DEMO_STORAGE_PREFIX}${seller.slug}`);
        }
      }
      const cart = window.localStorage.getItem(DEMO_CART_KEY);
      if (cart) {
        try {
          const parsed = JSON.parse(cart) as DemoCartState;
          setCartCount(parsed.items.reduce((sum, item) => sum + item.quantity, 0));
        } catch {
          window.localStorage.removeItem(DEMO_CART_KEY);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [seller.slug]);

  const activeProducts = products.filter((item) => item.active && item.inStock);
  const categories = useMemo(() => ["Tümü", ...new Set(activeProducts.map((item) => item.category))], [activeProducts]);
  const visibleProducts = category === "Tümü" ? activeProducts : activeProducts.filter((item) => item.category === category);
  const activePackages = packages.filter((item) => item.active);

  function addItem(item: DemoCartItem) {
    let cart: DemoCartState | null = null;
    const raw = window.localStorage.getItem(DEMO_CART_KEY);
    if (raw) {
      try { cart = JSON.parse(raw) as DemoCartState; } catch { cart = null; }
    }
    if (cart && cart.seller.storeId !== seller.storeId) {
      const replace = window.confirm(`Sepetinde ${cart.seller.name} ürünleri var. Sepeti ${seller.name} mağazasıyla değiştirmek ister misin?`);
      if (!replace) return;
      cart = null;
    }
    const next: DemoCartState = cart ?? {
      seller: {
        slug: seller.slug,
        storeId: seller.storeId,
        name: seller.name,
        neighborhood: seller.neighborhood,
        deliveryFee: seller.deliveryFee,
        minimumOrder: seller.minimumOrder,
        freeDeliveryThreshold: seller.freeDeliveryThreshold,
      },
      items: [],
    };
    const existing = next.items.find((entry) => entry.id === item.id && entry.kind === item.kind);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else next.items.push(item);
    window.localStorage.setItem(DEMO_CART_KEY, JSON.stringify(next));
    setCartCount(next.items.reduce((sum, entry) => sum + entry.quantity, 0));
    setMessage(`${item.name} demo sepetine eklendi.`);
    window.setTimeout(() => setMessage(""), 2200);
  }

  return (
    <div className="bg-[#faf8f2] pb-16">
      <section className="relative overflow-hidden bg-[#153b2e] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(230,183,72,.42),transparent_22%),radial-gradient(circle_at_92%_80%,rgba(116,151,91,.35),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/magazalar" className="text-sm font-bold text-white/75 hover:text-white">← Mahalle mağazalarına dön</Link><div className="flex gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15">Demo mağaza</span><Link href="/sepet/demo" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-extrabold text-[#153b2e]"><CartIcon /> Sepet {cartCount > 0 ? `(${cartCount})` : ""}</Link></div></div>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div><div className="flex items-end gap-4"><span className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/20 text-xl font-extrabold shadow-xl" style={{ backgroundColor: seller.accent }}>{seller.initials}</span><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#d6e5b8]">{seller.neighborhood} mahalle mağazası</p><h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{seller.name}</h1></div></div><p className="mt-5 max-w-3xl text-base leading-7 text-white/72">{seller.description}</p><div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15"><MapPinIcon className="h-4 w-4" /> {seller.neighborhood}, {seller.district}</span><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15"><ShieldIcon className="h-4 w-4" /> Mahalle teslimatı aktif</span></div></div>
            <aside className="rounded-[22px] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#d6e5b8]">Teslimat özeti</p><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-white/60">Tahmini süre</dt><dd className="mt-1 font-extrabold">{seller.deliveryMinutes}</dd></div><div><dt className="text-white/60">Minimum sepet</dt><dd className="mt-1 font-extrabold">{money(seller.minimumOrder)}</dd></div><div><dt className="text-white/60">Teslimat</dt><dd className="mt-1 font-extrabold">{money(seller.deliveryFee)}</dd></div><div><dt className="text-white/60">Ücretsiz limit</dt><dd className="mt-1 font-extrabold">{money(seller.freeDeliveryThreshold)}</dd></div></dl></aside>
          </div>
        </div>
      </section>

      {message && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#153b2e] px-5 py-3 text-sm font-bold text-white shadow-2xl" role="status" aria-live="polite">{message}</div>}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Günlük taze</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mahallenin ürünleri</h2><p className="mt-2 text-sm text-[var(--color-muted-text)]">Bu mağazaya ait aktif fiyat ve satış ölçüleri.</p></div><Link href={`/seller/demo/${seller.slug}`} className="button-secondary">Demo seller paneli</Link></div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-extrabold ${category === item ? "bg-[#153b2e] text-white" : "border border-black/8 bg-white text-[#647168]"}`}>{item}</button>)}</div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((item, index) => <article key={item.id} className="overflow-hidden rounded-[20px] border border-black/6 bg-white shadow-[0_14px_42px_rgba(33,47,39,.06)]"><AtlasImage atlas="category" column={index % 4} row={Math.floor(index / 4) % 2} alt={`${item.name} ürün görseli`} className="aspect-[4/3]" sizes="(max-width: 640px) 50vw, 300px" /><div className="p-4"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7a6a4f]">{item.category}</p><h3 className="mt-1 min-h-12 font-bold leading-6">{item.name}</h3><div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-xs text-[#748078]">{item.quantity} {item.unit}</p><p className="mt-1 text-lg font-extrabold text-[#173f31]">{money(item.price)}</p></div><button type="button" onClick={() => addItem({ id: item.id, kind: "PRODUCT", name: item.name, detail: `${item.quantity} ${item.unit}`, price: item.price, quantity: 1 })} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d7ec9c] text-[#173f31] transition hover:scale-105 hover:bg-[#c8e27e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f31]" aria-label={`${item.name} sepete ekle`}><CartIcon /></button></div></div></article>)}</div>
      </section>

      <section className="border-y border-black/5 bg-[#f0eee6]"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><div><p className="eyebrow">Özenle hazırlanır</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Hazır paketler</h2></div><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{activePackages.map((item, index) => <article key={item.id} className="overflow-hidden rounded-[22px] bg-white shadow-[0_14px_42px_rgba(33,47,39,.06)]"><AtlasImage atlas="package" column={index % 3} row={Math.floor(index / 3) % 2} alt={`${item.name} paket görseli`} className="aspect-[4/3]" sizes="(max-width: 640px) 100vw, 300px" /><div className="p-5"><span className="rounded-full bg-[#f0f2ed] px-2.5 py-1 text-[10px] font-extrabold text-[#647168]">{item.type} paketi</span><h3 className="mt-3 text-lg font-bold">{item.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#748078]">{item.description}</p><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xl font-extrabold text-[#173f31]">{money(item.price)}</p><button type="button" onClick={() => addItem({ id: item.id, kind: "PACKAGE", name: item.name, detail: item.type, price: item.price, quantity: 1 })} className="button-primary"><CartIcon /> Ekle</button></div></div></article>)}</div></div></section>
    </div>
  );
}
