"use client";

import type { CartItemKind } from "@/lib/cart";

const STORAGE_KEY = "fistik360_guest_cart";

export interface GuestCartEntry {
  storeId: string;
  serviceAreaId: string;
  kind: CartItemKind;
  itemId: string;
  quantity: number;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readGuestCart(): GuestCartEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is GuestCartEntry =>
        entry && typeof entry.storeId === "string" && typeof entry.serviceAreaId === "string" &&
        typeof entry.itemId === "string" && (entry.kind === "PRODUCT" || entry.kind === "PACKAGE" || entry.kind === "CUSTOM_MIX") &&
        typeof entry.quantity === "number" && entry.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeGuestCart(entries: GuestCartEntry[]) {
  if (!isBrowser()) return;
  if (entries.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  window.dispatchEvent(new Event("fistik360-guest-cart-change"));
}

export function hasGuestCart(): boolean {
  return readGuestCart().length > 0;
}

export function guestCartCount(): number {
  return readGuestCart().reduce((sum, entry) => sum + entry.quantity, 0);
}

export type AddGuestCartResult =
  | { ok: true }
  | { ok: false; code: "CONFIRM_REPLACEMENT"; currentStoreId: string };

export function addGuestCartEntry(
  entry: Omit<GuestCartEntry, "quantity"> & { quantity?: number },
  options: { replaceExisting?: boolean } = {},
): AddGuestCartResult {
  const quantity = entry.quantity ?? 1;
  const current = readGuestCart();
  const existingStoreId = current[0]?.storeId;

  if (existingStoreId && existingStoreId !== entry.storeId && !options.replaceExisting) {
    return { ok: false, code: "CONFIRM_REPLACEMENT", currentStoreId: existingStoreId };
  }

  const sameStore = !existingStoreId || existingStoreId === entry.storeId;
  const next = sameStore ? [...current] : [];

  const existingIndex = next.findIndex((row) => row.itemId === entry.itemId && row.kind === entry.kind);
  if (existingIndex >= 0) {
    next[existingIndex] = { ...next[existingIndex], quantity: Math.min(99, next[existingIndex].quantity + quantity) };
  } else {
    next.push({ storeId: entry.storeId, serviceAreaId: entry.serviceAreaId, kind: entry.kind, itemId: entry.itemId, quantity });
  }

  writeGuestCart(next);
  return { ok: true };
}

export function updateGuestCartEntryQuantity(itemId: string, kind: CartItemKind, quantity: number) {
  const current = readGuestCart();
  const next = quantity <= 0
    ? current.filter((row) => !(row.itemId === itemId && row.kind === kind))
    : current.map((row) => (row.itemId === itemId && row.kind === kind ? { ...row, quantity: Math.min(99, quantity) } : row));
  writeGuestCart(next);
}

export function clearGuestCart() {
  writeGuestCart([]);
}
