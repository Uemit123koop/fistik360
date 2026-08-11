import Link from "next/link";
import { AtlasImage, MapPinIcon } from "@/components/marketplace-ui";
import { PublicNeighborhoodFinder } from "@/components/turkey-location-fields";

export default function NeighborhoodPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="eyebrow">Mahalle seçimi</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl font-bold leading-tight tracking-[-0.025em] text-[var(--color-ink)] sm:text-5xl">Taze kuruyemişi mahallende bul.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--color-muted-text)]">İl, ilçe ve mahalleni seç; sana teslimat yapan yerel kuruyemişçileri tek adımda keşfet.</p>
          <div className="mt-7 grid max-w-lg grid-cols-3 gap-3">
            {[{ value: "81", label: "il" }, { value: "Tümü", label: "ilçeler" }, { value: "32 bin+", label: "mahalle" }].map((stat) => (
              <div key={stat.label} className="rounded-[16px] border border-[var(--color-border)] bg-white p-4 text-center shadow-[var(--shadow-card)]">
                <p className="text-xl font-bold tabular-nums text-[var(--color-primary-dark)]">{stat.value}</p>
                <p className="mt-1 text-xs text-[var(--color-muted-text)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
          <AtlasImage atlas="category" column={0} row={0} alt="Mahalle seçimi için Antep fıstığı görseli" className="aspect-[16/6]" sizes="(max-width: 1024px) 100vw, 600px" />
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"><MapPinIcon className="h-5 w-5" /></span>
              <div><h2 className="text-xl font-bold text-[var(--color-ink)]">Teslimat konumun</h2><p className="text-sm text-[var(--color-muted-text)]">Seçimini daha sonra değiştirebilirsin.</p></div>
            </div>
            <PublicNeighborhoodFinder />
          </div>
        </div>
      </div>
      <div className="mt-8 text-center text-sm text-[var(--color-muted-text)]">Konum seçmeden de <Link href="/magazalar" className="font-bold text-[var(--color-primary)] underline-offset-4 hover:underline">tüm mağazaları inceleyebilirsin</Link>.</div>
    </div>
  );
}
