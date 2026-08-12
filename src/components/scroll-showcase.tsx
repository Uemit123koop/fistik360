"use client";

import { Children, useEffect, useRef } from "react";

function ChevronIcon({ direction, className = "h-5 w-5" }: { direction: "left" | "right"; className?: string }) {
  const d = direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScrollShowcase({
  children,
  cardClassName = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  cardClassName?: string;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    function apply() {
      frame = 0;
      const current = trackRef.current;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      current.querySelectorAll<HTMLElement>("[data-showcase-card]").forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const offset = (cardRect.left + cardRect.width / 2 - centerX) / (rect.width / 2);
        const clamped = Math.max(-1, Math.min(1, offset));
        const scale = 1 - Math.abs(clamped) * 0.12;
        const rotate = clamped * -10;
        const translateZ = -Math.abs(clamped) * 60;
        card.style.transform = `rotateY(${rotate}deg) scale(${scale}) translateZ(${translateZ}px)`;
        card.style.opacity = String(Math.max(0.55, 1 - Math.abs(clamped) * 0.3));
      });
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }

    apply();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function nudge(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>("[data-showcase-card]");
    const amount = firstCard ? firstCard.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  const items = Children.toArray(children);

  return (
    <div className="group/showcase relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ perspective: "1400px" }}
        role="group"
        aria-label={ariaLabel}
      >
        {items.map((child, index) => (
          <div
            key={index}
            data-showcase-card
            className={`shrink-0 snap-center transition-transform duration-150 ease-out will-change-transform ${cardClassName}`}
          >
            {child}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label="Geri kaydır"
        className="absolute -left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary-dark)] opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-200 hover:bg-[var(--color-primary-soft)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] group-hover/showcase:opacity-100 lg:flex"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label="İleri kaydır"
        className="absolute -right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary-dark)] opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-200 hover:bg-[var(--color-primary-soft)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] group-hover/showcase:opacity-100 lg:flex"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}
