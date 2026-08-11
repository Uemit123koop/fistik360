export const SELLER_TYPES = ["NUT_STORE", "WHOLESALE_SELLER"] as const;

export type SellerType = (typeof SELLER_TYPES)[number];

export const SELLER_TYPE_CONTENT: Record<
  SellerType,
  { title: string; shortTitle: string; description: string; destination: string }
> = {
  NUT_STORE: {
    title: "Kuruyemişçiyim",
    shortTitle: "Kuruyemişçi",
    description: "Mahallendeki tüketicilere ürün ve paketlerini sun, siparişlerini tek panelden yönet.",
    destination: "Mahalle pazarı",
  },
  WHOLESALE_SELLER: {
    title: "Toptancıyım",
    shortTitle: "Toptancı",
    description: "Kuruyemiş, lokum, kuru meyve ve diğer ürünlerini kuruyemişçilere toptan sun.",
    destination: "Toptan pazar",
  },
};

export const WHOLESALE_CATEGORIES = [
  "Kuruyemiş",
  "Lokum",
  "Kuru Meyve",
  "Draje ve Çikolata",
  "Çekirdek ve Tohum",
  "Baharat",
  "Kahve",
  "Diğer",
] as const;

export const SELLER_AGREEMENT_VERSIONS = {
  kvkk: "kvkk-2026-08",
  privacy: "privacy-2026-08",
} as const;

export function isSellerType(value: unknown): value is SellerType {
  return typeof value === "string" && SELLER_TYPES.includes(value as SellerType);
}

