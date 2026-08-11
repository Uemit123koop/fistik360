import type { Metadata } from "next";
import { PartnerApplicationForm } from "@/components/partner-application-form";

export const metadata: Metadata = {
  title: "Partner Başvurusu | Fıstık360",
  description: "Markanızı Fıstık360 partner programına taşıyın.",
};

export default function PartnerApplyPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-7 max-w-3xl"><p className="eyebrow">Partner başvurusu</p><h1 className="section-title">Markanı dört kısa adımda tanıtalım.</h1><p className="section-description">Yalnız değerlendirme için gereken bilgileri istiyoruz. Resmî belgelerin herkese açık olmaz.</p></div>
      <PartnerApplicationForm />
    </section>
  );
}
