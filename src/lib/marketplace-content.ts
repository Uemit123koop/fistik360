export interface AtlasPosition {
  column: number;
  row: number;
}

export interface ProductCategory extends AtlasPosition {
  name: string;
  description: string;
}

export interface PackageShowcase extends AtlasPosition {
  name: string;
  summary: string;
  items: string[];
  price: string;
}

export const productCategories: ProductCategory[] = [
  { name: "Fıstık", description: "Antep'in yeşil lezzeti", column: 0, row: 0 },
  { name: "Fındık", description: "Kavrulmuş ve çiğ", column: 1, row: 0 },
  { name: "Ceviz", description: "Taze iç ceviz", column: 2, row: 0 },
  { name: "Badem", description: "Doğal ve kavrulmuş", column: 3, row: 0 },
  { name: "Kaju", description: "Kremamsı ve iri", column: 0, row: 1 },
  { name: "Leblebi", description: "Çıtır atıştırmalık", column: 1, row: 1 },
  { name: "Çekirdek", description: "Ay ve kabak çekirdeği", column: 2, row: 1 },
  { name: "Kuru Meyve", description: "İncir, kayısı ve üzüm", column: 3, row: 1 },
];

export const packageShowcase: PackageShowcase[] = [
  {
    name: "2 Kişilik Paket",
    summary: "Akşam keyfine ölçülü bir seçki",
    items: ["250 g Antep Fıstığı", "250 g Badem"],
    price: "420 TL",
    column: 0,
    row: 0,
  },
  {
    name: "4 Kişilik Paket",
    summary: "Sohbet sofraları için dört çeşit",
    items: ["250 g Fıstık", "250 g Badem", "250 g Kaju", "250 g Fındık"],
    price: "690 TL",
    column: 1,
    row: 0,
  },
  {
    name: "Aile Paketi",
    summary: "Evde herkesin sevdiği dengeli karışım",
    items: ["500 g Antep Fıstığı", "500 g Badem", "250 g Kaju", "1 kg Karışık Kuruyemiş"],
    price: "1.480 TL",
    column: 2,
    row: 0,
  },
  {
    name: "Misafir Paketi",
    summary: "Sunuma hazır, zarif ve zengin",
    items: ["500 g Karışık Kuruyemiş", "250 g Kuru Meyve", "250 g Draje"],
    price: "860 TL",
    column: 0,
    row: 1,
  },
  {
    name: "Düğün Paketi",
    summary: "Kalabalık davetler için bol seçenek",
    items: ["2 kg Antep Fıstığı", "2 kg Karışık Kuruyemiş", "1 kg Badem"],
    price: "3.250 TL",
    column: 1,
    row: 1,
  },
  {
    name: "Ofis Paketi",
    summary: "Paylaşması kolay porsiyonlu atıştırmalıklar",
    items: ["10 × 100 g Karışık", "10 × 50 g Kuru Meyve"],
    price: "1.190 TL",
    column: 2,
    row: 1,
  },
];
