import Link from "next/link";

const featuredStores = [
  { name: "Fıstıkçı Mehmet", neighborhood: "Kadıköy", description: "Aile paketleri ve taze kuruyemişlerle hizmet veriyor." },
  { name: "Gaziantep Kuruyemiş", neighborhood: "Beşiktaş", description: "Toptan girişimler ve premium kalite ürünler." },
];

const featuredProducts = [
  { name: "Antep Fıstığı", detail: "500 gram · 350 TL", badge: "En Çok Satılan" },
  { name: "Karışık Kuruyemiş", detail: "1 kg · 480 TL", badge: "Yeni" },
  { name: "Badem", detail: "250 gram · 180 TL", badge: "Öne Çıkan" },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid items-center gap-8 rounded-[32px] border border-[#dccaa2] bg-[#fffaf2] p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[#d7c38f] bg-[#f4e8cc] px-3 py-1 text-sm font-medium text-[#7a5b2d]">
            Mahallendeki kuruyemişçi, sektörün toptan pazarı
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-[#2b231b] sm:text-5xl">
              Fıstık360 ile kuruyemiş ticaretini daha akıcı hale getirin.
            </h1>
            <p className="max-w-2xl text-lg text-[#6b5a43]">
              Tüketiciye ulaşan mağazalar, toptan ürünler ve paket sistemini tek bir deneyimde birleştiriyoruz.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/mahalle" className="rounded-full bg-[#4f6b3c] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#3f592f]">
              Mahallede Kuruyemişçi Bul
            </Link>
            <Link href="/toptan" className="rounded-full border border-[#4f6b3c] px-5 py-3 text-center font-semibold text-[#4f6b3c] transition hover:bg-[#f4e8cc]">
              Toptan Pazara Gir
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e8dcc5] bg-gradient-to-br from-[#4f6b3c] to-[#7a8f55] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-[#e8f1da]">Bu hafta öne çıkan</p>
          <h2 className="mt-3 text-2xl font-semibold">Aile Paketi</h2>
          <p className="mt-3 text-sm text-[#f5efde]">Antep fıstığı, badem, kaju ve karışık kuruyemişin birleşimi.</p>
          <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p className="text-sm text-[#eff7e4]">Örnek paket akışı</p>
            <div className="mt-3 flex items-center justify-between">
              <span>2 kişilik paket</span>
              <span className="font-semibold">780 TL</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Yakınındaki mağazalar</h3>
            <Link href="/magazalar" className="text-sm font-semibold text-[#4f6b3c]">Tümünü gör</Link>
          </div>
          <div className="mt-6 space-y-4">
            {featuredStores.map((store) => (
              <div key={store.name} className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{store.name}</h4>
                  <span className="rounded-full bg-[#eef5e5] px-3 py-1 text-xs font-medium text-[#4f6b3c]">{store.neighborhood}</span>
                </div>
                <p className="mt-2 text-sm text-[#6b5a43]">{store.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Öne çıkan ürünler</h3>
            <Link href="/toptan" className="text-sm font-semibold text-[#4f6b3c]">Toptan gör</Link>
          </div>
          <div className="mt-6 space-y-4">
            {featuredProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-[#6b5a43]">{product.detail}</p>
                </div>
                <span className="rounded-full bg-[#f4e8cc] px-3 py-1 text-xs font-medium text-[#7a5b2d]">{product.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
