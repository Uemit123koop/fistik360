"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon } from "@/components/marketplace-ui";
import { IngredientIcon } from "@/components/ingredient-icon";
import { PouchVisual } from "@/components/pouch-visual";
import { bundleTiers, formatGrams, type BundleIngredient } from "@/lib/bundle-content";

function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

function IngredientCard({ ingredient, active, index }: { ingredient: BundleIngredient; active: boolean; index: number }) {
  const value = useCountUp(ingredient.grams, active);
  return (
    <div
      className="bundle-card rounded-[16px] border border-white/10 bg-white/5 p-3.5 text-center backdrop-blur-sm"
      style={{ animationDelay: `${index * 65}ms` }}
    >
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-2 sm:h-12 sm:w-12">
        <IngredientIcon id={ingredient.id} />
      </span>
      <p className="mt-2.5 text-xs font-bold text-white sm:text-sm">{ingredient.name}</p>
      <p className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-[#8fd19e] sm:text-base">{formatGrams(value)}</p>
    </div>
  );
}

export function BundleReveal() {
  const [tierIndex, setTierIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        if (reduceMotion || entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tier = bundleTiers[tierIndex];

  return (
    <div
      ref={stageRef}
      className="relative overflow-hidden rounded-[28px] bg-[#0d1710] p-6 shadow-[0_40px_90px_rgba(13,23,16,.35)] sm:p-10 lg:p-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(143,209,158,.14),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(143,209,158,.1),transparent_40%)]" />

      {revealed && (
        <>
          <span className="bundle-bracket absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-[#8fd19e]" />
          <span className="bundle-bracket absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-[#8fd19e]" style={{ animationDelay: "80ms" }} />
          <span className="bundle-bracket absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-[#8fd19e]" style={{ animationDelay: "80ms" }} />
          <span className="bundle-bracket absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-[#8fd19e]" style={{ animationDelay: "160ms" }} />
        </>
      )}

      <div className="relative mx-auto max-w-4xl">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:items-center">
          <div className="relative mx-auto">
            {revealed && (
              <div className="bundle-scanline pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-transparent via-[#8fd19e]/45 to-transparent" />
            )}
            <div className={revealed ? "bundle-pouch" : "opacity-0"}>
              <PouchVisual weightLabel={tier.label} />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8fd19e]">İçindekiler</p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-white/60">{tier.tagline}</p>
              </div>
              <p className="text-2xl font-extrabold text-white">{tier.priceLabel}</p>
            </div>
            <div key={tier.id} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tier.ingredients.map((ingredient, index) => (
                <IngredientCard key={ingredient.id} ingredient={ingredient} active={revealed} index={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Paket boyutu seç">
          {bundleTiers.map((t, index) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierIndex(index)}
              aria-pressed={index === tierIndex}
              className={`min-h-11 rounded-full px-5 text-sm font-extrabold transition-colors ${
                index === tierIndex
                  ? "bg-[#8fd19e] text-[#0d1710]"
                  : "border border-white/15 text-white/70 hover:border-[#8fd19e]/50 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/toptan" className="button-primary">
            Toptan teklif al <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
