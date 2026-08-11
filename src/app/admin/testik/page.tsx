import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const managementLinks = [
  { href: "/dashboard/admin", title: "Operasyon paneli", description: "Platform genel görünümü ve yönetim akışları." },
  { href: "/dashboard/admin/partner-applications", title: "Partner başvuruları", description: "Marka partneri inceleme ve onay işlemleri." },
  { href: "/magazalar", title: "Kuruyemişçi pazarı", description: "Tüketicinin gördüğü aktif mağaza ve ürün vitrinleri." },
  { href: "/toptan", title: "Toptan pazar", description: "Kuruyemişçilere açık ürün ve tedarikçi vitrini." },
];

function value(count: number | null) {
  return count == null ? "—" : count.toLocaleString("tr-TR");
}

export default async function SuperAdminTestikPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const admin = createSupabaseAdminClient();
  const [profiles, stores, wholesalers, catalog, orders] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("stores").select("id", { count: "exact", head: true }),
    admin.from("wholesale_seller_profiles").select("id", { count: "exact", head: true }),
    admin.from("catalog_products").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("orders").select("id", { count: "exact", head: true }),
  ]);

  const metrics = [
    { label: "Kayıtlı hesap", count: profiles.count },
    { label: "Kuruyemişçi", count: stores.count },
    { label: "Toptancı", count: wholesalers.count },
    { label: "Aktif katalog ürünü", count: catalog.count },
    { label: "Sipariş", count: orders.count },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border-soft)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Fıstık360 ana sayfa"><BrandLogo className="h-12 w-36" preload sizes="144px" /></Link>
          <div className="text-right"><p className="eyebrow">Super Admin</p><p className="mt-1 max-w-[220px] truncate text-xs text-[var(--color-muted-text)]">{user.email}</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[24px] bg-[var(--color-primary-dark)] p-6 text-white shadow-[var(--shadow-soft)] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#dce7c7]">Fıstık360 kontrol merkezi</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-.03em] sm:text-5xl">Testik Super Admin</h1><p className="mt-3 max-w-2xl leading-7 text-[#e8eddc]">Katalog, satıcı, partner ve sipariş omurgasını gerçek verilerle takip eden yalnız ADMIN erişimli yönetim alanı.</p></div>
            <span className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold"><ShieldIcon /> Server-side korumalı</span>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Platform metrikleri">
          {metrics.map((metric) => <article key={metric.label} className="rounded-[18px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--color-muted-text)]">{metric.label}</p><p className="mt-3 text-3xl font-extrabold text-[var(--color-primary-dark)]">{value(metric.count)}</p></article>)}
        </section>

        <section className="mt-8">
          <p className="eyebrow">Yönetim alanları</p><h2 className="section-title">Panellere güvenli geçiş</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {managementLinks.map((item) => <Link key={item.href} href={item.href} className="group rounded-[18px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary-light)] hover:shadow-[var(--shadow-card-hover)]"><span className="flex items-center justify-between gap-4"><strong className="text-lg">{item.title}</strong><ArrowIcon className="h-5 w-5 text-[var(--color-primary)] transition group-hover:translate-x-1" /></span><span className="mt-2 block text-sm leading-6 text-[var(--color-muted-text)]">{item.description}</span></Link>)}
          </div>
        </section>
      </main>
    </div>
  );
}
