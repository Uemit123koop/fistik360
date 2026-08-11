import Link from "next/link";
import { ArrowIcon, AtlasImage, PackageIcon, ShieldIcon } from "@/components/marketplace-ui";

const steps = [
  ["01", "Başvur", "Markanı ve işletmeni bize tanıt."],
  ["02", "Ürünlerini ekle", "Onaylandıktan sonra ürünlerini Fıstık360'a ekle."],
  ["03", "Sipariş al", "Müşteriler ürünlerini Fıstık360 üzerinden satın alsın."],
  ["04", "Kargola", "Siparişi kendi depondan hazırlayıp müşteriye gönder."],
];

export default function PartnerPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
          <div>
            <p className="eyebrow">Fıstık360 Partner Programı</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold leading-[1.03] tracking-[-.04em] text-[var(--color-ink)] sm:text-6xl">Markanı Fıstık360&apos;a taşı.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--color-muted-text)] sm:text-lg">Ürünlerini Türkiye&apos;nin dört bir yanındaki müşterilere ulaştır. Siparişleri Fıstık360&apos;dan al, kendi depondan gönder.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/partner/apply" className="button-primary">Partner başvurusu yap <ArrowIcon /></Link>
              <Link href="#nasil-calisir" className="button-secondary">Nasıl çalışır?</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--color-border-soft)] pt-6 text-sm font-semibold text-[var(--color-muted-text)]">
              <span className="inline-flex items-center gap-2"><ShieldIcon className="text-[var(--color-primary)]" /> Seçili ve doğrulanmış markalar</span>
              <span className="inline-flex items-center gap-2"><PackageIcon className="text-[var(--color-primary)]" /> Gönderim markanın kendi deposundan</span>
            </div>
          </div>
          <div className="overflow-hidden border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
            <AtlasImage atlas="package" column={1} row={0} alt="Türkiye geneline gönderilecek premium kuruyemiş paketi" className="aspect-[4/3]" sizes="(max-width: 1024px) 100vw, 620px" />
            <div className="border-t border-[var(--color-border-soft)] p-5 sm:p-6">
              <p className="font-serif text-2xl font-bold">Yeni satış kanalın, aynı depon.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Fıstık360 müşteriyi markanla buluşturur; ürünü sen hazırlar ve kargolarsın.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="nasil-calisir" className="scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Nasıl çalışır?</p>
          <h2 className="section-title max-w-2xl">Başvurudan gönderime dört net adım.</h2>
          <div className="mt-9 grid gap-0 border-y border-[var(--color-border)] md:grid-cols-4">
            {steps.map(([number, title, copy]) => (
              <article key={number} className="border-b border-[var(--color-border-soft)] py-7 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0">
                <span className="font-serif text-3xl font-bold text-[var(--color-accent)]">{number}</span>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--color-border-soft)] bg-[var(--color-surface-strong)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="eyebrow">Kendi markan, kendi gönderimin</p>
            <h2 className="section-title max-w-3xl">Fıstık360 satış kanalın olur; depo ve kargo yönetimi sende kalır.</h2>
            <p className="section-description">Bu MVP bir depo yönetimi veya muhasebe sistemi değildir. Markanı, ürünlerini ve gelen siparişlerini anlaşılır bir akışta yönetmen için tasarlanmıştır.</p>
          </div>
          <Link href="/partner/apply" className="button-primary">Başvuruyu başlat <ArrowIcon /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-muted-text)]"><strong className="text-[var(--color-ink)]">Gelecek vizyonu:</strong> İleride seçili markalar için Fıstık360 lojistik çözümleri değerlendirilebilir. Bu hizmet bugün aktif değildir.</p>
      </section>
    </div>
  );
}
