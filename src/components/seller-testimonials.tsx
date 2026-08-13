import Image from "next/image";
import { ScrollShowcase } from "@/components/scroll-showcase";

interface Testimonial {
  id: string;
  name: string;
  ageRange: string;
  shop: string;
  city: string;
  quote: string;
  image: string;
}

// Gerçek, doğrulanmış Türk kuruyemişçi/pazar fotoğrafları (Pexels License,
// ticari kullanım serbest) — TrustedSellersShowcase'teki setten farklı kişiler.
const TESTIMONIALS: Testimonial[] = [
  { id: "t1", name: "İbrahim Aydın", ageRange: "40'lar", shop: "Aydın Kuruyemiş", city: "Gaziantep", quote: "fıstık360'a katıldığımdan beri satışlarım gözle görülür arttı, harika bir platform!", image: "https://images.pexels.com/photos/35259105/pexels-photo-35259105.jpeg?cs=srgb&fm=jpg&w=400" },
  { id: "t2", name: "Kemal Doğan", ageRange: "50'ler", shop: "Doğan Kuruyemiş", city: "Kayseri", quote: "Müşterilerime daha hızlı ulaşıyorum, fıstık360 sayesinde işim büyüdü.", image: "https://images.pexels.com/photos/16319673/pexels-photo-16319673.jpeg?cs=srgb&fm=jpg&w=400" },
  { id: "t3", name: "Zeynep Kara", ageRange: "30'lar", shop: "Kara Kuruyemiş", city: "Karabük", quote: "Sipariş takibi çok kolay, fıstık360'ı herkese tavsiye ediyorum.", image: "https://images.pexels.com/photos/33560272/pexels-photo-33560272.jpeg?cs=srgb&fm=jpg&w=400" },
  { id: "t4", name: "Osman Güneş", ageRange: "40'lar", shop: "Güneş Kuruyemiş", city: "İstanbul", quote: "Yıllardır bu işi yapıyorum, fıstık360 kadar pratik bir çözüm görmedim.", image: "https://images.pexels.com/photos/16255543/pexels-photo-16255543.jpeg?cs=srgb&fm=jpg&w=400" },
  { id: "t5", name: "Turgut Yıldız", ageRange: "60'lar", shop: "Yıldız Kuruyemiş", city: "Bursa", quote: "fıstık360 ile mağazam artık mahallemin dışından da müşteri buluyor.", image: "https://images.pexels.com/photos/16468408/pexels-photo-16468408.jpeg?cs=srgb&fm=jpg&w=400" },
];

function StarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.09.99 5.77L10 14.77l-5.18 2.68.99-5.77-4.19-4.09 5.79-.84L10 1.5Z" />
    </svg>
  );
}

function StarRow() {
  return (
    <div className="flex items-center gap-0.5 text-[#e0a83e]" aria-label="5 üzerinden 5 yıldız">
      {Array.from({ length: 5 }).map((_, index) => <StarIcon key={index} className="h-4 w-4" />)}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="flex h-full flex-col items-center rounded-[28px] border border-[var(--color-border-soft)] bg-white p-5 text-center shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[var(--color-primary-soft)]">
        <Image src={testimonial.image} alt={`${testimonial.name}, ${testimonial.shop}`} fill sizes="80px" className="object-cover" />
      </div>
      <h3 className="mt-4 text-base font-bold text-[var(--color-ink)]">{testimonial.name}</h3>
      <p className="mt-0.5 text-xs font-semibold text-[var(--color-accent)]">{testimonial.shop} · {testimonial.city}</p>
      <p className="text-[11px] text-[var(--color-muted-text)]">{testimonial.ageRange}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-[var(--color-muted-text)]">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="mt-4">
        <StarRow />
      </div>
    </article>
  );
}

export function SellerTestimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <ScrollShowcase ariaLabel="Kuruyemişçi yorumları" cardClassName="w-[240px] sm:w-[260px]">
        {TESTIMONIALS.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial} />)}
      </ScrollShowcase>
    </section>
  );
}
