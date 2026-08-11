import Link from "next/link";
import { DEMO_SELLERS } from "@/lib/demo-sellers";
import { getServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MapPinIcon } from "@/components/marketplace-ui";

function metric(label: string, value: string, note: string) {
  return <article className="rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_14px_42px_rgba(33,47,39,.06)]"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#748078]">{label}</p><p className="mt-3 text-2xl font-extrabold text-[#173f31]">{value}</p><p className="mt-2 text-xs text-[#748078]">{note}</p></article>;
}

async function RealSellerHome({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, description, is_active, platform_status").eq("owner_id", userId).order("created_at").limit(1).maybeSingle();
  const [{ data: areas }, { count: productCount }, { count: packageCount }, { count: catalogCount }] = await Promise.all([
    store ? supabase.from("store_neighborhoods").select("id, province, district, neighborhood, is_primary, is_active").eq("store_id", store.id).order("is_primary", { ascending: false }) : Promise.resolve({ data: [] }),
    store ? supabase.from("retail_products").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true) : Promise.resolve({ count: 0 }),
    store ? supabase.from("packages").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("is_active", true) : Promise.resolve({ count: 0 }),
    supabase.from("catalog_products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("available_to_retail", true),
  ]);
  const primary = areas?.find((area) => area.is_primary) ?? areas?.[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="overflow-hidden rounded-[30px] bg-[#173f31] p-6 text-white shadow-[0_28px_80px_rgba(23,63,49,.2)] sm:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">Kuruyemişçi seller paneli</span><h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">{store?.name ?? "Mağazan"}</h1><p className="mt-4 max-w-2xl leading-7 text-white/70">Katalog ürünlerini fiyatlandır, paketlerini hazırla ve seçtiğin mahallenin vitrinini tek yerden yönet.</p></div>{store?.id && store.is_active && store.platform_status === "ACTIVE" && <Link href={`/magaza/${store.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d7ec9c] px-5 font-extrabold text-[#173f31]">Mağaza vitrinini gör →</Link>}</div>
      </section>
      {!primary && <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-amber-800">Onboarding · İlk adım</p><h2 className="mt-2 text-2xl font-bold">Ücretsiz ana mahalleni seç</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/75">İl, ilçe ve mahalleni tamamladığında ürünlerin o mahalledeki mağaza vitrininde görünür.</p><Link href="/dashboard/store/profile" className="button-primary mt-5">Mağaza ve mahalle ayarları</Link></section>}
      {store && store.platform_status !== "ACTIVE" && <section className={`mt-5 rounded-[24px] border p-5 sm:p-6 ${store.platform_status === "SUSPENDED" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}><p className={`text-xs font-extrabold uppercase tracking-[.13em] ${store.platform_status === "SUSPENDED" ? "text-red-800" : "text-amber-800"}`}>{store.platform_status === "SUSPENDED" ? "Platform incelemesi" : "Canlıya çıkış"}</p><h2 className="mt-2 text-2xl font-bold">{store.platform_status === "SUSPENDED" ? "Mağazan askıya alınmış" : "Mağazan henüz yayında değil"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">{store.platform_status === "SUSPENDED" ? "Yayın durumunu çözmek için destek ekibiyle iletişime geç." : "Kontrol listesindeki eksikleri tamamla ve mağazanı mahallendeki müşterilere aç."}</p><Link href="/dashboard/store/publish" className="button-primary mt-5">Yayın durumunu aç</Link></section>}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metric("Aktif ürün", String(productCount ?? 0), `${catalogCount ?? 0} katalog ürünü arasından`)}
        {metric("Aktif paket", String(packageCount ?? 0), "Hazır seçkilerin")}
        {metric("Ana mahalle", primary?.neighborhood ?? "Seçilmedi", primary ? `${primary.district}, ${primary.province}` : "Onboarding bekliyor")}
        {metric("Yayın durumu", store?.is_active && store.platform_status === "ACTIVE" ? "Yayında" : "Hazırlanıyor", store?.platform_status ?? "PENDING_ONBOARDING")}
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[{ href: "/dashboard/store/orders", title: "Siparişler", text: "Gelen siparişleri onayla, hazırla ve teslimata çıkar." }, { href: "/dashboard/store/new", title: "Katalogdan ürün seç", text: "Ürünü seç; yalnız fiyat, miktar ve satış birimini belirle." },{ href: "/dashboard/store/products", title: "Ürünlerimi yönet", text: "Stok ve vitrin aktifliğini hızlıca güncelle." }, { href: "/dashboard/store/packages", title: "Paketlerimi yönet", text: "Aile, ofis ve hediye paketlerini düzenle." }, { href: "/dashboard/store/profile", title: "Mağaza profilim", text: "İşletme adı, mahalle ve mağaza bilgilerini tamamla." }].map((item) => <Link key={item.href} href={item.href} className="group rounded-[22px] border border-black/5 bg-white p-5 shadow-[0_14px_42px_rgba(33,47,39,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(33,47,39,.1)]"><h2 className="font-bold group-hover:text-[#27664d]">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[#748078]">{item.text}</p><span className="mt-4 inline-flex text-sm font-extrabold text-[#27664d]">Aç →</span></Link>)}</section>
    </div>
  );
}

export default async function SellerPage() {
  const user = await getServerUser();
  if (user?.role === "NUT_STORE") return <RealSellerHome userId={user.id} />;

  return (
    <div className="bg-[#f7f4ec]">
      <section className="bg-[#153b2e] text-white"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#d6e5b8]">Fıstık360 seller deneyimi</p><h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight sm:text-6xl">Mahalleni seç, katalogdan fiyatlandır, mağazanı yayınla.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Aşağıdaki beş örnek kuruyemişçi paneline gir; ürün aktifliği, gramaj, birim, fiyat ve paketlerin mahalle mağazasına nasıl yansıdığını dene.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/magaza-ac" className="button-primary">Gerçek mağaza kaydı</Link><Link href="/mahalle" className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-5 font-bold hover:bg-white/10">Mahalle seçimi</Link></div></div></section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">5 mahalle · 5 mağaza</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mock seller hesapları</h2></div><span className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm sm:block">Veriler tarayıcında saklanır</span></div><div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{DEMO_SELLERS.map((seller) => <article key={seller.slug} className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_16px_48px_rgba(33,47,39,.07)]"><div className="h-2" style={{ backgroundColor: seller.accent }} /><div className="p-5"><div className="flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-extrabold text-white" style={{ backgroundColor: seller.accent }}>{seller.initials}</span><div><h3 className="text-xl font-bold">{seller.name}</h3><p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#607067]"><MapPinIcon className="h-3.5 w-3.5" /> {seller.neighborhood}, {seller.district}</p></div></div><p className="mt-4 min-h-18 text-sm leading-6 text-[#748078]">{seller.description}</p><div className="mt-5 grid grid-cols-2 gap-2"><Link href={`/seller/demo/${seller.slug}`} className="button-primary">Seller paneli</Link><Link href={`/magaza/${seller.storeId}`} className="button-secondary">Mağaza vitrini</Link></div></div></article>)}</div></section>
    </div>
  );
}
