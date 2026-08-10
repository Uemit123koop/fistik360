import Link from "next/link";

const wholesaleProducts = [
  { id: 1, title: "Antep Fıstığı", origin: "Gaziantep", type: "Boz İç", stock: "2.500 kg", minimum: "50 kg", price: "620 TL/kg", seller: "Gaziantep Kuruyemiş Toptan" },
  { id: 2, title: "Badem", origin: "Mardin", type: "Taze", stock: "1.200 kg", minimum: "25 kg", price: "410 TL/kg", seller: "Mardin Nut House" },
];

export default function WholesalePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Toptan pazaryeri</p>
          <h1 className="text-3xl font-semibold text-[#2b231b]">Satıcıdan doğrudan toptan ürünler</h1>
        </div>
        <div className="rounded-full border border-[#d7c38f] bg-[#f4e8cc] px-4 py-2 text-sm font-medium text-[#7a5b2d]">
          Basit alım talebi akışı
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {wholesaleProducts.map((product) => (
          <div key={product.id} className="rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{product.title}</h2>
              <span className="rounded-full bg-[#eef5e5] px-3 py-1 text-xs font-semibold text-[#4f6b3c]">Aktif</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[#6b5a43]">
              <p><span className="font-semibold text-[#2b231b]">Satıcı:</span> {product.seller}</p>
              <p><span className="font-semibold text-[#2b231b]">Menşei:</span> {product.origin}</p>
              <p><span className="font-semibold text-[#2b231b]">Tür:</span> {product.type}</p>
              <p><span className="font-semibold text-[#2b231b]">Stok:</span> {product.stock}</p>
              <p><span className="font-semibold text-[#2b231b]">Minimum sipariş:</span> {product.minimum}</p>
              <p><span className="font-semibold text-[#2b231b]">Fiyat:</span> {product.price}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link href={`/toptan/${product.id}`} className="rounded-full bg-[#4f6b3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3f592f]">
                Detay Gör
              </Link>
              <button className="rounded-full border border-[#4f6b3c] px-4 py-2 text-sm font-semibold text-[#4f6b3c]">
                Alım Talebi Gönder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
