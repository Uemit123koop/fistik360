"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/cart-actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { AtlasImage, PackageIcon } from "@/components/marketplace-ui";
import { bumpCartCount } from "@/lib/cart-count-bus";
import { addGuestCartEntry } from "@/lib/guest-cart";
import type { CartItemKind, CartViewItem, StorefrontItem } from "@/lib/cart";

interface AddToCartInputArgs {
  storeId: string;
  serviceAreaId: string | null;
  itemId: string;
  kind: CartItemKind;
  itemName: string;
}

// StorefrontItemCard ve CustomMixBuilder'ın ikisi de aynı sepete-ekle zincirine
// (auth kontrolü → misafir sepeti fallback → mağaza-değiştirme onayı →
// anlık rozet güncellemesi → sayfa yenileme) ihtiyaç duyuyor; burada tek yerde.
export function useAddToCart() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [replaceConfirm, setReplaceConfirm] = useState<string | null>(null);
  const pendingInputRef = useRef<AddToCartInputArgs | null>(null);

  function add(input: AddToCartInputArgs, replaceExisting = false) {
    if (!input.serviceAreaId) return;
    const serviceAreaId = input.serviceAreaId;
    pendingInputRef.current = input;
    setMessage(null);
    startTransition(async () => {
      const result = await addToCartAction({
        storeId: input.storeId,
        serviceAreaId,
        itemId: input.itemId,
        kind: input.kind,
        replaceExisting,
      });

      if (result.code === "AUTH_REQUIRED") {
        // Misafir: giriş istemeden tarayıcıda tut, checkout'ta (telefon
        // doğrulandıktan sonra) gerçek sepete aktarılır.
        const guestResult = addGuestCartEntry(
          { storeId: input.storeId, serviceAreaId, kind: input.kind, itemId: input.itemId, quantity: 1 },
          { replaceExisting },
        );
        if (!guestResult.ok) {
          setReplaceConfirm("Sepetinde başka bir mağazadan ürünler var. Sepeti bu mağazanın ürünleriyle değiştirmek istiyor musun?");
          return;
        }
        setIsError(false);
        setMessage(`${input.itemName} sepete eklendi.`);
        return;
      }
      if (result.code === "CONFIRM_REPLACEMENT") {
        setReplaceConfirm(result.message);
        return;
      }

      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        bumpCartCount(1);
        router.refresh();
      }
    });
  }

  function confirmReplace() {
    setReplaceConfirm(null);
    if (pendingInputRef.current) add(pendingInputRef.current, true);
  }
  function cancelReplace() {
    setReplaceConfirm(null);
  }

  return { add, isPending, message, isError, replaceConfirm, confirmReplace, cancelReplace };
}

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
  const { add: addToCart, isPending, message, isError, replaceConfirm, confirmReplace, cancelReplace } = useAddToCart();

  function add() {
    addToCart({ storeId, serviceAreaId, itemId: item.id, kind: item.kind, itemName: item.name });
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
            {item.subcategoryName && (
              <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--color-accent)]">{item.subcategoryName}</p>
            )}
            <h3 className="font-bold text-[var(--color-ink)] sm:text-lg">{item.name}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-text)]">{item.detail}</p>
          </div>
          <p className="shrink-0 font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(item.price)}</p>
        </div>
        {item.attributeTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.attributeTags.map((tag) => (
              <span key={tag.valueKey} className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted-text)]">
                {tag.valueLabel}
              </span>
            ))}
          </div>
        )}
        {item.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-muted-text)]">{item.description}</p>}
        <button
          type="button"
          className="button-primary mt-4 w-full"
          disabled={isPending || !serviceAreaId}
          onClick={add}
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
        onCancel={cancelReplace}
        onConfirm={confirmReplace}
      />
    </article>
  );
}

// Paketler mağazanın "hediye kutusu" vitrini — StorefrontItemCard'dan bilerek
// ayrı: sade ürün kartından farklı, daha şenlikli bir sunum istendi.
export function PackageCard({
  item,
  storeId,
  serviceAreaId,
}: {
  item: StorefrontItem;
  storeId: string;
  serviceAreaId: string | null;
}) {
  const { add: addToCart, isPending, message, isError, replaceConfirm, confirmReplace, cancelReplace } = useAddToCart();

  function add() {
    addToCart({ storeId, serviceAreaId, itemId: item.id, kind: item.kind, itemName: item.name });
  }

  const hasDiscount = item.discountPercent !== null && item.discountPercent > 0;
  const originalPrice = hasDiscount ? Math.round((item.price / (1 - item.discountPercent! / 100)) * 100) / 100 : null;

  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-[var(--color-primary-dark)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] px-5 py-6 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
          <PackageIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white/80">{item.detail}</p>
        <h3 className="mt-1 font-serif text-xl font-bold leading-tight">{item.name}</h3>
        {hasDiscount && (
          <span className="absolute -right-9 top-4 rotate-45 bg-[var(--color-accent)] px-9 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            %{item.discountPercent} kazanç
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {item.packageContents.length > 0 && (
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-accent)]">İçinde</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.packageContents.map((name) => (
                <span key={name} className="inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-dark)]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {originalPrice !== null && (
              <p className="text-xs font-semibold text-[var(--color-muted-text)] line-through">{formatMoney(originalPrice)}</p>
            )}
            <p className="text-2xl font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(item.price)}</p>
          </div>
          <button type="button" className="button-primary" disabled={isPending || !serviceAreaId} onClick={add}>
            {isPending ? <><span className="loading-dot" /> Ekleniyor</> : <><CartIcon /> Sepete ekle</>}
          </button>
        </div>

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
        onCancel={cancelReplace}
        onConfirm={confirmReplace}
      />
    </article>
  );
}
