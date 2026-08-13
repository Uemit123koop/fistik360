"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction } from "@/app/address-actions";
import { addToCartAction, updateCartItemAction } from "@/app/cart-actions";
import { CartArtwork, CartIcon, formatMoney } from "@/components/cart-ui";
import { ArrowIcon, MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import type { CartView, CartViewItem } from "@/lib/cart";
import { clearGuestCart, guestCartCount, readGuestCart, updateGuestCartEntryQuantity, type GuestCartEntry } from "@/lib/guest-cart";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/orders";
import { formatTurkishPhoneDisplay, normalizeTurkishPhone } from "@/lib/phone";

// ─── Ortak tipler ────────────────────────────────────────────────────────────

type TabId = "cart" | "delivery" | "payment";

interface DrawerCustomer {
  fullName: string | null;
  phone: string | null;
}

interface DrawerData {
  cart: CartView | null;
  isGuest: boolean;
  availableMethods: PaymentMethod[];
  customer: DrawerCustomer | null;
}

interface AddressRow {
  id: string;
  neighborhood_id: string;
  province: string;
  district: string;
  neighborhood: string;
  street: string;
  building_no: string;
  apartment_no: string | null;
  label: string | null;
  is_default: boolean;
}

const METHOD_NOTES: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Teslimatta nakit ödersin.",
  CARD_ON_DELIVERY: "Kurye POS cihazıyla gelir.",
  BANK_TRANSFER: "Sipariş sonrası IBAN bilgisi gösterilir.",
};

async function fetchCartData(): Promise<DrawerData> {
  const res = await fetch("/api/cart", { cache: "no-store" });
  const json = (await res.json()) as {
    authRequired: boolean;
    cart: CartView | null;
    availableMethods: PaymentMethod[];
    customer: DrawerCustomer | null;
    error?: string;
  };
  if (!res.ok || json.error) throw new Error(json.error ?? "Sepet okunamadı.");

  if (json.authRequired) {
    const entries = readGuestCart();
    if (entries.length === 0) {
      return { cart: null, isGuest: true, availableMethods: [], customer: null };
    }
    const guestRes = await fetch("/api/cart/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const guestJson = (await guestRes.json()) as { cart: CartView | null; availableMethods: PaymentMethod[]; error?: string };
    if (!guestRes.ok || guestJson.error) throw new Error(guestJson.error ?? "Sepet okunamadı.");
    return { cart: guestJson.cart, isGuest: true, availableMethods: guestJson.availableMethods ?? [], customer: null };
  }

  return { cart: json.cart, isGuest: false, availableMethods: json.availableMethods ?? [], customer: json.customer ?? null };
}

async function migrateGuestCartToReal(entries: GuestCartEntry[]) {
  async function run(replaceExisting: boolean): Promise<boolean> {
    for (const entry of entries) {
      const result = await addToCartAction({
        storeId: entry.storeId,
        serviceAreaId: entry.serviceAreaId,
        itemId: entry.itemId,
        kind: entry.kind,
        quantity: entry.quantity,
        replaceExisting,
      });
      if (result.code === "CONFIRM_REPLACEMENT" && !replaceExisting) return false;
    }
    return true;
  }

  const done = await run(false);
  if (!done) await run(true);
  clearGuestCart();
}

function composeDeliveryAddress(address: AddressRow): string {
  const apt = address.apartment_no ? `/${address.apartment_no}` : "";
  return `${address.street}, Bina/Daire: ${address.building_no}${apt}, ${address.neighborhood} Mahallesi, ${address.district}/${address.province}`;
}

// ─── Context / Provider ──────────────────────────────────────────────────────

interface CartDrawerContextValue {
  isOpen: boolean;
  loading: boolean;
  error: boolean;
  data: DrawerData | null;
  sessionKey: number;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer, CartDrawerProvider içinde kullanılmalı.");
  return ctx;
}

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<DrawerData | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchCartData();
      setData(next);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    setSessionKey((key) => key + 1);
    refresh();
  }, [refresh]);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, loading, error, data, sessionKey, openDrawer, closeDrawer, refresh }),
    [isOpen, loading, error, data, sessionKey, openDrawer, closeDrawer, refresh],
  );

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawerUrlTrigger />
      <CartDrawerPanel />
    </CartDrawerContext.Provider>
  );
}

// /sepet gibi sunucu taraflı yönlendirmeler herhangi bir genel sayfaya
// ?cart=open ile düşer; bu bileşen o parametreyi görünce drawer'ı açar ve
// URL'i temizler (AuthModalUrlTrigger'daki desenin aynısı).
function CartDrawerUrlTrigger() {
  const { openDrawer } = useCartDrawer();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cart") !== "open") return;
    openDrawer();
    params.delete("cart");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function CartTriggerButton({ count, className }: { count: number; className?: string }) {
  const { openDrawer } = useCartDrawer();
  const [guestCount, setGuestCount] = useState(0);

  useEffect(() => {
    function sync() {
      setGuestCount(guestCartCount());
    }
    sync();
    window.addEventListener("fistik360-guest-cart-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fistik360-guest-cart-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const total = count + guestCount;
  const countLabel = total > 99 ? "99+" : String(total);
  return (
    <button type="button" onClick={openDrawer} className={className} aria-label={`Sepet, ${total} ürün`} aria-haspopup="dialog">
      <CartIcon />
      <span className="hidden text-sm xl:inline">Sepet</span>
      {total > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-extrabold leading-none text-white">
          {countLabel}
        </span>
      )}
    </button>
  );
}

// ─── İkonlar / küçük yardımcılar ─────────────────────────────────────────────

function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

function TabPills({ activeTab, onSelect }: { activeTab: TabId; onSelect: (tab: TabId) => void }) {
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "cart", label: "Sepet" },
    { id: "delivery", label: "Teslimat" },
    { id: "payment", label: "Ödeme" },
  ];
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="flex items-center gap-1.5 px-5 pb-3" aria-label="Sipariş adımları">
      {tabs.map((tab, index) => {
        const status = index < activeIndex ? "done" : index === activeIndex ? "active" : "upcoming";
        return (
          <div key={tab.id} className="flex flex-1 items-center gap-1.5">
            <button
              type="button"
              disabled={status !== "done"}
              onClick={() => onSelect(tab.id)}
              className={`flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-extrabold transition-colors ${
                status === "done"
                  ? "cursor-pointer bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] hover:brightness-95"
                  : status === "active"
                    ? "cursor-default bg-[var(--color-primary)] text-white"
                    : "cursor-default border border-[var(--color-border)] bg-white text-[var(--color-muted-text)]"
              }`}
            >
              {status === "done" ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
            {index < tabs.length - 1 && (
              <span className={`h-0.5 flex-1 rounded-full ${index < activeIndex ? "bg-[var(--color-primary-soft)]" : "bg-[var(--color-border-soft)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sepet sekmesi: adet kontrolü (misafir/gerçek ayrımlı) ──────────────────

function DrawerItemQuantityControls({
  item,
  isGuest,
  onChanged,
}: {
  item: CartViewItem;
  isGuest: boolean;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  function apply(nextQuantity: number) {
    startTransition(async () => {
      if (isGuest) {
        updateGuestCartEntryQuantity(item.id, item.kind, nextQuantity);
      } else {
        await updateCartItemAction(item.cartItemId, nextQuantity);
      }
      onChanged();
    });
  }

  function update(nextQuantity: number) {
    if (nextQuantity === 0) {
      setConfirmRemove(true);
      return;
    }
    apply(nextQuantity);
  }

  if (confirmRemove) {
    return (
      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-2 text-xs">
        <p className="font-bold text-[var(--color-ink)]">{item.name} sepetten çıkarılsın mı?</p>
        <div className="mt-2 flex gap-2">
          <button type="button" className="min-h-8 rounded-full bg-[#8a3324] px-3 font-bold text-white" disabled={isPending} onClick={() => { setConfirmRemove(false); apply(0); }}>
            Çıkar
          </button>
          <button type="button" className="min-h-8 rounded-full border border-[var(--color-border)] px-3 font-bold" disabled={isPending} onClick={() => setConfirmRemove(false)}>
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-grid grid-cols-[36px_36px_36px] items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        type="button"
        className="flex h-9 items-center justify-center text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-soft)] disabled:opacity-50"
        aria-label={`${item.name} adedini azalt`}
        disabled={isPending}
        onClick={() => update(item.quantity - 1)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <span className="text-center text-sm font-extrabold tabular-nums" aria-label={`${item.quantity} adet`}>{item.quantity}</span>
      <button
        type="button"
        className="flex h-9 items-center justify-center text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-soft)] disabled:opacity-50"
        aria-label={`${item.name} adedini artır`}
        disabled={isPending || item.quantity >= 99}
        onClick={() => update(item.quantity + 1)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

// ─── Sekme 1: Sepet ──────────────────────────────────────────────────────────

function CartTabContent({
  cart,
  isGuest,
  onChanged,
  onContinue,
  closeDrawer,
}: {
  cart: CartView;
  isGuest: boolean;
  onChanged: () => void;
  onContinue: () => void;
  closeDrawer: () => void;
}) {
  const progress = cart.totals.minimumOrder > 0
    ? Math.min(100, Math.round((cart.totals.subtotal / cart.totals.minimumOrder) * 100))
    : 100;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="chip"><ShieldIcon className="h-3.5 w-3.5" /> {cart.store.name}</span>
          <span className="chip"><MapPinIcon className="h-3.5 w-3.5" /> {cart.serviceArea.label}</span>
        </div>
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
                  <DrawerItemQuantityControls item={item} isGuest={isGuest} onChanged={onChanged} />
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
          <button type="button" onClick={onContinue} className="button-primary w-full">
            Teslimat bilgileri <ArrowIcon className="h-4 w-4" />
          </button>
        )}
        <Link href="/magazalar" onClick={closeDrawer} className="block text-center text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
          Mağazaları keşfetmeye devam et
        </Link>
      </div>
    </>
  );
}

// ─── Sekme 2: Teslimat (telefon OTP + adres defteri) ────────────────────────

function DeliveryTabContent({
  data,
  refresh,
  onBack,
  onContinue,
  name,
  setName,
  phone,
  setPhone,
  addresses,
  addressesLoading,
  loadAddresses,
  selectedAddressId,
  setSelectedAddressId,
}: {
  data: DrawerData;
  refresh: () => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  addresses: AddressRow[] | null;
  addressesLoading: boolean;
  loadAddresses: () => Promise<void>;
  selectedAddressId: string | null;
  setSelectedAddressId: (v: string | null) => void;
}) {
  const [otpPhone, setOtpPhone] = useState("");
  const [otpStage, setOtpStage] = useState<"phone" | "code">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sentPhone, setSentPhone] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStreet, setNewStreet] = useState("");
  const [newBuildingNo, setNewBuildingNo] = useState("");
  const [newApartmentNo, setNewApartmentNo] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newMakeDefault, setNewMakeDefault] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!data.isGuest && addresses === null) loadAddresses();
  }, [data.isGuest, addresses, loadAddresses]);

  async function sendCode() {
    setOtpError(null);
    const normalized = normalizeTurkishPhone(otpPhone);
    if (!normalized) {
      setOtpError("Geçerli bir cep telefonu numarası girin.");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/login-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setOtpError(json.error ?? "Kod gönderilemedi.");
        return;
      }
      setSentPhone(normalized);
      setOtpStage("code");
    } catch {
      setOtpError("Bağlantı kurulamadı.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyCode() {
    if (!sentPhone) return;
    setOtpError(null);
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sentPhone, token: otpCode.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; fullName?: string | null; error?: string };
      if (!res.ok || !json.ok) {
        setOtpError(json.error ?? "Kod doğrulanamadı.");
        return;
      }

      const entries = readGuestCart();
      if (entries.length > 0) await migrateGuestCartToReal(entries);

      const phoneDigits = sentPhone.replace(/\D/g, "");
      const looksLikePhoneFallback = !json.fullName || json.fullName.replace(/\D/g, "") === phoneDigits;
      setName(looksLikePhoneFallback ? "" : (json.fullName ?? ""));
      setPhone(formatTurkishPhoneDisplay(sentPhone));

      await refresh();
    } catch {
      setOtpError("Bağlantı kurulamadı.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function makeDefault(addressId: string) {
    await setDefaultAddressAction(addressId);
    await loadAddresses();
  }

  async function removeAddress(addressId: string) {
    await deleteAddressAction(addressId);
    if (selectedAddressId === addressId) setSelectedAddressId(null);
    await loadAddresses();
  }

  async function saveNewAddress() {
    if (!data.cart) return;
    setAddressError(null);
    const street = newStreet.trim();
    const buildingNo = newBuildingNo.trim();
    if (!street || !buildingNo) {
      setAddressError("Sokak ve bina no zorunludur.");
      return;
    }
    setAddressBusy(true);
    try {
      const result = await addAddressAction({
        neighborhoodId: data.cart.serviceArea.neighborhoodId,
        street,
        buildingNo,
        apartmentNo: newApartmentNo.trim() || undefined,
        label: newLabel.trim() || undefined,
        makeDefault: newMakeDefault,
      });
      if (!result.ok) {
        setAddressError(result.message);
        return;
      }
      setShowAddForm(false);
      setNewStreet("");
      setNewBuildingNo("");
      setNewApartmentNo("");
      setNewLabel("");
      setNewMakeDefault(false);
      setSelectedAddressId(null);
      await loadAddresses();
    } finally {
      setAddressBusy(false);
    }
  }

  const canContinue = !data.isGuest && name.trim() !== "" && phone.trim() !== "" && selectedAddressId !== null;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <button type="button" onClick={onBack} className="mb-3 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
        ← Sepete dön
      </button>
      {data.isGuest ? (
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Teslimat bilgileri</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-[var(--color-ink)]">Önce telefonunu doğrula</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
              Siparişini takip edebilmen için cep telefonunu SMS kodu ile doğrulaman gerekiyor.
            </p>
          </div>

          {otpStage === "phone" ? (
            <div className="space-y-3">
              <label className="form-field">
                Telefon numarası
                <input
                  className="form-control"
                  type="tel"
                  inputMode="tel"
                  placeholder="05xx xxx xx xx"
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  maxLength={20}
                />
              </label>
              {otpError && <p className="text-xs font-semibold text-[#8a3324]" role="alert">{otpError}</p>}
              <button type="button" className="button-primary w-full" disabled={otpBusy} onClick={sendCode}>
                {otpBusy ? "Gönderiliyor..." : "SMS kodu gönder"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-[12px] bg-[var(--color-primary-soft)] p-3 text-xs font-semibold text-[var(--color-primary-dark)]">
                {sentPhone ? formatTurkishPhoneDisplay(sentPhone) : ""} numarasına kod gönderildi.
              </p>
              <label className="form-field">
                6 haneli kod
                <input
                  className="form-control tracking-[0.3em]"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              {otpError && <p className="text-xs font-semibold text-[#8a3324]" role="alert">{otpError}</p>}
              <button type="button" className="button-primary w-full" disabled={otpBusy || otpCode.length !== 6} onClick={verifyCode}>
                {otpBusy ? "Doğrulanıyor..." : "Devam et"}
              </button>
              <button type="button" className="block w-full text-center text-xs font-bold text-[var(--color-primary)]" disabled={otpBusy} onClick={() => { setOtpStage("phone"); setOtpCode(""); }}>
                Numarayı değiştir
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[12px] bg-[var(--color-primary-soft)] p-3 text-xs font-semibold text-[var(--color-primary-dark)]" role="status">
            Hoş geldin{name ? ` ${name}` : ""}! Numaran doğrulandı, {data.cart?.serviceArea.label ?? "mahallen"} zaten biliniyor.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-field">
              Ad soyad
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="form-field">
              Telefon
              <input className="form-control" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-extrabold text-[var(--color-ink)]">
              Adres defterin{addresses && addresses.length > 0 ? ` · ${addresses.length} adres` : ""}
            </p>
            {addressesLoading && addresses === null && <p className="text-xs text-[var(--color-muted-text)]">Adresler yükleniyor...</p>}
            {addresses !== null && addresses.length === 0 && !showAddForm && (
              <p className="text-xs text-[var(--color-muted-text)]">Henüz kayıtlı adresin yok, aşağıdan ekleyebilirsin.</p>
            )}
            <div className="space-y-2">
              {(addresses ?? []).map((address) => (
                <label
                  key={address.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-3 text-sm transition-colors ${
                    selectedAddressId === address.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery-address"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {address.label && <span className="font-bold text-[var(--color-ink)]">{address.label}</span>}
                      {address.is_default && (
                        <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-extrabold text-white">Varsayılan</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[var(--color-ink)]">{address.street} No:{address.building_no}{address.apartment_no ? `/${address.apartment_no}` : ""}</span>
                    <span className="mt-0.5 block text-xs text-[var(--color-muted-text)]">{address.neighborhood} Mah. · {address.district}/{address.province}</span>
                    <span className="mt-1.5 flex gap-3 text-xs font-bold">
                      {!address.is_default && (
                        <button type="button" className="text-[var(--color-primary)] hover:underline" onClick={() => makeDefault(address.id)}>
                          Varsayılan yap
                        </button>
                      )}
                      <button type="button" className="text-[#8a3324] hover:underline" onClick={() => removeAddress(address.id)}>
                        Sil
                      </button>
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {showAddForm ? (
              <div className="mt-3 space-y-3 rounded-[14px] border border-dashed border-[var(--color-border)] p-3">
                <p className="text-xs font-semibold text-[var(--color-muted-text)]">Teslimat mahallesi: {data.cart?.serviceArea.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-field">
                    Sokak
                    <input className="form-control" value={newStreet} onChange={(e) => setNewStreet(e.target.value)} maxLength={200} />
                  </label>
                  <label className="form-field">
                    Bina no
                    <input className="form-control" value={newBuildingNo} onChange={(e) => setNewBuildingNo(e.target.value)} maxLength={20} />
                  </label>
                  <label className="form-field">
                    Ek adres <span className="font-normal opacity-60">(isteğe bağlı — Daire no, kat vb.)</span>
                    <input className="form-control" value={newApartmentNo} onChange={(e) => setNewApartmentNo(e.target.value)} maxLength={20} />
                  </label>
                  <label className="form-field">
                    Etiket <span className="font-normal opacity-60">(Ev, İş vb.)</span>
                    <input className="form-control" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={40} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={newMakeDefault} onChange={(e) => setNewMakeDefault(e.target.checked)} />
                  Varsayılan adresim olsun
                </label>
                {addressError && <p className="text-xs font-semibold text-[#8a3324]" role="alert">{addressError}</p>}
                <div className="flex gap-2">
                  <button type="button" className="button-primary flex-1" disabled={addressBusy} onClick={saveNewAddress}>
                    {addressBusy ? "Kaydediliyor..." : "Adresi kaydet"}
                  </button>
                  <button type="button" className="button-secondary" disabled={addressBusy} onClick={() => setShowAddForm(false)}>
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="button-secondary mt-3 w-full" onClick={() => setShowAddForm(true)}>
                + Yeni adres ekle
              </button>
            )}
          </div>

          <button type="button" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45" disabled={!canContinue} onClick={onContinue}>
            Ödemeye geç <ArrowIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sekme 3: Ödeme ──────────────────────────────────────────────────────────

function PaymentTabContent({
  data,
  name,
  phone,
  selectedAddress,
  onBack,
  onPlaced,
}: {
  data: DrawerData;
  name: string;
  phone: string;
  selectedAddress: AddressRow | null;
  onBack: () => void;
  onPlaced: (orderId: string) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(data.availableMethods[0] ?? "");
  const [contractAccepted, setContractAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(selectedAddress) && paymentMethod !== "" && contractAccepted && privacyAcknowledged && !busy;

  async function submit() {
    if (!canSubmit || !selectedAddress) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          deliveryAddress: composeDeliveryAddress(selectedAddress),
          customerNote: "",
          paymentMethod,
          contractAccepted,
          privacyAcknowledged,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok || !json.ok || !json.orderId) {
        setError(json.error ?? "Sipariş oluşturulamadı.");
        return;
      }
      onPlaced(json.orderId);
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <button type="button" onClick={onBack} className="mb-3 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
        ← Teslimat bilgilerine dön
      </button>
      <div className="space-y-5">
        {selectedAddress && (
          <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-white p-3 text-xs leading-5 text-[var(--color-muted-text)]">
            <p className="font-bold text-[var(--color-ink)]">{name} · {phone}</p>
            <p className="mt-0.5">{composeDeliveryAddress(selectedAddress)}</p>
          </div>
        )}

        <fieldset className="grid gap-3">
          <legend className="text-sm font-extrabold">Ödeme yöntemi</legend>
          {data.availableMethods.length === 0 && (
            <p className="rounded-[12px] bg-red-50 p-3 text-xs font-semibold text-red-800" role="alert">
              Bu mağaza henüz ödeme yöntemi tanımlamamış.
            </p>
          )}
          {data.availableMethods.map((method) => (
            <label
              key={method}
              className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-3 text-sm has-checked:border-[var(--color-primary)] has-checked:bg-[var(--color-primary-soft)]"
            >
              <input
                type="radio"
                name="drawer-payment-method"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block font-bold">{PAYMENT_METHOD_LABELS[method]}</span>
                <span className="mt-0.5 block text-xs leading-5 text-[var(--color-muted-text)]">{METHOD_NOTES[method]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="grid gap-3 border-t border-[var(--color-border-soft)] pt-4">
          <legend className="text-sm font-extrabold">Sipariş onayları</legend>
          <label className="flex items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-xs leading-5">
            <input
              type="checkbox"
              checked={contractAccepted}
              onChange={(e) => setContractAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              <Link href="/sayfalar/mesafeli-satis-sozlesmesi" className="font-extrabold underline underline-offset-2">
                Mesafeli Satış Sözleşmesi
              </Link>{" "}
              ve sipariş ön bilgilerini okudum; sipariş onayının ödeme yükümlülüğü doğurduğunu kabul ediyorum.{" "}
              <strong>(Zorunlu)</strong>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-xs leading-5">
            <input
              type="checkbox"
              checked={privacyAcknowledged}
              onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              <Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-extrabold underline underline-offset-2">
                KVKK Aydınlatma Metni
              </Link>{" "}
              ve{" "}
              <Link href="/sayfalar/gizlilik-politikasi" className="font-extrabold underline underline-offset-2">
                Gizlilik Politikası
              </Link>{" "}
              hakkında bilgilendirildim. <strong>(Zorunlu)</strong>
            </span>
          </label>
        </fieldset>

        {error && <p className="rounded-[12px] bg-red-50 p-3 text-xs font-semibold text-red-800" role="alert">{error}</p>}

        <button type="button" className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45" disabled={!canSubmit} onClick={submit}>
          {busy ? "Sipariş oluşturuluyor..." : "Siparişi onayla (%0 komisyon)"} {!busy && <ArrowIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Başarı ekranı ───────────────────────────────────────────────────────────

function OrderPlacedContent({ orderId, closeDrawer }: { orderId: string; closeDrawer: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]">
        <CheckIcon className="h-7 w-7" />
      </span>
      <p className="eyebrow mt-5">Sipariş alındı</p>
      <h2 className="mt-2 font-serif text-2xl font-bold text-[var(--color-ink)]">Siparişin alındı!</h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--color-muted-text)]">
        Mağaza siparişini onayladığında bilgilendirileceksin.
      </p>
      <Link href={`/dashboard/customer/orders?placed=${orderId}`} onClick={closeDrawer} className="button-primary mt-6">
        Siparişlerimi gör <ArrowIcon className="h-4 w-4" />
      </Link>
      <button type="button" onClick={closeDrawer} className="mt-3 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
        Kapat
      </button>
    </div>
  );
}

// ─── Panel gövdesi (sessionKey ile her açılışta sıfırlanır) ─────────────────

function DrawerContent({
  data,
  refresh,
  closeDrawer,
}: {
  data: DrawerData;
  refresh: () => Promise<void>;
  closeDrawer: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("cart");
  const [name, setName] = useState(data.customer?.fullName ?? "");
  const [phone, setPhone] = useState(data.customer?.phone ? formatTurkishPhoneDisplay(data.customer.phone) : "");
  const [addresses, setAddresses] = useState<AddressRow[] | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      const json = (await res.json()) as { addresses: AddressRow[] };
      const list = json.addresses ?? [];
      setAddresses(list);
      setSelectedAddressId((current) => current ?? list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null);
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  const selectedAddress = useMemo(
    () => (addresses ?? []).find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  if (orderPlaced) {
    return <OrderPlacedContent orderId={orderPlaced} closeDrawer={closeDrawer} />;
  }

  if (!data.cart || data.cart.items.length === 0) {
    return (
      <DrawerEmptyState
        icon={<CartIcon className="h-7 w-7" />}
        eyebrow="Sepetin"
        title="Henüz boş"
        description="Mahallene teslimat yapan bir mağazadan taze ürün veya hazır paket ekleyebilirsin."
        ctaHref="/magazalar"
        ctaLabel="Mağazaları keşfet"
        onNavigate={closeDrawer}
      />
    );
  }

  return (
    <>
      <TabPills activeTab={activeTab} onSelect={setActiveTab} />
      {activeTab === "cart" && (
        <CartTabContent
          cart={data.cart}
          isGuest={data.isGuest}
          onChanged={refresh}
          onContinue={() => setActiveTab("delivery")}
          closeDrawer={closeDrawer}
        />
      )}
      {activeTab === "delivery" && (
        <DeliveryTabContent
          data={data}
          refresh={refresh}
          onBack={() => setActiveTab("cart")}
          onContinue={() => setActiveTab("payment")}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          addresses={addresses}
          addressesLoading={addressesLoading}
          loadAddresses={loadAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
        />
      )}
      {activeTab === "payment" && (
        <PaymentTabContent
          data={data}
          name={name}
          phone={phone}
          selectedAddress={selectedAddress}
          onBack={() => setActiveTab("delivery")}
          onPlaced={setOrderPlaced}
        />
      )}
    </>
  );
}

// ─── Ana panel ────────────────────────────────────────────────────────────

function CartDrawerPanel() {
  const { isOpen, loading, error, data, sessionKey, closeDrawer, refresh } = useCartDrawer();

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

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Sepetin">
      <div className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm animate-overlay-in" onClick={closeDrawer} aria-hidden="true" />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--color-surface)] shadow-[var(--shadow-soft)] animate-drawer-in">
        <div className="safe-header flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <h2 className="font-serif text-2xl font-bold">Sepetin</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Sepeti kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <CloseIcon />
          </button>
        </div>

        {loading && !data && <div className="flex-1 overflow-y-auto"><DrawerSkeleton /></div>}

        {error && !data && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm font-semibold text-[#8a3324]">Sepet yüklenirken bir sorun oluştu.</p>
            <button type="button" className="button-secondary" onClick={refresh}>Tekrar dene</button>
          </div>
        )}

        {data && <DrawerContent key={sessionKey} data={data} refresh={refresh} closeDrawer={closeDrawer} />}
      </div>
    </div>,
    document.body,
  );
}
