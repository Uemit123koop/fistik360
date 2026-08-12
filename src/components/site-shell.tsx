import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { HomeReturnLink } from "@/components/home-return-link";
import { ArrowIcon } from "@/components/marketplace-ui";
import { getCartItemCount } from "@/lib/cart";
import { getServerUser } from "@/lib/auth";
import { corporateLinks, legalEntity, legalLinks } from "@/lib/legal-content";

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 4.5h2l1.7 10.2a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.5L20.5 8H6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" />
      <circle cx="17.2" cy="19.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [user, cartCount] = await Promise.all([
    getServerUser(),
    getCartItemCount().catch(() => 0),
  ]);
  const mobileNavItems = user ? [] : [{ href: "/magaza-ac#login", label: "Giriş" }];
  const cartCountLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-ink)]">
      <a href="#main-content" className="skip-link">İçeriğe geç</a>
      <header className="safe-header sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]/98">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:gap-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]" aria-label="Fıstık360 ana sayfa">
            <BrandLogo className="h-12 w-32 sm:h-14 sm:w-40" preload sizes="(max-width: 640px) 128px, 160px" />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <HomeReturnLink />
            {(!user || user.role === "CUSTOMER") && (
              <Link href="/sepet" className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 font-bold text-[var(--color-primary-dark)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]" aria-label={`Sepet, ${cartCount} ürün`}>
                <CartIcon />
                <span className="hidden text-sm xl:inline">Sepet</span>
                {cartCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-extrabold leading-none text-white">{cartCountLabel}</span>}
              </Link>
            )}
            {!user && (
              <span className="hidden shrink-0 lg:inline-flex">
                <Link href="/magaza-ac#login" className="button-primary px-3 sm:px-[1.15rem]">Giriş <ArrowIcon className="hidden h-4 w-4 lg:block" /></Link>
              </span>
            )}
          </div>
        </div>
        {mobileNavItems.length > 0 && (
          <nav className="grid grid-flow-col auto-cols-fr border-t border-[var(--color-border-soft)] px-1 lg:hidden" aria-label="Mobil navigasyon">
            {mobileNavItems.map((item) => <Link key={item.href} href={item.href} className="min-h-12 min-w-0 flex-1 content-center text-center text-[11px] font-bold text-[var(--color-muted-text)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)] sm:text-xs">{item.label}</Link>)}
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>

      <footer className="safe-footer border-t border-[var(--color-border)] bg-[var(--color-ink)] text-[#efe9dc]">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_1fr_1fr] lg:px-8">
          <div>
            <Link href="/" className="inline-flex rounded-[14px] bg-[#fffaf2] px-3 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white" aria-label="Fıstık360 ana sayfa">
              <BrandLogo className="h-16 w-44 sm:w-48" sizes="192px" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#cfc6b7]">Kuruyemiş mağazalarını, toptancıları ve doğrulanmış marka partnerlerini güvenilir bir dijital ticaret altyapısında buluşturur.</p>
            <Link href="/magaza-ac" className="mt-4 inline-flex min-h-11 items-center font-bold text-[#d7ec9c] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Mağaza aç <ArrowIcon className="h-4 w-4" /></Link>
          </div>
          <nav aria-label="Kurumsal bağlantılar">
            <p className="font-bold text-white">Kurumsal</p>
            <div className="mt-3 grid gap-1 text-sm text-[#cfc6b7]">
              {corporateLinks.map((item) => <Link key={item.href} href={item.href} className="min-h-11 content-center rounded-md transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{item.label}</Link>)}
            </div>
          </nav>
          <nav aria-label="Yasal bağlantılar">
            <p className="font-bold text-white">Yasal</p>
            <div className="mt-3 grid gap-1 text-sm text-[#cfc6b7]">
              {legalLinks.map((item) => <Link key={item.href} href={item.href} className="min-h-11 content-center rounded-md transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{item.label}</Link>)}
            </div>
          </nav>
          <div>
            <p className="font-bold text-white">Alışveriş güvencesi</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[#cfc6b7]">
              <li><strong className="block text-white">HTTPS/TLS bağlantı</strong>Canlı bağlantılar şifreli kanal üzerinden korunur.</li>
              <li><strong className="block text-white">Kart bilgisi saklanmaz</strong>Mevcut MVP’de online kart verisi alınmaz.</li>
              <li><strong className="block text-white">Satıcıya ait ödeme</strong>Ödeme ve teslimat yöntemi ilgili mağazaya göre gösterilir.</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs leading-5 text-[#a99f91] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <span>© 2026 Fıstık360 · Kuruyemiş ticaretinin dijital pazarı.</span>
            <span>{legalEntity.operatorName} · <Link href="/sayfalar/kunye" className="underline underline-offset-2 hover:text-white">Künye</Link></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
