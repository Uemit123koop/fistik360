import Image from "next/image";
import Link from "next/link";
import type { AtlasPosition, PackageShowcase } from "@/lib/marketplace-content";

interface AtlasImageProps extends AtlasPosition {
  alt: string;
  atlas: "category" | "package";
  className?: string;
  sizes?: string;
}

export function AtlasImage({
  alt,
  atlas,
  className = "aspect-[4/3]",
  column,
  row,
  sizes = "(max-width: 768px) 100vw, 640px",
}: AtlasImageProps) {
  const columns = atlas === "category" ? 4 : 3;
  const rows = 2;

  return (
    <div className={`relative overflow-hidden bg-[#eee3ce] ${className}`}>
      <Image
        src={`/assets/${atlas}-atlas.png`}
        alt={alt}
        width={1536}
        height={1024}
        sizes={sizes}
        className="absolute max-w-none select-none"
        style={{
          width: `${columns * 100}%`,
          height: `${rows * 100}%`,
          left: `-${column * 100}%`,
          top: `-${row * 100}%`,
        }}
      />
    </div>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapPinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PackageIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4m8-14v10l-8 4m0-10v10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.9 7.5-9.5V6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PackageCard({ item, compact = false }: { item: PackageShowcase; compact?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <AtlasImage
        atlas="package"
        column={item.column}
        row={item.row}
        alt={`${item.name} kuruyemiş seçkisi`}
        className={compact ? "aspect-[16/8]" : "aspect-[16/9]"}
        sizes={compact ? "(max-width: 768px) 100vw, 420px" : "(max-width: 768px) 100vw, 520px"}
      />
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--color-muted-text)]">{item.summary}</p>
          </div>
          <p className="shrink-0 text-right font-bold tabular-nums text-[var(--color-primary-dark)]">{item.price}</p>
        </div>
        {!compact && (
          <ul className="mt-4 space-y-1.5 border-t border-[var(--color-border-soft)] pt-4 text-sm text-[var(--color-muted-text)]">
            {item.items.map((content) => (
              <li key={content} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]" />
                <span>{content}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/magaza/1" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]">
          Paketi incele <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}

interface RetailProductCardProps extends AtlasPosition {
  name: string;
  quantity: string;
  price: string;
  badge?: string;
}

export function RetailProductCard({ name, quantity, price, badge, column, row }: RetailProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative">
        <AtlasImage atlas="category" column={column} row={row} alt={`${name} ürünü`} className="aspect-[4/3]" sizes="(max-width: 640px) 50vw, 300px" />
        {badge && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--color-primary-dark)] shadow-sm">{badge}</span>}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[var(--color-ink)]">{name}</h3>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-sm text-[var(--color-muted-text)]">{quantity}</p>
          <p className="font-bold tabular-nums text-[var(--color-primary-dark)]">{price}</p>
        </div>
      </div>
    </article>
  );
}
