import Link from "next/link";

export default function WholesaleDetailPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <Link href="/toptan" className="text-sm font-semibold text-[#4f6b3c]">← Toptan listesine dön</Link>
      <div className="mt-6 rounded-[28px] border border-[#e8dcc5] bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Toptan ürün detayı</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Antep Fıstığı</h1>
            <p className="mt-4 max-w-2xl text-[#6b5a43]">Boz iç, premium kalite, Gaziantep menşeli ve 50 kg minimum siparişe uygun ürün.</p>
          </div>
          <div className="rounded-2xl bg-[#f4e8cc] px-5 py-4 text-sm text-[#7a5b2d]">
            <p className="font-semibold">620 TL/kg</p>
            <p className="mt-1">2.500 kg stok</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
            <p className="font-semibold text-[#2b231b]">Satıcı</p>
            <p className="mt-2 text-[#6b5a43]">Gaziantep Kuruyemiş Toptan</p>
          </div>
          <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
            <p className="font-semibold text-[#2b231b]">Menşei</p>
            <p className="mt-2 text-[#6b5a43]">Gaziantep</p>
          </div>
          <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
            <p className="font-semibold text-[#2b231b]">Tür</p>
            <p className="mt-2 text-[#6b5a43]">Boz İç</p>
          </div>
          <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4">
            <p className="font-semibold text-[#2b231b]">Minimum sipariş</p>
            <p className="mt-2 text-[#6b5a43]">50 kg</p>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <button className="rounded-full bg-[#4f6b3c] px-5 py-3 font-semibold text-white">Alım Talebi Gönder</button>
          <button className="rounded-full border border-[#4f6b3c] px-5 py-3 font-semibold text-[#4f6b3c]">Satıcıyla İletişime Geç</button>
        </div>
      </div>
    </div>
  );
}
