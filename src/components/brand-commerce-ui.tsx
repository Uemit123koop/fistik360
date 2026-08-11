import Link from "next/link";
import { ArrowIcon, ShieldIcon } from "@/components/marketplace-ui";
import { assetPublicUrl } from "@/lib/partner";

export interface PublicBrand { id: string; name: string; slug: string; description: string; logo_path: string | null; cover_path: string | null; }

export function BrandCard({ brand }: { brand: PublicBrand }) {
  const cover = assetPublicUrl(brand.cover_path);
  const logo = assetPublicUrl(brand.logo_path);
  return (
    <article className="group overflow-hidden border border-[var(--color-border)] bg-white transition-colors duration-200 hover:border-[var(--color-primary-light)]">
      <Link href={`/marka/${brand.slug}`} className="block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-primary)]">
        <div className="relative aspect-[16/9] bg-[var(--color-surface-strong)] bg-cover bg-center" style={cover ? { backgroundImage: `url(${JSON.stringify(cover)})` } : undefined}>
          {!cover && <div className="grid h-full place-items-center font-serif text-6xl font-bold text-[var(--color-primary)]">{brand.name.slice(0, 1)}</div>}
          <div className="absolute -bottom-8 left-5 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-white bg-white font-serif text-2xl font-bold text-[var(--color-primary-dark)] shadow-md" style={logo ? { backgroundImage: `url(${JSON.stringify(logo)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{!logo && brand.name.slice(0, 1)}</div>
        </div>
        <div className="px-5 pb-5 pt-11">
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold">{brand.name}</h2><ShieldIcon className="h-4 w-4 text-[var(--color-primary)]" /></div>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[var(--color-muted-text)]">{brand.description}</p>
          <span className="text-link mt-4">Markayı keşfet <ArrowIcon /></span>
        </div>
      </Link>
    </article>
  );
}
