"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEMO_CART_KEY } from "@/lib/demo-sellers";
import type { DemoCartState } from "@/components/demo-storefront";
import { OrderConsentPanel } from "@/components/order-consent-panel";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

export function DemoCart() {
  const [cart, setCart] = useState<DemoCartState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(DEMO_CART_KEY);
      if (raw) {
        try { setCart(JSON.parse(raw) as DemoCartState); } catch { window.localStorage.removeItem(DEMO_CART_KEY); }
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persist(next: DemoCartState | null) {
    setCart(next);
    if (next?.items.length) window.localStorage.setItem(DEMO_CART_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(DEMO_CART_KEY);
  }

  function update(id: string, kind: "PRODUCT" | "PACKAGE", quantity: number) {
    if (!cart) return;
    const items = cart.items.flatMap((item) => item.id === id && item.kind === kind
      ? quantity > 0 ? [{ ...item, quantity }] : []
      : [item]);
    persist(items.length ? { ...cart, items } : null);
  }

  const subtotal = useMemo(() => cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0, [cart]);
  const delivery = cart && subtotal >= cart.seller.freeDeliveryThreshold ? 0 : cart?.seller.deliveryFee ?? 0;
  const total = subtotal + delivery;

  if (!ready) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-[var(--color-muted-text)]">Demo sepet yükleniyor...</div>;
  if (!cart || cart.items.length === 0) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><div className="rounded-[28px] border border-black/5 bg-white p-10 shadow-[0_20px_60px_rgba(33,47,39,.08)]"><p className="eyebrow">Demo sepet</p><h1 className="mt-3 font-serif text-4xl font-bold">Sepetin henüz boş</h1><p className="mx-auto mt-4 max-w-md leading-7 text-[var(--color-muted-text)]">Beş mahalle mağazasından birini açıp ürün veya paket ekleyebilirsin.</p><Link href="/magazalar" className="button-primary mt-7">Mahalle mağazalarını keşfet</Link></div></div>;

  const remaining = Math.max(0, cart.seller.minimumOrder - subtotal);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-4 border-b border-black/5 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Tek mağazalı demo sepet</p><h1 className="mt-2 font-serif text-4xl font-bold">Sepetin</h1><p className="mt-3 text-sm font-bold text-[#647168]">{cart.seller.name} · {cart.seller.neighborhood}</p></div><Link href={`/magaza/${cart.seller.storeId}`} className="button-secondary">Mağazaya dön</Link></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_350px]">
        <section className="space-y-3">{cart.items.map((item) => <article key={`${item.kind}-${item.id}`} className="flex items-center gap-4 rounded-[20px] border border-black/5 bg-white p-4 shadow-[0_12px_36px_rgba(33,47,39,.05)]"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#edf3e6] text-xs font-extrabold text-[#315a48]">{item.kind === "PACKAGE" ? "PAKET" : "ÜRÜN"}</div><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{item.name}</h2><p className="mt-1 text-xs text-[#748078]">{item.detail} · {money(item.price)}</p></div><div className="text-right"><p className="font-extrabold text-[#173f31]">{money(item.price * item.quantity)}</p><div className="mt-2 inline-grid grid-cols-[36px_38px_36px] overflow-hidden rounded-full border border-black/10"><button type="button" onClick={() => update(item.id, item.kind, item.quantity - 1)} className="h-9 hover:bg-[#f0f2ed]" aria-label={`${item.name} azalt`}>−</button><span className="grid place-items-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => update(item.id, item.kind, Math.min(99, item.quantity + 1))} className="h-9 hover:bg-[#f0f2ed]" aria-label={`${item.name} artır`}>+</button></div></div></article>)}</section>
        <aside className="h-fit rounded-[24px] bg-[#173f31] p-5 text-white shadow-[0_22px_60px_rgba(23,63,49,.2)] lg:sticky lg:top-28"><h2 className="text-xl font-bold">Sipariş özeti</h2>{remaining > 0 && <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm"><p className="font-bold">Minimum sepete {money(remaining)} kaldı</p></div>}<dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-white/65">Ara toplam</dt><dd className="font-bold">{money(subtotal)}</dd></div><div className="flex justify-between"><dt className="text-white/65">Teslimat</dt><dd className="font-bold">{delivery === 0 ? "Ücretsiz" : money(delivery)}</dd></div><div className="flex justify-between border-t border-white/15 pt-4 text-base"><dt className="font-bold">Toplam</dt><dd className="text-xl font-extrabold">{money(total)}</dd></div></dl><OrderConsentPanel demo blocked={remaining > 0} /></aside>
      </div>
    </div>
  );
}
