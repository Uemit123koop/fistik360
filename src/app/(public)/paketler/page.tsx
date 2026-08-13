import type { Metadata } from "next";
import Link from "next/link";
import { BundleReveal } from "@/components/bundle-reveal";
import { ArrowIcon } from "@/components/marketplace-ui";

export const metadata: Metadata = {
  title: "Toplu Paketler | Fıstık360",
  description: "10, 50 ve 100 kg toptan kuruyemiş bundle'ları — mahalle bakkalından zincir markete kadar her hacimde tedarik.",
};

export default function BulkBundlesPage() {
  return (
    <div>
      <section className="bg-[var(--color-surface-strong)]">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <p className="eyebrow">Toptan tedarik</p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-[-0.02em] text-[var(--color-ink)] sm:text-5xl">
            Hacmini seç, içindekileri gör.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted-text)]">
            10, 50 ve 100 kg&apos;lık hazır kuruyemiş bundle&apos;ları — mahalle bakkalından zincir markete kadar her ölçekte tek
            tedarikçiyle çalış. Aşağıdaki paketi aç, içeriğini gör, hacmini seç.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <BundleReveal />
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-[var(--color-muted-text)]">
          Gösterilen karışım oranı sabittir; özel içerik/oran talepleri için toptan ekibimizle iletişime geçebilirsin.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/sayfalar/iletisim" className="text-link">
            Özel karışım talep et <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
