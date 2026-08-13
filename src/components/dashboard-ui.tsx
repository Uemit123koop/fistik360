export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type StatTone = "default" | "success" | "warning" | "info";

const TONE_STYLES: Record<StatTone, { badge: string; icon: string }> = {
  default: { badge: "bg-[var(--color-primary-soft)]", icon: "text-[var(--color-primary-dark)]" },
  success: { badge: "bg-[#e3f3e1]", icon: "text-[#1f7a3d]" },
  warning: { badge: "bg-[#fdf1da]", icon: "text-[#a5680f]" },
  info: { badge: "bg-[#e6eefc]", icon: "text-[#2857a8]" },
};

export function DashboardStatCard({
  icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: StatTone;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <article className="rounded-[18px] border border-[var(--color-border-soft)] bg-white p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-card)] sm:p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.badge} ${styles.icon}`}>
        {icon}
      </span>
      <p className="mt-3 text-xs font-extrabold uppercase tracking-[.1em] text-[var(--color-muted-text)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[var(--color-ink)]">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">{note}</p>}
    </article>
  );
}

export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold text-[var(--color-ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted-text)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ReceiptIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-1-1.5L11 21l-2.5-1.5L6 21V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ClipboardListIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function TruckIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3 6h10v10H3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function RocketIcon({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 2.5c3 1.7 5 5 5 9 0 2-.6 3.8-1.6 5.3L12 21l-3.4-4.2C7.6 15.3 7 13.5 7 11.5c0-4 2-7.3 5-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 16 6 19M15.5 16 18 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
