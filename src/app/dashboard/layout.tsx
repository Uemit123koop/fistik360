import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { requireRole } from "@/lib/auth";

const adminLinks = [
  { href: "/admin/testik", label: "Super Admin" },
  { href: "/dashboard/admin", label: "Genel Bakış" },
  { href: "/dashboard/admin/partner-applications", label: "Partner Başvuruları" },
  { href: "/dashboard/admin/users", label: "Kullanıcılar" },
  { href: "/dashboard/admin/stores", label: "Kuruyemişçiler" },
  { href: "/dashboard/admin/wholesalers", label: "Toptancılar" },
  { href: "/dashboard/admin/products", label: "Ürünler" },
  { href: "/dashboard/admin/packages", label: "Paketler" },
];

const wholesaleLinks = [
  { href: "/dashboard/wholesale", label: "Genel Bakış" },
  { href: "/dashboard/wholesale/products", label: "Toptan Ürünlerim" },
  { href: "/dashboard/wholesale/new", label: "Katalogdan Ürün Seç" },
  { href: "/dashboard/wholesale/requests", label: "Talepler" },
  { href: "/dashboard/wholesale/profile", label: "Profil" },
];

const storeLinks = [
  { href: "/dashboard/store", label: "Genel Bakış" },
  { href: "/dashboard/store/orders", label: "Siparişler" },
  { href: "/dashboard/store/profile", label: "Mağazam" },
  { href: "/dashboard/store/delivery", label: "Teslimat & Ödeme" },
  { href: "/dashboard/store/publish", label: "Yayın Durumu" },
  { href: "/dashboard/store/products", label: "Ürünlerim" },
  { href: "/dashboard/store/new", label: "Katalogdan Ürün Seç" },
  { href: "/dashboard/store/packages", label: "Paketlerim" },
  { href: "/dashboard/store/packages/new", label: "Paket Oluştur" },
  { href: "/dashboard/store/wholesale", label: "Toptan Pazar" },
  { href: "/dashboard/store/profile", label: "Profil" },
];

const customerLinks = [
  { href: "/dashboard/customer", label: "Profil" },
  { href: "/dashboard/customer/orders", label: "Siparişlerim" },
  { href: "/dashboard/customer/neighborhood", label: "Mahalle seçimi" },
];

const partnerLinks = [
  { href: "/dashboard/partner", label: "Genel Bakış" },
  { href: "/dashboard/partner/products", label: "Ürünlerim" },
  { href: "/dashboard/partner/brand", label: "Marka Mağazam" },
  { href: "/dashboard/partner/settings", label: "Ayarlar" },
];

const roleLabels = {
  ADMIN: "Admin paneli",
  WHOLESALE_SELLER: "Toptancı paneli",
  NUT_STORE: "Kuruyemişçi paneli",
  CUSTOMER: "Müşteri paneli",
  BRAND_PARTNER: "Marka partner paneli",
} as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "WHOLESALE_SELLER", "NUT_STORE", "CUSTOMER", "BRAND_PARTNER"]);
  if (!user) notFound();

  const links = user.role === "ADMIN"
    ? adminLinks
    : user.role === "WHOLESALE_SELLER"
      ? wholesaleLinks
      : user.role === "NUT_STORE"
        ? storeLinks
        : user.role === "BRAND_PARTNER"
          ? partnerLinks
          : customerLinks;

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-ink)]">
      <header className="safe-header border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Fıstık360 ana sayfa" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-primary)]"><BrandLogo className="h-12 w-36 sm:w-40" preload sizes="160px" /></Link>
          <div className="text-right"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)]">{roleLabels[user.role]}</p><p className="mt-1 max-w-[180px] truncate text-xs text-[var(--color-muted-text)] sm:max-w-xs">{user.email}</p></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-7">
        <aside className="w-full rounded-[20px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] lg:w-72 lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] pb-4 lg:block">
            <div><p className="eyebrow">Yönetim alanı</p><h2 className="mt-1 text-xl font-bold">{roleLabels[user.role]}</h2></div>
            <Link href="/" className="text-link shrink-0">Siteye git</Link>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1" aria-label={`${roleLabels[user.role]} navigasyonu`}>
            {links.map((link) => <Link key={`${link.href}-${link.label}`} href={link.href} className="flex min-h-11 items-center rounded-[12px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-[var(--color-primary-dark)] transition-colors duration-200 hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{link.label}</Link>)}
          </nav>
        </aside>
        <section className="min-w-0 flex-1 rounded-[20px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">{children}</section>
      </div>
    </div>
  );
}
