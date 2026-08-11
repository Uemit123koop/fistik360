import { notFound } from "next/navigation";
import { getActivePartner } from "@/lib/partner-auth";

export default async function PartnerSettingsPage() {
  const access = await getActivePartner();
  if (!access) notFound();
  return <div><p className="eyebrow">Ayarlar</p><h1 className="mt-2 text-3xl font-bold">Gönderim ayarları</h1><div className="mt-7 border-y border-[var(--color-border)] py-6"><p className="data-label">Sipariş gönderimi</p><p className="mt-2 text-xl font-bold">Markanın kendi deposundan</p><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">Fıstık360&apos;dan gelen siparişi sen hazırlayıp müşteriye kargolarsın. Depo veya stok yönetimi Fıstık360 tarafından yapılmaz.</p></div></div>;
}
