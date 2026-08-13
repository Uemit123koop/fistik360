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
  variant = "coverflow",
}: {
  children: React.ReactNode;
  cardClassName?: string;
  ariaLabel: string;
  variant?: "coverflow" | "feature";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveredCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    function apply() {
      frame = 0;
      const current = trackRef.current;
      if (!current) return;
      const rect = current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      current.querySelectorAll<HTMLElement>("[data-showcase-card]").forEach((card) => {
        if (card === hoveredCardRef.current) {
          card.style.transform = variant === "feature" ? "scale(1.08)" : "scale(1.06) translateZ(0)";
          card.style.filter = "";
          card.style.opacity = "1";
          card.style.zIndex = "30";
          if (variant === "feature") card.dataset.active = "true";
          return;
        }
        if (reduceMotion) return;

        const cardRect = card.getBoundingClientRect();
        const offset = (cardRect.left + cardRect.width / 2 - centerX) / (rect.width / 2);
        const clamped = Math.max(-1, Math.min(1, offset));
        const abs = Math.abs(clamped);

        if (variant === "feature") {
          const scale = 1 - abs * 0.16;
          const blur = abs * 5;
          card.style.transform = `scale(${scale})`;
          card.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
          card.style.opacity = String(Math.max(0.45, 1 - abs * 0.55));
          card.style.zIndex = String(Math.round((1 - abs) * 10));
          if (abs < 0.45) card.dataset.active = "true";
          else delete card.dataset.active;
        } else {
          const scale = 1 - abs * 0.12;
          const rotate = clamped * -10;
          const translateZ = -abs * 60;
          card.style.transform = `rotateY(${rotate}deg) scale(${scale}) translateZ(${translateZ}px)`;
          card.style.opacity = String(Math.max(0.55, 1 - abs * 0.3));
        }
      });
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }
    function onCardEnter(event: Event) {
      hoveredCardRef.current = event.currentTarget as HTMLElement;
      apply();
    }
    function onCardLeave() {
      hoveredCardRef.current = null;
      apply();
    }

    apply();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-showcase-card]"));
    cards.forEach((card) => {
      card.addEventListener("mouseenter", onCardEnter);
      card.addEventListener("mouseleave", onCardLeave);
    });

    // Click-and-drag scrolling for mouse users (touch keeps native scrolling).
    let isDragging = false;
    let dragMoved = false;
    let startX = 0;
    let startScrollLeft = 0;

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const current = trackRef.current;
      if (!current) return;
      isDragging = true;
      dragMoved = false;
      startX = event.clientX;
      startScrollLeft = current.scrollLeft;
      current.classList.add("cursor-grabbing");
      current.setPointerCapture(event.pointerId);
    }
    function onPointerMove(event: PointerEvent) {
      if (!isDragging) return;
      const current = trackRef.current;
      if (!current) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 3) dragMoved = true;
      current.scrollLeft = startScrollLeft - delta;
    }
    function endDrag(event: PointerEvent) {
      if (!isDragging) return;
      isDragging = false;
      const current = trackRef.current;
      current?.classList.remove("cursor-grabbing");
      current?.releasePointerCapture(event.pointerId);
    }
    function onClickCapture(event: MouseEvent) {
      if (dragMoved) {
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
      }
    }

    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("click", onClickCapture, true);

    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cards.forEach((card) => {
        card.removeEventListener("mouseenter", onCardEnter);
        card.removeEventListener("mouseleave", onCardLeave);
      });
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", endDrag);
      track.removeEventListener("pointercancel", endDrag);
      track.removeEventListener("click", onClickCapture, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [variant]);

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
        className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={variant === "feature" ? undefined : { perspective: "1400px" }}
        role="group"
        aria-label={ariaLabel}
      >
        {items.map((child, index) => (
          <div
            key={index}
            data-showcase-card
            className={`shrink-0 snap-center will-change-transform ${
              variant === "feature" ? "transition-[transform,filter,opacity] duration-300 ease-out" : "transition-transform duration-150 ease-out"
            } ${cardClassName}`}
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
