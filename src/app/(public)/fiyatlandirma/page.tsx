import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/marketplace-ui";

export const metadata: Metadata = {
  title: "Fiyatlandırma | Fıstık360",
  description: "Fıstık360'ta sadece hizmet verdiğin mahalleler için ödersin. Gizli ücret yok, %0 komisyon — aktif ettiğin her mahalle için sabit lisans bedeli.",
};

function BoltIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13L12.5 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.9l6-.9L12 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 21V6.5L12 3l8 3.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01M8 14h.01M16 14h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GiftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="9" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16v3.5H4V9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 9v11" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 9c0-2.5-1.8-4-3.4-4C7 5 6 6 6 7.2 6 8.5 7.2 9 8.5 9H12ZM12 9c0-2.5 1.8-4 3.4-4C17 5 18 6 18 7.2 18 8.5 16.8 9 15.5 9H12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

interface DiscountTier {
  label: string;
  discount: string;
}

const DISCOUNT_TIERS: DiscountTier[] = [
  { label: "4+ mahalle", discount: "%10 indirim" },
  { label: "7+ mahalle", discount: "%15 indirim" },
  { label: "11+ mahalle", discount: "%20 indirim" },
];

interface Plan {
  id: string;
  badge?: { label: string; tone: "popular" | "promo" };
  icon: React.ReactNode;
  eyebrow: string;
  price: string;
  priceSuffix?: string;
  priceUnit: string;
  description: string;
  features: string[];
  cta: string;
  variant: "light" | "dark";
}

const plans: Plan[] = [
  {
    id: "free",
    icon: <BoltIcon />,
    eyebrow: "Ücretsiz",
    price: "Ücretsiz",
    priceUnit: "Sonsuza kadar",
    description: "1 mahallede ücretsiz dijital vitrin",
    features: ["1 mahalle", "Temel görünürlük", "Sınırlı ürün kataloğu"],
    cta: "Ücretsiz Başla",
    variant: "light",
  },
  {
    id: "monthly",
    badge: { label: "En Popüler", tone: "popular" },
    icon: <StarIcon />,
    eyebrow: "Aylık Plan",
    price: "899",
    priceSuffix: "TL",
    priceUnit: "mahalle / ay",
    description: "Aktif ettiğin her mahalle için aylık ödersin",
    features: ["İstediğin kadar mahalle ekle", "Aktif her mahallede tam görünürlük", "Çoklu mahalle indirimi", "Öncelikli destek"],
    cta: "Bu Planla Başla",
    variant: "dark",
  },
  {
    id: "yearly",
    badge: { label: "2 Ay Bedava", tone: "promo" },
    icon: <BuildingIcon />,
    eyebrow: "Yıllık Plan",
    price: "8.990",
    priceSuffix: "TL",
    priceUnit: "mahalle / yıl",
    description: "Yıllık öde, 2 ay bedava kazan",
    features: ["İstediğin kadar mahalle ekle", "Arama önceliği", "Dedike müşteri temsilcisi", "2 ay bedava"],
    cta: "Bu Planla Başla",
    variant: "light",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  const isDark = plan.variant === "dark";
  return (
    <article
      className={`relative flex flex-col rounded-[24px] border p-6 sm:p-7 ${
        isDark
          ? "border-[#12382b] bg-[#12382b] text-white shadow-[0_20px_50px_rgba(18,56,43,.28)] lg:-translate-y-3"
          : "border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-[var(--shadow-card)]"
      }`}
    >
      {plan.badge && (
        <span
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm ${
            plan.badge.tone === "popular" ? "bg-white text-[#12382b]" : "bg-[#fff0cc] text-[#6d4b17]"
          }`}
        >
          {plan.badge.label}
        </span>
      )}

      <span
        className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${
          isDark ? "bg-white/12 text-white" : "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"
        }`}
      >
        {plan.icon}
      </span>

      <p className={`mt-5 text-xs font-extrabold uppercase tracking-[0.14em] ${isDark ? "text-white/65" : "text-[var(--color-muted-text)]"}`}>
        {plan.eyebrow}
      </p>

      <p className={`mt-2 font-serif font-bold leading-none tracking-[-0.02em] ${plan.priceSuffix ? "text-4xl sm:text-[2.75rem]" : "text-3xl sm:text-4xl"}`}>
        {plan.price}
        {plan.priceSuffix && <span className="ml-1 align-top text-base font-bold">{plan.priceSuffix}</span>}
      </p>
      <p className={`mt-1 text-sm ${isDark ? "text-white/60" : "text-[var(--color-muted-text)]"}`}>{plan.priceUnit}</p>

      <p className={`mt-5 text-sm leading-6 ${isDark ? "text-white/80" : "text-[var(--color-muted-text)]"}`}>{plan.description}</p>

      <ul className="mt-5 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-[#d7ec9c]" : "text-[var(--color-primary)]"}`} />
            <span className={isDark ? "text-white/90" : "text-[var(--color-ink)]"}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/magaza-ac"
        className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-extrabold transition-colors ${
          isDark
            ? "bg-white text-[#12382b] hover:bg-[#eef4e6]"
            : "bg-[var(--color-primary)] text-white shadow-[0_3px_10px_rgba(56,80,43,.16)] hover:bg-[var(--color-primary-dark)]"
        }`}
      >
        {plan.cta} <ArrowIcon className="h-4 w-4" />
      </Link>
    </article>
  );
}

export default function PricingPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:py-20">
          <h1 className="font-serif text-4xl font-bold leading-[1.12] tracking-[-0.02em] text-[var(--color-ink)] sm:text-5xl">
            Sadece hizmet verdiğin<br />
            <span className="text-[var(--color-primary)]">mahalleler için öde</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted-text)] sm:text-lg">
            Gizli ücret yok, %0 komisyon. Aktif ettiğin her mahalle için sabit bir lisans bedeli ödersin; ne kadar çok mahalle, o kadar yüksek indirim.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-center lg:gap-7">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
        </div>

        <div className="mt-8 rounded-[24px] border border-[#f3dfa1] bg-[#fffaf0] p-6 sm:p-7">
          <p className="flex items-center gap-2 text-base font-extrabold text-[#8a5a17]">
            <GiftIcon className="h-5 w-5" /> Çoklu Mahalle İndirimi
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {DISCOUNT_TIERS.map((tier) => (
              <div key={tier.label} className="rounded-[16px] border border-[#f3dfa1] bg-white px-4 py-5 text-center">
                <p className="text-sm font-bold text-[var(--color-muted-text)]">{tier.label}</p>
                <p className="mt-1.5 text-xl font-extrabold text-[var(--color-accent)]">{tier.discount}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-[#8a5a17]">
            İndirim, aylık ve yıllık planlarda eklediğin mahalle sayısına göre otomatik uygulanır.
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-[var(--color-muted-text)]">
          Toptancı ve marka partneri fiyatlandırması için <Link href="/sayfalar/iletisim" className="text-link inline-flex">bizimle iletişime geç</Link>.
        </p>
      </section>
    </div>
  );
}
