"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { addToCartAction, updateCartItemAction } from "@/app/cart-actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { AtlasImage } from "@/components/marketplace-ui";
import type { CartViewItem, StorefrontItem } from "@/lib/cart";

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

export function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 4.5h2l1.7 10.2a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.5L20.5 8H6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" />
      <circle cx="17.2" cy="19.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ProductArtwork({ item, index }: { item: StorefrontItem; index: number }) {
  if (item.imageUrl && (/^https?:\/\//i.test(item.imageUrl) || item.imageUrl.startsWith("/"))) {
    return (
      <div
        role="img"
        aria-label={`${item.name} ürün görseli`}
        className="aspect-[4/3] bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }}
      />
    );
  }

  return (
    <AtlasImage
      atlas={item.kind === "PACKAGE" ? "package" : "category"}
      column={item.kind === "PACKAGE" ? index % 3 : index % 4}
      row={Math.floor(index / (item.kind === "PACKAGE" ? 3 : 4)) % 2}
      alt={`${item.name} ürün görseli`}
      className="aspect-[4/3]"
      sizes="(max-width: 640px) 50vw, 320px"
    />
  );
}

export function CartArtwork({
  item,
  index,
  className = "h-24 w-24 rounded-[16px] sm:h-28 sm:w-28",
}: {
  item: CartViewItem;
  index: number;
  className?: string;
}) {
  const imageUrl = item.imageUrl && (/^https?:\/\//i.test(item.imageUrl) || item.imageUrl.startsWith("/"))
    ? item.imageUrl
    : null;
  return (
    <div
      role="img"
      aria-label={`${item.name} görseli`}
      className={`shrink-0 border border-[var(--color-border-soft)] bg-[#e9dfcf] bg-cover bg-center ${className}`}
      style={imageUrl
        ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` }
        : { backgroundImage: `url(/assets/category-atlas.png)`, backgroundSize: "400% 200%", backgroundPosition: `${(index % 4) * 33.333}% ${Math.floor(index / 4) * 100}%` }}
    />
  );
}

export function StorefrontItemCard({
  item,
  index,
  storeId,
  serviceAreaId,
}: {
  item: StorefrontItem;
  index: number;
  storeId: string;
  serviceAreaId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [replaceConfirm, setReplaceConfirm] = useState<string | null>(null);

  function add(replaceExisting = false) {
    if (!serviceAreaId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addToCartAction({
        storeId,
        serviceAreaId,
        itemId: item.id,
        kind: item.kind,
        replaceExisting,
      });

      if (result.code === "AUTH_REQUIRED") {
        router.push(`/giris?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (result.code === "CONFIRM_REPLACEMENT") {
        setReplaceConfirm(result.message);
        return;
      }

      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <article className="group overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative">
        <ProductArtwork item={item} index={index} />
        <span className="absolute left-3 top-3 inline-flex min-h-7 items-center rounded-full bg-white/95 px-2.5 text-[11px] font-extrabold text-[var(--color-primary-dark)] shadow-sm">
          {item.kind === "PACKAGE" ? "Hazır paket" : "Taze ürün"}
        </span>
      </div>
      <div className="flex h-[calc(100%-auto)] flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--color-ink)] sm:text-lg">{item.name}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-text)]">{item.detail}</p>
          </div>
          <p className="shrink-0 font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(item.price)}</p>
        </div>
        {item.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-muted-text)]">{item.description}</p>}
        <button
          type="button"
          className="button-primary mt-4 w-full"
          disabled={isPending || !serviceAreaId}
          onClick={() => add()}
        >
          {isPending ? <><span className="loading-dot" /> Ekleniyor</> : <><CartIcon /> Sepete ekle</>}
        </button>
        {!serviceAreaId && <p className="mt-2 text-xs font-semibold text-[#8a3324]">Bu mağazanın aktif teslimat bölgesi yok.</p>}
        {message && (
          <p className={`mt-2 text-xs font-semibold ${isError ? "text-[#8a3324]" : "text-[var(--color-primary-dark)]"}`} role={isError ? "alert" : "status"} aria-live="polite">
            {message}
          </p>
        )}
      </div>
      <ConfirmModal
        open={replaceConfirm !== null}
        title="Sepetinde bir mağaza bekliyor"
        description={replaceConfirm ?? undefined}
        confirmLabel="Sepeti değiştir"
        cancelLabel="Vazgeç"
        pending={isPending}
        onCancel={() => setReplaceConfirm(null)}
        onConfirm={() => {
          setReplaceConfirm(null);
          add(true);
        }}
      />
    </article>
  );
}

export function CartItemControls({
  cartItemId,
  quantity,
  itemName,
  onChanged,
}: {
  cartItemId: string;
  quantity: number;
  itemName: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function apply(nextQuantity: number) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateCartItemAction(cartItemId, nextQuantity);
      if (!result.ok) setMessage(result.message);
      router.refresh();
      onChanged?.();
    });
  }

  function update(nextQuantity: number) {
    if (nextQuantity === 0) {
      setConfirmRemove(true);
      return;
    }
    apply(nextQuantity);
  }

  return (
    <div>
      <div className="inline-grid grid-cols-[44px_48px_44px] items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          className="flex h-11 items-center justify-center text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
          aria-label={`${itemName} adedini azalt`}
          disabled={isPending}
          onClick={() => update(quantity - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <span className="text-center text-sm font-extrabold tabular-nums" aria-label={`${quantity} adet`}>{quantity}</span>
        <button
          type="button"
          className="flex h-11 items-center justify-center text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
          aria-label={`${itemName} adedini artır`}
          disabled={isPending || quantity >= 99}
          onClick={() => update(quantity + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      <button
        type="button"
        className="mt-1 block min-h-10 text-xs font-bold text-[#8a3324] underline-offset-4 hover:underline disabled:opacity-50"
        disabled={isPending}
        onClick={() => update(0)}
      >
        Sepetten çıkar
      </button>
      {message && <p className="mt-1 max-w-48 text-xs font-semibold text-[#8a3324]" role="alert">{message}</p>}
      <ConfirmModal
        open={confirmRemove}
        title="Ürünü sepetten çıkar"
        description={`${itemName} sepetten çıkarılacak.`}
        confirmLabel="Çıkar"
        cancelLabel="Vazgeç"
        destructive
        pending={isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          apply(0);
        }}
      />
    </div>
  );
}
