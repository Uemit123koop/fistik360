import Link from "next/link";

const stores = [
  { id: 1, name: "Fıstıkçı Mehmet", neighborhood: "Kadıköy", description: "Aile paketleri ve günlük kuruyemiş", products: "12 ürün", packages: "4 paket" },
  { id: 2, name: "Lezzet Bahçesi", neighborhood: "Kadıköy", description: "Premium karışık kuruyemiş ve davet paketleri", products: "8 ürün", packages: "3 paket" },
  { id: 3, name: "Antep Pazar", neighborhood: "Beşiktaş", description: "Antep fıstığı odaklı butik mağaza", products: "9 ürün", packages: "2 paket" },
];

export default function StoresPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Mahalle mağazaları</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Seçtiğiniz mahalledeki kuruyemişçileri keşfedin</h1>
        </div>
        <div className="rounded-full border border-[#d7c38f] bg-[#f4e8cc] px-4 py-2 text-sm font-medium text-[#7a5b2d]">Kadıköy • Aktif mağazalar</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <div key={store.id} className="rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{store.name}</h2>
              <span className="rounded-full bg-[#eef5e5] px-3 py-1 text-xs font-semibold text-[#4f6b3c]">{store.neighborhood}</span>
            </div>
            <p className="mt-4 text-sm text-[#6b5a43]">{store.description}</p>
            <div className="mt-4 flex gap-3 text-sm text-[#6b5a43]">
              <span className="rounded-full bg-[#fffaf2] px-3 py-1">{store.products}</span>
              <span className="rounded-full bg-[#fffaf2] px-3 py-1">{store.packages}</span>
            </div>
            <div className="mt-6">
              <Link href={`/magaza/${store.id}`} className="rounded-full bg-[#4f6b3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3f592f]">
                Mağazayı Aç
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
