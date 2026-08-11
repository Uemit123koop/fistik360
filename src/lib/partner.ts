export const PARTNER_CATEGORIES = [
  "Antep Fıstığı", "Siirt Fıstığı", "Fındık", "Badem", "Ceviz",
  "Kaju", "Çekirdek", "Leblebi", "Kuru Meyve", "Hurma", "Lokum",
  "Draje", "Çikolatalı Ürünler", "Karışık Kuruyemiş", "Diğer",
] as const;

export const PARTNER_APPLICATION_STATUSES = [
  "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED",
] as const;

export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

export const partnerStatusLabels: Record<PartnerApplicationStatus, string> = {
  PENDING: "Başvuru alındı",
  UNDER_REVIEW: "İnceleniyor",
  APPROVED: "Onaylandı",
  REJECTED: "Uygun bulunmadı",
  SUSPENDED: "Askıya alındı",
};

export function slugifyBrand(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function assetPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = base.startsWith("http") ? base : `https://${base}`;
  return `${url}/storage/v1/object/public/partner-assets/${path}`;
}
