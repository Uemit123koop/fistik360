import Link from "next/link";
import { IngredientIcon } from "@/components/ingredient-icon";
import { PouchVisual } from "@/components/pouch-visual";
import { ArrowIcon } from "@/components/marketplace-ui";
import { formatGrams, type BundleIngredient, type BundleTier } from "@/lib/bundle-content";

function CalloutRow({ ingredient, side, index }: { ingredient: BundleIngredient; side: "left" | "right"; index: number }) {
  const delay = `${index * 65}ms`;
  const icon = (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 p-1.5">
      <IngredientIcon id={ingredient.id} />
    </span>
  );
  const text = (
    <div className={side === "left" ? "text-right" : "text-left"}>
      <p className="text-xs font-bold leading-tight text-white/90">{ingredient.name}</p>
      <p className="font-mono text-xs font-extrabold leading-tight text-[#8fd19e]">{formatGrams(ingredient.grams)}</p>
    </div>
  );
  const label = side === "left" ? (
    <div className="flex items-center gap-2">
      {text}
      {icon}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {icon}
      {text}
    </div>
  );
  const line = (
    <span
      className={`pkg-line h-px w-4 shrink-0 scale-x-0 bg-[#8fd19e]/70 transition-transform duration-300 ${side === "left" ? "origin-right" : "origin-left"}`}
      style={{ transitionDelay: delay }}
      aria-hidden="true"
    />
  );
  const dot = (
    <span className="pkg-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#8fd19e] opacity-0 transition-opacity duration-200" style={{ transitionDelay: delay }} aria-hidden="true" />
  );

  return (
    <div
      className={`pkg-callout flex items-center gap-2 opacity-0 transition-all duration-300 ease-out ${
        side === "left" ? "flex-row-reverse translate-x-3" : "-translate-x-3"
      }`}
      style={{ transitionDelay: delay }}
    >
      {label}
      {line}
      {dot}
    </div>
  );
}

export function PackageHoverCard({ tier }: { tier: BundleTier }) {
  const leftIngredients = tier.ingredients.filter((_, index) => index % 2 === 0);
  const rightIngredients = tier.ingredients.filter((_, index) => index % 2 === 1);

  return (
    <article className="pkg-card group relative flex min-h-[360px] flex-col overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[#0d1710] shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] sm:min-h-[420px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(143,209,158,.16),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <p className="pkg-reveal relative mt-6 -translate-y-1 text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-[#8fd19e] opacity-0 transition-all duration-300">
        İçindekiler
      </p>

      <div tabIndex={0} className="relative flex flex-1 items-center gap-1 px-1.5 py-3 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#8fd19e] sm:gap-2 sm:px-2">
        <div className="flex w-[96px] flex-col justify-evenly gap-2.5 self-stretch py-4 sm:w-[128px]">
          {leftIngredients.map((ingredient, index) => (
            <CalloutRow key={ingredient.id} ingredient={ingredient} side="left" index={index} />
          ))}
        </div>

        <div className="pkg-pouch mx-auto shrink-0 transition-transform duration-500 ease-out">
          <PouchVisual weightLabel={tier.label} compact />
        </div>

        <div className="flex w-[96px] flex-col justify-evenly gap-2.5 self-stretch py-4 sm:w-[128px]">
          {rightIngredients.map((ingredient, index) => (
            <CalloutRow key={ingredient.id} ingredient={ingredient} side="right" index={index} />
          ))}
        </div>
      </div>

      <div className="relative px-5 pb-6 text-center">
        <p className="text-lg font-bold text-white">{tier.label} Karışık Kuruyemiş</p>
        <p className="mt-1 text-sm text-white/60">{tier.priceLabel}</p>
        <Link
          href="/paketler"
          className="pkg-reveal mt-3 inline-flex translate-y-1 items-center justify-center gap-1.5 text-xs font-bold text-[#8fd19e] opacity-0 transition-all duration-300 hover:underline"
        >
          Detayları gör <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
