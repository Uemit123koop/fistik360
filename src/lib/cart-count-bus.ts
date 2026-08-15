"use client";

const EVENT_NAME = "fistik360-cart-count-bump";

export function bumpCartCount(delta: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<number>(EVENT_NAME, { detail: delta }));
}

export function onCartCountBump(handler: (delta: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function listener(event: Event) {
    handler((event as CustomEvent<number>).detail);
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
