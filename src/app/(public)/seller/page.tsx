import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function SellerPage() {
  const user = await getServerUser();
  if (user?.role === "NUT_STORE") redirect("/dashboard/store");

  return (
    <div className="bg-[#f7f4ec]">
      <section className="bg-[#153b2e] text-white"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#d6e5b8]">Fıstık360 seller deneyimi</p><h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight sm:text-6xl">Mahalleni seç, katalogdan fiyatlandır, mağazanı yayınla.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Katalogdan ürün seç; gramaj, birim ve fiyatını belirle, paketlerini hazırla ve mahalle mağazanı yayınla.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/magaza-ac" className="button-primary">Mağaza kaydı</Link><Link href="/mahalle" className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-5 font-bold hover:bg-white/10">Mahalle seçimi</Link></div></div></section>
    </div>
  );
}
