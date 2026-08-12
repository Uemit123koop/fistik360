"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CartArtwork, CartIcon, CartItemControls, formatMoney } from "@/components/cart-ui";
import { ArrowIcon, MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import type { CartView } from "@/lib/cart";

type CartFetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "auth-required" }
  | { status: "ready"; cart: CartView | null };

interface CartDrawerContextValue {
  isOpen: boolean;
  state: CartFetchState;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer, CartDrawerProvider içinde kullanılmalı.");
  return ctx;
}

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<CartFetchState>({ status: "loading" });

  const fetchCart = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const data = (await res.json()) as { authRequired: boolean; cart: CartView | null; error?: string };
      if (!res.ok || data.error) {
        setState({ status: "error" });
        return;
      }
      if (data.authRequired) {
        setState({ status: "auth-required" });
        return;
      }
      setState({ status: "ready", cart: data.cart });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    fetchCart();
  }, [fetchCart]);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, state, openDrawer, closeDrawer, refresh: fetchCart }),
    [isOpen, state, openDrawer, closeDrawer, fetchCart],
  );

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawerPanel />
    </CartDrawerContext.Provider>
  );
}

export function CartTriggerButton({ count, className }: { count: number; className?: string }) {
  const { openDrawer } = useCartDrawer();
  const countLabel = count > 99 ? "99+" : String(count);
  return (
    <button type="button" onClick={openDrawer} className={className} aria-label={`Sepet, ${count} ürün`} aria-haspopup="dialog">
      <CartIcon />
      <span className="hidden text-sm xl:inline">Sepet</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-extrabold leading-none text-white">
          {countLabel}
        </span>
      )}
    </button>
  );
}

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-3 px-5 py-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3 rounded-[16px] border border-[var(--color-border-soft)] p-3">
          <div className="skeleton-shimmer h-20 w-20 shrink-0 rounded-[14px]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton-shimmer h-3 w-16 rounded-full" />
            <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
            <div className="skeleton-shimmer h-4 w-1/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DrawerEmptyState({
  icon,
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel,
  onNavigate,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]">
        {icon}
      </span>
      <p className="eyebrow mt-5">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--color-ink)]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--color-muted-text)]">{description}</p>
      <Link href={ctaHref} onClick={onNavigate} className="button-primary mt-6">
        {ctaLabel} <ArrowIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CartDrawerPanel() {
  const { isOpen, state, closeDrawer, refresh } = useCartDrawer();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeDrawer]);

  if (!isOpen) return null;

  const cart = state.status === "ready" ? state.cart : null;
  const progress = cart && cart.totals.minimumOrder > 0
    ? Math.min(100, Math.round((cart.totals.subtotal / cart.totals.minimumOrder) * 100))
    : 100;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Sepetin">
      <div className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in" onClick={closeDrawer} aria-hidden="true" />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--color-surface)] shadow-[var(--shadow-soft)] animate-drawer-in">
        <div className="safe-header flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div>
            <p className="eyebrow">Sepetin</p>
            {cart ? (
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                <span className="chip"><ShieldIcon className="h-3.5 w-3.5" /> {cart.store.name}</span>
                <span className="chip"><MapPinIcon className="h-3.5 w-3.5" /> {cart.serviceArea.label}</span>
              </div>
            ) : (
              <h2 className="mt-1 font-serif text-2xl font-bold">Sepetin</h2>
            )}
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Sepeti kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <CloseIcon />
          </button>
        </div>

        {state.status === "loading" && <div className="flex-1 overflow-y-auto"><DrawerSkeleton /></div>}

        {state.status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm font-semibold text-[#8a3324]">Sepet yüklenirken bir sorun oluştu.</p>
            <button type="button" className="button-secondary" onClick={refresh}>Tekrar dene</button>
          </div>
        )}

        {state.status === "auth-required" && (
          <DrawerEmptyState
            icon={<CartIcon className="h-7 w-7" />}
            eyebrow="Giriş gerekli"
            title="Sepetini görmek için giriş yap"
            description="Ürünlerini sepette görebilmek ve siparişi tamamlayabilmek için hesabına giriş yapman gerekiyor."
            ctaHref="/magaza-ac#login"
            ctaLabel="Giriş yap"
            onNavigate={closeDrawer}
          />
        )}

        {state.status === "ready" && (!cart || cart.items.length === 0) && (
          <DrawerEmptyState
            icon={<CartIcon className="h-7 w-7" />}
            eyebrow="Sepetin"
            title="Henüz boş"
            description="Mahallene teslimat yapan bir mağazadan taze ürün veya hazır paket ekleyebilirsin."
            ctaHref="/magazalar"
            ctaLabel="Mağazaları keşfet"
            onNavigate={closeDrawer}
          />
        )}

        {state.status === "ready" && cart && cart.items.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-3">
                {cart.items.map((item, index) => (
                  <li key={item.cartItemId} className="flex gap-3 rounded-[16px] border border-[var(--color-border-soft)] bg-white p-3 shadow-[var(--shadow-card)]">
                    <CartArtwork item={item} index={index} className="h-20 w-20 shrink-0 rounded-[14px]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-accent)]">
                        {item.kind === "PACKAGE" ? "Paket" : "Ürün"}
                      </p>
                      <h3 className="mt-0.5 truncate text-sm font-bold text-[var(--color-ink)]">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-text)]">{item.detail}</p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <CartItemControls
                          cartItemId={item.cartItemId}
                          quantity={item.quantity}
                          itemName={item.name}
                          onChanged={refresh}
                        />
                        <span className="shrink-0 text-sm font-extrabold tabular-nums text-[var(--color-primary-dark)]">
                          {formatMoney(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="safe-footer space-y-4 border-t border-[var(--color-border-soft)] bg-white px-5 py-4">
              {cart.totals.minimumRemaining > 0 && (
                <div className="rounded-[14px] bg-[#fff5df] p-3 text-xs text-[#6d4b17]">
                  <p className="font-bold">Minimum tutara {formatMoney(cart.totals.minimumRemaining)} kaldı</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-label={`Minimum sepet ilerlemesi yüzde ${progress}`}>
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted-text)]">Ara toplam</dt>
                  <dd className="font-bold tabular-nums">{formatMoney(cart.totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-muted-text)]">Teslimat</dt>
                  <dd className="font-bold tabular-nums">{cart.totals.deliveryFee === 0 ? "Ücretsiz" : formatMoney(cart.totals.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2 text-base">
                  <dt className="font-bold">Toplam</dt>
                  <dd className="text-lg font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(cart.totals.total)}</dd>
                </div>
              </dl>
              {cart.warning && <p className="rounded-[12px] bg-[#fff5df] p-3 text-xs font-semibold text-[#6d4b17]" role="status">{cart.warning}</p>}
              {cart.totals.minimumRemaining > 0 ? (
                <p className="rounded-[14px] border border-dashed border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-3 text-xs leading-5 text-[var(--color-primary-dark)]">
                  Siparişi tamamlamak için minimum sepet tutarına ulaşman gerekiyor.
                </p>
              ) : (
                <Link href="/sepet/odeme" onClick={closeDrawer} className="button-primary w-full">
                  Teslimat ve ödemeye geç <ArrowIcon className="h-4 w-4" />
                </Link>
              )}
              <Link href="/sepet" onClick={closeDrawer} className="block text-center text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
                Sepeti tam sayfada aç
              </Link>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
