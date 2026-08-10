import Link from "next/link";

const products = [
  { name: "Antep Fıstığı", size: "500 gram", price: "350 TL" },
  { name: "Badem", size: "500 gram", price: "180 TL" },
  { name: "Kaju", size: "250 gram", price: "220 TL" },
];

const packages = [
  { name: "Aile Paketi", items: "500 g Antep Fıstığı · 500 g Badem · 250 g Kaju" },
  { name: "Düğün Paketi", items: "1 kg Karışık Kuruyemiş · 2 kg Antep Fıstığı" },
];

export default function StoreDetailPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Link href="/magazalar" className="text-sm font-semibold text-[#4f6b3c]">← Mağazalara dön</Link>
      <div className="mt-6 rounded-[28px] border border-[#e8dcc5] bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Mağaza vitrini</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Fıstıkçı Mehmet</h1>
            <p className="mt-4 max-w-2xl text-[#6b5a43]">Kadıköy merkezde faaliyet gösteren, paket ve perakende ürünleri bir arada sunan kuruyemişçi mağazası.</p>
          </div>
          <div className="rounded-2xl bg-[#f4e8cc] px-5 py-4 text-sm text-[#7a5b2d]">
            <p className="font-semibold">Kadıköy</p>
            <p className="mt-1">Aktif teslimat</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Perakende ürünler</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.name} className="flex items-center justify-between rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-[#6b5a43]">{product.size}</p>
                  </div>
                  <span className="font-semibold text-[#2b231b]">{product.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Paketler</h2>
            <div className="mt-4 space-y-3">
              {packages.map((pkg) => (
                <div key={pkg.name} className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="mt-2 text-sm text-[#6b5a43]">{pkg.items}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
