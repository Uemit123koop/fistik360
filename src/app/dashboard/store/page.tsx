import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader, DashboardStatCard, ClipboardListIcon, ReceiptIcon, RocketIcon, TruckIcon } from "@/components/dashboard-ui";
import { MapPinIcon, PackageIcon, ShieldIcon } from "@/components/marketplace-ui";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const QUICK_ACTIONS = [
  { href: "/dashboard/store/orders", title: "Siparişler", text: "Gelen siparişleri onayla, hazırla ve teslimata çıkar.", icon: <ClipboardListIcon /> },
  { href: "/dashboard/store/new", title: "Katalogdan ürün seç", text: "Ürünü seç; yalnız fiyat, miktar ve satış birimini belirle.", icon: <PackageIcon className="h-4.5 w-4.5" /> },
  { href: "/dashboard/store/products", title: "Ürünlerimi yönet", text: "Stok ve vitrin aktifliğini hızlıca güncelle.", icon: <ReceiptIcon /> },
  { href: "/dashboard/store/packages", title: "Paketlerimi yönet", text: "Aile, ofis ve hediye paketlerini düzenle.", icon: <PackageIcon className="h-4.5 w-4.5" /> },
  { href: "/dashboard/store/neighborhoods", title: "Mahallelerim", text: "Mağaza profilini, yayın durumunu ve hizmet mahallelerini tek yerden yönet.", icon: <MapPinIcon className="h-4.5 w-4.5" /> },
  { href: "/dashboard/store/delivery", title: "Teslimat & Ödeme", text: "Kapıda ödeme, kart ve IBAN ayarlarını yönet.", icon: <TruckIcon /> },
  { href: "/dashboard/store/wholesale", title: "Toptan pazar", text: "Doğrulanmış toptancılardan ürün tedarik et.", icon: <ShieldIcon className="h-4.5 w-4.5" /> },
];

export default async function StoreDashboardPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, description, is_active, platform_status")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const [{ data: areas }, { count: productCount }, { count: packageCount }, { count: catalogCount }] = await Promise.all([
    store
      ? supabase.from("store_neighborhoods").select("id, province, district, neighborhood, is_primary, is_active").eq("store_id", store.id).order("is_primary", { ascending: false })
      : Promise.resolve({ data: [] }),
    store ? supabase.from("retail_products").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true) : Promise.resolve({ count: 0 }),
    store ? supabase.from("packages").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true) : Promise.resolve({ count: 0 }),
    supabase.from("catalog_products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("available_to_retail", true),
  ]);
  const primary = areas?.find((area) => area.is_primary) ?? areas?.[0];
  const isLive = Boolean(store?.is_active && store.platform_status === "ACTIVE");

  return (
    <div>
      <section className="relative overflow-hidden rounded-[22px] bg-[var(--color-primary-dark)] p-5 text-white sm:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 20% 10%, rgba(215,236,156,.18), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">Kuruyemişçi paneli</span>
            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{store?.name ?? "Mağazan"}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">Katalog ürünlerini fiyatlandır, paketlerini hazırla ve seçtiğin mahallenin vitrinini tek yerden yönet.</p>
          </div>
          {store?.id && isLive && (
            <Link href={`/magaza/${store.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#d7ec9c] px-5 font-extrabold text-[var(--color-primary-dark)] transition-colors hover:bg-white">
              Mağaza vitrinini gör →
            </Link>
          )}
        </div>
      </section>

      {!primary && (
        <section className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-amber-800">Onboarding · İlk adım</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--color-ink)]">Ücretsiz ana mahalleni seç</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/75">İl, ilçe ve mahalleni tamamladığında ürünlerin o mahalledeki mağaza vitrininde görünür.</p>
          <Link href="/dashboard/store/neighborhoods" className="button-primary mt-4">Mağaza ve mahalle ayarları</Link>
        </section>
      )}

      {store && store.platform_status !== "ACTIVE" && (
        <section className={`mt-5 rounded-[18px] border p-5 ${store.platform_status === "SUSPENDED" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <p className={`text-xs font-extrabold uppercase tracking-[.12em] ${store.platform_status === "SUSPENDED" ? "text-red-800" : "text-amber-800"}`}>
            {store.platform_status === "SUSPENDED" ? "Platform incelemesi" : "Canlıya çıkış"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-[var(--color-ink)]">{store.platform_status === "SUSPENDED" ? "Mağazan askıya alınmış" : "Mağazan henüz yayında değil"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
            {store.platform_status === "SUSPENDED" ? "Yayın durumunu çözmek için destek ekibiyle iletişime geç." : "Kontrol listesindeki eksikleri tamamla ve mağazanı mahallendeki müşterilere aç."}
          </p>
          <Link href="/dashboard/store/neighborhoods" className="button-primary mt-4">Yayın durumunu aç</Link>
        </section>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard icon={<PackageIcon className="h-4.5 w-4.5" />} label="Aktif ürün" value={String(productCount ?? 0)} note={`${catalogCount ?? 0} katalog ürünü arasından`} />
        <DashboardStatCard icon={<PackageIcon className="h-4.5 w-4.5" />} label="Aktif paket" value={String(packageCount ?? 0)} note="Hazır seçkilerin" tone="info" />
        <DashboardStatCard icon={<MapPinIcon className="h-4.5 w-4.5" />} label="Ana mahalle" value={primary?.neighborhood ?? "Seçilmedi"} note={primary ? `${primary.district}, ${primary.province}` : "Onboarding bekliyor"} tone={primary ? "success" : "warning"} />
        <DashboardStatCard icon={<RocketIcon />} label="Yayın durumu" value={isLive ? "Yayında" : "Hazırlanıyor"} note={store?.platform_status ?? "PENDING_ONBOARDING"} tone={isLive ? "success" : "warning"} />
      </section>

      <section className="mt-6">
        <DashboardPageHeader eyebrow="Kısayollar" title="Ne yapmak istersin?" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary-light)] hover:bg-white hover:shadow-[var(--shadow-card)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] transition-colors group-hover:bg-[var(--color-primary-dark)] group-hover:text-white">
                {item.icon}
              </span>
              <h3 className="mt-3 font-bold text-[var(--color-ink)] group-hover:text-[var(--color-primary-dark)]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-5 text-[var(--color-muted-text)]">{item.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-[var(--color-primary-dark)]">Aç <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
