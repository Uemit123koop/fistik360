import Link from "next/link";

const provinces = [
  { name: "İstanbul", districts: ["Kadıköy", "Beşiktaş", "Üsküdar"] },
  { name: "Ankara", districts: ["Çankaya", "Keçiören"] },
  { name: "Gaziantep", districts: ["Şehitkamil", "Şahinbey"] },
];

export default function NeighborhoodPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Mahalle seçimi</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">İl, ilçe ve mahalle seçerek yakınınızdaki mağazaları görün</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {provinces.map((province) => (
          <div key={province.name} className="rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{province.name}</h2>
            <div className="mt-4 space-y-3">
              {province.districts.map((district) => (
                <Link key={district} href="/magazalar" className="block rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-3 text-sm font-medium text-[#4f6b3c]">
                  {district}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
