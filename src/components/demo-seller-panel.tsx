"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEMO_CATALOG,
  DEMO_STORAGE_PREFIX,
  getInitialDemoProducts,
  type DemoSeller,
  type DemoSellerPackage,
  type DemoSellerProduct,
} from "@/lib/demo-sellers";

type PanelTab = "overview" | "products" | "packages" | "store";

interface StoredDemoState {
  products: DemoSellerProduct[];
  packages: DemoSellerPackage[];
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function Icon({ name }: { name: "home" | "box" | "package" | "store" | "search" | "eye" | "check" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /></>,
    package: <><path d="M4 8h16v12H4zM7 4h10l3 4H4l3-4Z" /><path d="M12 8v12" /></>,
    store: <><path d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Z" /><path d="M9 20v-6h6v6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className="relative h-11 w-12 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
      <span className={`absolute left-0 top-2 h-7 w-12 rounded-full transition-colors duration-200 ${checked ? "bg-[var(--color-primary)]" : "bg-[#d6d0c5]"}`} />
      <span className={`absolute top-3 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function DemoSellerPanel({ seller }: { seller: DemoSeller }) {
  const [tab, setTab] = useState<PanelTab>("overview");
  const [products, setProducts] = useState(() => getInitialDemoProducts(seller));
  const [packages, setPackages] = useState(() => seller.packages);
  const [category, setCategory] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(`${DEMO_STORAGE_PREFIX}${seller.slug}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredDemoState;
          if (Array.isArray(parsed.products) && Array.isArray(parsed.packages)) {
            setProducts(parsed.products);
            setPackages(parsed.packages);
          }
        } catch {
          window.localStorage.removeItem(`${DEMO_STORAGE_PREFIX}${seller.slug}`);
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [seller.slug]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(`${DEMO_STORAGE_PREFIX}${seller.slug}`, JSON.stringify({ products, packages }));
  }, [hydrated, packages, products, seller.slug]);

  const categories = useMemo(() => ["Tümü", ...new Set(DEMO_CATALOG.map((item) => item.category))], []);
  const visibleProducts = products.filter((product) => {
    const categoryMatch = category === "Tümü" || product.category === category;
    const queryMatch = !query || `${product.name} ${product.category}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
    return categoryMatch && queryMatch;
  });
  const activeProducts = products.filter((item) => item.active).length;
  const activePackages = packages.filter((item) => item.active).length;

  function updateProduct(id: string, patch: Partial<DemoSellerProduct>) {
    setProducts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updatePackage(id: string, patch: Partial<DemoSellerPackage>) {
    setPackages((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  const tabs: Array<{ id: PanelTab; label: string; icon: "home" | "box" | "package" | "store" }> = [
    { id: "overview", label: "Genel bakış", icon: "home" },
    { id: "products", label: "Ürün kataloğu", icon: "box" },
    { id: "packages", label: "Paketler", icon: "package" },
    { id: "store", label: "Mağazam", icon: "store" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-[var(--color-ink)]" style={{ "--demo-accent": seller.accent } as React.CSSProperties}>
      <header className="border-b border-black/5 bg-[#102e24] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 font-serif text-sm font-bold ring-1 ring-white/20">{seller.initials}</span>
            <div className="min-w-0"><p className="truncate font-bold">{seller.name}</p><p className="truncate text-xs text-white/65">{seller.neighborhood} · Demo seller paneli</p></div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="hidden items-center gap-1 rounded-full bg-emerald-300/15 px-3 py-2 text-xs font-bold text-emerald-100 sm:inline-flex"><Icon name="check" /> Kaydedildi</span>}
            <Link href={`/magaza/${seller.storeId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-[#12382b] transition hover:bg-[#edf5df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Icon name="eye" /> <span className="hidden sm:inline">Mağazayı gör</span></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-7">
        <aside className="rounded-[24px] border border-black/5 bg-white p-3 shadow-[0_18px_50px_rgba(36,48,39,.07)] lg:sticky lg:top-5 lg:h-fit lg:p-4">
          <div className="mb-3 hidden rounded-[18px] bg-[#f2f7ed] p-4 lg:block">
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#4c6b5b]">Ana mahalle</p>
            <p className="mt-2 font-bold">{seller.neighborhood}</p>
            <p className="mt-1 text-xs text-[#68756e]">{seller.district}, {seller.province}</p>
            <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">Ücretsiz · Aktif</span>
          </div>
          <nav className="grid grid-cols-4 gap-2 lg:grid-cols-1" aria-label="Seller panel navigasyonu">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition sm:text-xs lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm ${tab === item.id ? "bg-[#173f31] text-white shadow-sm" : "text-[#5f6d65] hover:bg-[#f3f5ef] hover:text-[#173f31]"}`}>
                <Icon name={item.icon} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 hidden border-t border-black/5 pt-4 lg:block">
            <Link href="/seller" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#637168] hover:bg-[#f3f5ef]">← Demo hesaplara dön</Link>
          </div>
        </aside>

        <main className="min-w-0">
          {tab === "overview" && (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[28px] bg-[#173f31] p-6 text-white shadow-[0_24px_70px_rgba(17,55,42,.18)] sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">Mağazan yayında</span><h1 className="mt-4 max-w-2xl font-serif text-3xl font-bold leading-tight sm:text-4xl">Bugün mahallene ne sunmak istersin?</h1><p className="mt-3 max-w-2xl leading-7 text-white/70">Katalogdan ürünü aç, fiyatını ve satış ölçüsünü belirle. Değişiklikler demo vitrinine anında yansır.</p></div>
                  <button type="button" onClick={() => setTab("products")} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d7ec9c] px-5 font-extrabold text-[#173f31] hover:bg-white">Kataloğu aç <span aria-hidden="true">→</span></button>
                </div>
              </section>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Aktif ürün", value: String(activeProducts), note: `${products.length} katalog ürünü`, tone: "bg-[#eef7e7]" },
                  { label: "Aktif paket", value: String(activePackages), note: "Hazır seçkiler", tone: "bg-[#fff4dc]" },
                  { label: "Ana mahalle", value: seller.neighborhood, note: "Ücretsiz hizmet alanı", tone: "bg-[#e8f3f5]" },
                  { label: "Teslimat", value: seller.deliveryMinutes, note: `${money(seller.freeDeliveryThreshold)} üzeri ücretsiz`, tone: "bg-[#f2ebf9]" },
                ].map((metric) => <article key={metric.label} className={`rounded-[22px] border border-black/5 p-5 ${metric.tone}`}><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#66736b]">{metric.label}</p><p className="mt-3 text-2xl font-extrabold tracking-tight">{metric.value}</p><p className="mt-2 text-xs text-[#66736b]">{metric.note}</p></article>)}
              </section>
              <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(36,48,39,.06)] sm:p-6">
                  <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#6c786f]">Yayın kontrolü</p><h2 className="mt-1 text-xl font-bold">Mağaza hazırlığı</h2></div><span className="text-sm font-extrabold text-emerald-700">4/4 hazır</span></div>
                  <div className="mt-5 space-y-3">{["İşletme profili tamamlandı", `${seller.neighborhood} ana mahalle olarak aktif`, `${activeProducts} ürün fiyatlandırıldı`, `${activePackages} paket vitrinde`].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#f7f8f4] p-4 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" /></span>{item}</div>)}</div>
                </div>
                <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(36,48,39,.06)] sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#6c786f]">Hızlı işlemler</p><div className="mt-4 grid gap-3"><button type="button" onClick={() => setTab("products")} className="flex min-h-14 items-center justify-between rounded-2xl bg-[#173f31] px-4 font-bold text-white">Ürün fiyatlandır <span>→</span></button><button type="button" onClick={() => setTab("packages")} className="flex min-h-14 items-center justify-between rounded-2xl border border-black/10 px-4 font-bold hover:bg-[#f6f7f3]">Paketleri düzenle <span>→</span></button><Link href={`/magaza/${seller.storeId}`} className="flex min-h-14 items-center justify-between rounded-2xl border border-black/10 px-4 font-bold hover:bg-[#f6f7f3]">Mahalle vitrini <span>→</span></Link></div></div>
              </section>
            </div>
          )}

          {tab === "products" && (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#758078]">Fıstık360 ana katalog</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Ürünlerini fiyatlandır</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#68756e]">Yeni ürün adı açmadan katalogdan seç; fiyat, gramaj/birim, stok ve aktiflik mağazana özeldir.</p></div><span className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">{activeProducts}/{products.length} aktif</span></div>
              <div className="mt-6 rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_16px_45px_rgba(36,48,39,.06)]">
                <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7a867f]"><Icon name="search" /></span><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-2xl border border-black/10 bg-[#fafbf8] pl-12 pr-4 text-sm outline-none focus:border-[#3f6b58] focus:ring-2 focus:ring-[#3f6b58]/15" placeholder="Ürün veya kategori ara" aria-label="Katalogda ara" /></div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Ürün kategorileri">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-extrabold transition ${category === item ? "bg-[#173f31] text-white" : "bg-[#f0f2ed] text-[#5e6b63] hover:bg-[#e4e9e1]"}`}>{item}</button>)}</div>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {visibleProducts.map((product) => (
                  <article key={product.id} className={`rounded-[22px] border bg-white p-4 shadow-[0_12px_36px_rgba(36,48,39,.05)] transition ${product.active ? "border-emerald-200" : "border-black/7 opacity-80"}`}>
                    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#7a6a4f]">{product.category}</p><h2 className="mt-1 truncate text-lg font-bold">{product.name}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#748078]">{product.description}</p></div><Toggle checked={product.active} onChange={() => updateProduct(product.id, { active: !product.active })} label={`${product.name} vitrinde aktif`} /></div>
                    <div className="mt-4 grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-[1fr_1fr_1.2fr]">
                      <label className="text-xs font-bold text-[#68756e]">Miktar<input value={product.quantity} onChange={(event) => updateProduct(product.id, { quantity: Math.max(1, Number(event.target.value)) })} type="number" min="1" step="1" inputMode="decimal" className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-sm font-bold outline-none focus:border-[#3f6b58]" /></label>
                      <label className="text-xs font-bold text-[#68756e]">Birim<select value={product.unit} onChange={(event) => updateProduct(product.id, { unit: event.target.value as DemoSellerProduct["unit"] })} className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-sm font-bold outline-none focus:border-[#3f6b58]"><option value="gram">gram</option><option value="kg">kilogram</option><option value="adet">adet</option><option value="paket">paket</option></select></label>
                      <label className="col-span-2 text-xs font-bold text-[#68756e] sm:col-span-1">Fiyat (TL)<input value={product.price} onChange={(event) => updateProduct(product.id, { price: Math.max(1, Number(event.target.value)) })} type="number" min="1" step="0.01" inputMode="decimal" className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-sm font-extrabold text-[#173f31] outline-none focus:border-[#3f6b58]" /></label>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-3"><label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold text-[#68756e]"><input type="checkbox" checked={product.inStock} onChange={(event) => updateProduct(product.id, { inStock: event.target.checked })} className="h-5 w-5 accent-[#27664d]" /> Stokta</label><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${product.active ? "bg-emerald-100 text-emerald-800" : "bg-[#efefeb] text-[#6e756f]"}`}>{product.active ? "Mahallede yayında" : "Taslak"}</span></div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "packages" && (
            <div><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#758078]">Hazır seçkiler</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Paketlerini yönet</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#68756e]">Aile, ofis, hediye ve fit paketlerini tek dokunuşla vitrinde aç veya kapat.</p></div><div className="mt-6 grid gap-5 lg:grid-cols-2">{packages.map((item, index) => <article key={item.id} className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_15px_40px_rgba(36,48,39,.06)]"><div className={`h-2 ${["bg-[#dca64a]", "bg-[#4f8a70]", "bg-[#935b7a]", "bg-[#6b8f3d]"][index % 4]}`} /><div className="p-5"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-[#f1f2ed] px-2.5 py-1 text-[11px] font-extrabold text-[#68756e]">{item.type}</span><h2 className="mt-3 text-xl font-bold">{item.name}</h2><p className="mt-2 text-sm leading-6 text-[#748078]">{item.description}</p></div><Toggle checked={item.active} onChange={() => updatePackage(item.id, { active: !item.active })} label={`${item.name} vitrinde aktif`} /></div><ul className="mt-4 space-y-2 border-y border-black/5 py-4">{item.contents.map((content) => <li key={content} className="flex items-center gap-2 text-xs font-semibold text-[#68756e]"><span className="h-1.5 w-1.5 rounded-full bg-[#4f8a70]" />{content}</li>)}</ul><label className="mt-4 block text-xs font-bold text-[#68756e]">Paket fiyatı (TL)<input value={item.price} onChange={(event) => updatePackage(item.id, { price: Math.max(1, Number(event.target.value)) })} type="number" min="1" step="0.01" inputMode="decimal" className="mt-1 h-12 w-full rounded-xl border border-black/10 px-3 text-lg font-extrabold text-[#173f31] outline-none focus:border-[#3f6b58]" /></label></div></article>)}</div></div>
          )}

          {tab === "store" && (
            <div><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#758078]">Mahalle vitrini</p><h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mağaza profilin</h1></div><section className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(36,48,39,.08)]"><div className="h-40 bg-[radial-gradient(circle_at_78%_25%,rgba(226,194,99,.9),transparent_18%),linear-gradient(125deg,#173f31,#315f4c_55%,#c78e46)] sm:h-56" /><div className="p-5 sm:p-7"><div className="-mt-14 flex items-end gap-4"><span className="flex h-20 w-20 items-center justify-center rounded-[24px] border-4 border-white text-xl font-extrabold text-white shadow-lg" style={{ backgroundColor: seller.accent }}>{seller.initials}</span><div className="pb-1"><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#758078]">{seller.neighborhood} mağazası</p><h2 className="mt-1 text-2xl font-bold">{seller.name}</h2></div></div><p className="mt-5 max-w-3xl leading-7 text-[#68756e]">{seller.description}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#f4f7f1] p-4"><p className="text-xs font-bold text-[#748078]">Ana mahalle</p><p className="mt-1 font-extrabold">{seller.neighborhood}</p></div><div className="rounded-2xl bg-[#f4f7f1] p-4"><p className="text-xs font-bold text-[#748078]">Minimum sepet</p><p className="mt-1 font-extrabold">{money(seller.minimumOrder)}</p></div><div className="rounded-2xl bg-[#f4f7f1] p-4"><p className="text-xs font-bold text-[#748078]">Teslimat</p><p className="mt-1 font-extrabold">{seller.deliveryMinutes}</p></div></div><Link href={`/magaza/${seller.storeId}`} className="button-primary mt-6">Canlı demo vitrini aç <span aria-hidden="true">→</span></Link></div></section></div>
          )}
        </main>
      </div>
    </div>
  );
}
