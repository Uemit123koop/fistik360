"use client";

import { useMemo, useState } from "react";
import { formatMoney, useAddToCart } from "@/components/cart-ui";
import { ConfirmModal } from "@/components/confirm-modal";
import { mixLineTotal, pricePerGram } from "@/lib/custom-mix-pricing";
import type { StorefrontCategoryNode, StorefrontItem } from "@/lib/cart";

const MIN_GRAMS = 50;
const MAX_GRAMS = 1000;
const GRAMS_STEP = 50;
const DEFAULT_GRAMS = 150;

interface DraftItem {
  retailProductId: string;
  name: string;
  grams: number;
  linePrice: number;
}

export function CustomMixBuilder({
  products,
  categoryTree,
  storeId,
  serviceAreaId,
}: {
  products: StorefrontItem[];
  categoryTree: StorefrontCategoryNode[];
  storeId: string;
  serviceAreaId: string | null;
}) {
  const weighableProducts = useMemo(
    () => products.filter((item) => item.kind === "PRODUCT" && item.baseQuantity !== null && (item.unit === "gram" || item.unit === "kg")),
    [products],
  );

  const mainIdBySubId = useMemo(() => {
    const map = new Map<string, string>();
    for (const main of categoryTree) {
      for (const sub of main.subcategories) map.set(sub.id, main.id);
    }
    return map;
  }, [categoryTree]);

  const [selectedMainId, setSelectedMainId] = useState<string | "all">("all");

  const weighableItems = useMemo(
    () =>
      selectedMainId === "all"
        ? weighableProducts
        : weighableProducts.filter((item) => item.subcategoryId && mainIdBySubId.get(item.subcategoryId) === selectedMainId),
    [weighableProducts, selectedMainId, mainIdBySubId],
  );

  const availableMainCategories = useMemo(
    () => categoryTree.filter((main) => main.subcategories.some((sub) => weighableProducts.some((item) => item.subcategoryId === sub.id))),
    [categoryTree, weighableProducts],
  );

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [grams, setGrams] = useState(DEFAULT_GRAMS);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { add, isPending: isAddPending, message, isError, replaceConfirm, confirmReplace, cancelReplace } = useAddToCart();

  const activeItem = weighableItems.find((item) => item.id === activeItemId) ?? weighableItems[0] ?? null;
  const activePricePerGram =
    activeItem && activeItem.unit && activeItem.baseQuantity !== null
      ? pricePerGram(activeItem.price, activeItem.baseQuantity, activeItem.unit)
      : null;
  const activeLinePrice = activePricePerGram !== null ? mixLineTotal(activePricePerGram, grams) : null;

  function addDraftItem() {
    if (!activeItem || activePricePerGram === null) return;
    setDraftItems((prev) => {
      const existing = prev.find((row) => row.retailProductId === activeItem.id);
      if (existing) {
        const nextGrams = Math.min(MAX_GRAMS, existing.grams + grams);
        return prev.map((row) =>
          row.retailProductId === activeItem.id
            ? { ...row, grams: nextGrams, linePrice: mixLineTotal(activePricePerGram, nextGrams) }
            : row,
        );
      }
      return [...prev, { retailProductId: activeItem.id, name: activeItem.name, grams, linePrice: mixLineTotal(activePricePerGram, grams) }];
    });
  }

  function removeDraftItem(retailProductId: string) {
    setDraftItems((prev) => prev.filter((row) => row.retailProductId !== retailProductId));
  }

  const totalWeightGrams = draftItems.reduce((sum, row) => sum + row.grams, 0);
  const totalPrice = Math.round(draftItems.reduce((sum, row) => sum + row.linePrice, 0) * 100) / 100;

  async function submitMix() {
    if (draftItems.length === 0 || !serviceAreaId) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/custom-mixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          items: draftItems.map((row) => ({ retailProductId: row.retailProductId, grams: row.grams })),
        }),
      });
      const json = (await res.json()) as { id?: string; nameSnapshot?: string; error?: string };
      if (!res.ok || !json.id) {
        setSubmitError(json.error ?? "Karışım oluşturulamadı.");
        return;
      }
      add({ storeId, serviceAreaId, itemId: json.id, kind: "CUSTOM_MIX", itemName: json.nameSnapshot ?? "Kendi karışımın" });
      setDraftItems([]);
    } catch {
      setSubmitError("Bağlantı kurulamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (weighableProducts.length === 0) {
    return (
      <p className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-6 text-[var(--color-muted-text)]">
        Bu mağazada karışıma uygun gramaj bazlı ürün yok.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--color-primary-dark)] bg-white shadow-[var(--shadow-card)]">
      <div className="bg-[var(--color-primary-dark)] px-5 py-4 text-white sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--color-primary-soft)]">Mahalleden doğal lezzetler</p>
        <h3 className="mt-1 font-serif text-xl font-bold sm:text-2xl">Kendi Kuruyemiş Mix&apos;ini Oluştur</h3>
      </div>

      <div className="p-5 sm:p-6">
        {availableMainCategories.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Karışım kategorisi seç">
            <button
              type="button"
              onClick={() => setSelectedMainId("all")}
              className={`chip transition-colors ${selectedMainId === "all" ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "hover:border-[var(--color-primary-light)]"}`}
            >
              Tümü
            </button>
            {availableMainCategories.map((main) => (
              <button
                key={main.id}
                type="button"
                onClick={() => setSelectedMainId(main.id)}
                className={`chip transition-colors ${selectedMainId === main.id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]" : "hover:border-[var(--color-primary-light)]"}`}
              >
                {main.name}
              </button>
            ))}
          </div>
        )}

        {weighableItems.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted-text)]">
            Bu kategoride karışıma uygun ürün yok.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2" role="listbox" aria-label="Karışım ürünü seç">
            {weighableItems.map((item) => {
              const isActive = activeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => setActiveItemId(item.id)}
                  className={`flex w-32 shrink-0 flex-col items-start gap-1 rounded-[16px] border-2 p-3 text-left transition-colors ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary-light)]"
                  }`}
                >
                  <span className="text-sm font-bold text-[var(--color-ink)]">{item.name}</span>
                  {item.subcategoryName && <span className="text-xs text-[var(--color-muted-text)]">{item.subcategoryName}</span>}
                </button>
              );
            })}
          </div>
        )}

        {activeItem && (
          <div className="mt-5 rounded-[16px] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-sm font-bold text-[var(--color-ink)]">
              <span>Miktar Seç: {grams} g</span>
              <span className="text-[var(--color-primary-dark)]">{activeLinePrice !== null ? formatMoney(activeLinePrice) : "—"}</span>
            </div>
            <input
              type="range"
              min={MIN_GRAMS}
              max={MAX_GRAMS}
              step={GRAMS_STEP}
              value={grams}
              onChange={(event) => setGrams(Number(event.target.value))}
              className="mt-3 w-full accent-[var(--color-primary)]"
              aria-label={`${activeItem.name} gramaj`}
            />
            <button type="button" className="button-primary mt-4 w-full" onClick={addDraftItem} disabled={activeLinePrice === null}>
              Pakete Ekle
            </button>
          </div>
        )}

        {draftItems.length > 0 && (
          <ul className="mt-5 space-y-2">
            {draftItems.map((row) => (
              <li key={row.retailProductId} className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--color-border-soft)] px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-[var(--color-ink)]">{row.name} · {row.grams} g</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-bold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(row.linePrice)}</span>
                  <button
                    type="button"
                    aria-label={`${row.name} karışımdan kaldır`}
                    className="text-lg leading-none text-[#8a3324]"
                    onClick={() => removeDraftItem(row.retailProductId)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 space-y-2 border-t border-[var(--color-border-soft)] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted-text)]">Kişiselleştirilmiş Paket Ağırlığı:</span>
            <span className="font-bold tabular-nums">{totalWeightGrams} g</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-bold">Toplam Fiyat:</span>
            <span className="font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(totalPrice)}</span>
          </div>
        </div>

        {!serviceAreaId && <p className="mt-3 text-xs font-semibold text-[#8a3324]">Bu mağazanın aktif teslimat bölgesi yok.</p>}
        {submitError && <p className="mt-3 text-xs font-semibold text-[#8a3324]" role="alert">{submitError}</p>}
        {message && (
          <p className={`mt-3 text-xs font-semibold ${isError ? "text-[#8a3324]" : "text-[var(--color-primary-dark)]"}`} role={isError ? "alert" : "status"} aria-live="polite">
            {message}
          </p>
        )}

        <button
          type="button"
          className="button-primary mt-4 w-full"
          disabled={draftItems.length === 0 || isSubmitting || isAddPending || !serviceAreaId}
          onClick={submitMix}
        >
          {isSubmitting || isAddPending ? "Ekleniyor..." : "Karışımı sepete ekle"}
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-[var(--color-muted-text)]">%0 Komisyon • Yerel Esnafa Tam Destek</p>
      </div>

      <ConfirmModal
        open={replaceConfirm !== null}
        title="Sepetinde bir mağaza bekliyor"
        description={replaceConfirm ?? undefined}
        confirmLabel="Sepeti değiştir"
        cancelLabel="Vazgeç"
        pending={isAddPending}
        onCancel={cancelReplace}
        onConfirm={confirmReplace}
      />
    </div>
  );
}
