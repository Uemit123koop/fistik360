import Link from "next/link";
import { AuthModalProvider } from "@/components/auth-modal";
import { BrandLogo } from "@/components/brand-logo";
import { CartDrawerProvider, CartTriggerButton } from "@/components/cart-drawer";
import { HomeReturnLink } from "@/components/home-return-link";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";
import { SellerEntryDrawerProvider, SellerEntryTriggerButton } from "@/components/seller-entry-drawer";
import { getCartItemCount } from "@/lib/cart";
import { getServerUser } from "@/lib/auth";
import { corporateLinks, legalEntity, legalLinks } from "@/lib/legal-content";

function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// Ödeme sağlayıcı/kart şeması rozetleri — resmi marka görselleri yerine kartların
// yaygın bilinen renk/biçimiyle sade, metin tabanlı temsiller (iyzico entegrasyonu
// gerçek; Mastercard/VISA/TROY kartlar iyzico üzerinden kabul edilir).
function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <span className="rounded-[8px] bg-white px-3 py-1.5 text-sm font-black italic tracking-tight text-[#1a2b6d]">iyzico</span>
      <span className="flex items-center gap-1 rounded-[8px] bg-white px-2.5 py-1.5" aria-label="Mastercard">
        <span className="h-4 w-4 rounded-full bg-[#eb001b] opacity-90" />
        <span className="-ml-2 h-4 w-4 rounded-full bg-[#f79e1b] opacity-90" />
      </span>
      <span className="rounded-[8px] bg-white px-3 py-1.5 text-sm font-black italic tracking-tight text-[#1a1f71]">VISA</span>
      <span className="rounded-[8px] bg-white px-3 py-1.5 text-sm font-black tracking-tight text-[#0aa06e]">troy</span>
    </div>
  );
}

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [user, cartCount] = await Promise.all([
    getServerUser(),
    getCartItemCount().catch(() => 0),
  ]);

  return (
    <AuthModalProvider>
      <CartDrawerProvider>
        <SellerEntryDrawerProvider>
          <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-ink)]">
          <a href="#main-content" className="skip-link">İçeriğe geç</a>
          <header className="safe-header sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]/98">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:gap-5 sm:px-6 lg:px-8">
              <Link href="/" className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]" aria-label="Fıstık360 ana sayfa">
                <BrandLogo className="h-12 w-32 sm:h-14 sm:w-40" preload sizes="(max-width: 640px) 128px, 160px" />
              </Link>
              <nav aria-label="Ana menü" className="flex items-center gap-3 sm:gap-6">
                <Link href="/sayfalar/hakkimizda" className="flex min-h-11 items-center whitespace-nowrap text-xs font-bold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)] sm:text-sm">Hakkımızda</Link>
                <Link href="/fiyatlandirma" className="flex min-h-11 items-center whitespace-nowrap text-xs font-bold text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)] sm:text-sm">Fiyatlar</Link>
              </nav>
              <div className="flex shrink-0 items-center gap-2">
                <HomeReturnLink />
                {(!user || user.role === "CUSTOMER") && (
                  <CartTriggerButton
                    count={cartCount}
                    className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 font-bold text-[var(--color-primary-dark)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]"
                  />
                )}
                {!user && (
                  <SellerEntryTriggerButton className="button-primary px-3 sm:px-[1.15rem]">
                    Giriş yap <ArrowIcon className="hidden h-4 w-4 sm:block" />
                  </SellerEntryTriggerButton>
                )}
                {user && (
                  <Link href="/dashboard" className="button-primary px-3 sm:px-[1.15rem]">
                    Panelim <ArrowIcon className="hidden h-4 w-4 sm:block" />
                  </Link>
                )}
              </div>
            </div>
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
            <div className="border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-7xl flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#cfc6b7]">
                    <LockIcon /> Güvenli ödeme
                  </span>
                  <PaymentBadges />
                  <span className="text-xs font-semibold text-[#cfc6b7]">256-bit SSL</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2d5540] bg-[#173328] px-4 py-2 text-xs font-bold text-[#d7ec9c]">
                  <ShieldIcon className="h-4 w-4" /> SSL Sertifikalı · 256-bit güvenli bağlantı
                </div>
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
        </SellerEntryDrawerProvider>
      </CartDrawerProvider>
    </AuthModalProvider>
  );
}
