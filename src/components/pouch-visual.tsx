import Image from "next/image";

export function PouchVisual({ weightLabel, compact = false }: { weightLabel: string; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "relative h-40 w-20 overflow-hidden rounded-[16px] shadow-[0_14px_28px_rgba(0,0,0,.35)] sm:h-48 sm:w-24"
          : "relative h-64 w-32 overflow-hidden rounded-[20px] shadow-[0_24px_48px_rgba(0,0,0,.4)] sm:h-72 sm:w-36"
      }
    >
      <Image
        src="/assets/bundles/pouch-mixed-nuts.webp"
        alt="Karışık kuruyemiş paketi"
        fill
        sizes={compact ? "96px" : "144px"}
        className="object-cover"
      />
      <span
        className={
          "absolute inset-x-[8%] top-[42%] flex h-[36%] items-center justify-center rounded-2xl border border-white/60 bg-white/92 shadow-[0_8px_20px_rgba(0,0,0,.2)] backdrop-blur-sm"
        }
      >
        <span className={`font-serif font-extrabold leading-none text-[#282119] ${compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>
          {weightLabel}
        </span>
      </span>
    </div>
  );
}
