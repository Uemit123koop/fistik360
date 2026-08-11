export interface DemoCatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  defaultQuantity: number;
  defaultUnit: "gram" | "kg" | "adet" | "paket";
  basePrice: number;
}

export interface DemoSellerProduct extends DemoCatalogProduct {
  active: boolean;
  inStock: boolean;
  quantity: number;
  unit: "gram" | "kg" | "adet" | "paket";
  price: number;
}

export interface DemoSellerPackage {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  active: boolean;
  contents: string[];
}

export interface DemoSeller {
  slug: string;
  storeId: string;
  name: string;
  initials: string;
  description: string;
  provinceId: string;
  province: string;
  districtId: string;
  district: string;
  neighborhoodId: string;
  neighborhood: string;
  accent: string;
  deliveryMinutes: string;
  minimumOrder: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  catalogOffset: number;
  packages: DemoSellerPackage[];
}

const catalogRows: Array<[string, string, string, string, number]> = [
  ["antep-fistigi-kavrulmus", "Kavrulmuş Antep Fıstığı", "Kuruyemişler", "Kabuklu ve özenle günlük kavrulmuş Antep fıstığı.", 189],
  ["antep-fistigi-cig", "Çiğ Antep Fıstığı", "Kuruyemişler", "Doğal, çiğ ve seçilmiş Antep fıstığı.", 179],
  ["antep-fistigi-ici", "Antep Fıstığı İçi", "Kuruyemişler", "Tatlı ve mutfak kullanımı için seçilmiş iç fıstık.", 279],
  ["badem-kavrulmus", "Kavrulmuş Badem", "Kuruyemişler", "Çıtır kıvamda, dengeli tuzlu kavrulmuş badem.", 149],
  ["badem-cig", "Çiğ Badem", "Kuruyemişler", "Katkısız ve doğal çiğ badem.", 139],
  ["findik-kavrulmus", "Kavrulmuş Fındık", "Kuruyemişler", "Karadeniz fındığı, günlük kavrulmuş.", 159],
  ["findik-cig", "Çiğ Fındık", "Kuruyemişler", "Doğal çiğ iç fındık.", 149],
  ["kaju-kavrulmus", "Kavrulmuş Kaju", "Kuruyemişler", "Hafif tuzlu, iri taneli kavrulmuş kaju.", 169],
  ["kaju-cig", "Çiğ Kaju", "Kuruyemişler", "Doğal ve katkısız çiğ kaju.", 159],
  ["ceviz-ici", "Ceviz İçi", "Kuruyemişler", "Seçilmiş kelebek ceviz içi.", 145],
  ["yer-fistigi-tuzlu", "Tuzlu Yer Fıstığı", "Kuruyemişler", "Kavrulmuş, çıtır tuzlu yer fıstığı.", 69],
  ["yer-fistigi-tuzsuz", "Tuzsuz Yer Fıstığı", "Kuruyemişler", "Tuz eklenmeden kavrulmuş yer fıstığı.", 69],
  ["sari-leblebi", "Sarı Leblebi", "Kuruyemişler", "Geleneksel, iri taneli sarı leblebi.", 59],
  ["beyaz-leblebi", "Beyaz Leblebi", "Kuruyemişler", "Çıtır ve taze beyaz leblebi.", 64],
  ["soslu-misir", "Soslu Mısır", "Atıştırmalıklar", "Baharatlı ve çıtır soslu mısır.", 55],
  ["kabak-cekirdegi", "Kabak Çekirdeği", "Çekirdekler", "Seçilmiş ve dengeli tuzlanmış kabak çekirdeği.", 89],
  ["ay-cekirdegi-tuzlu", "Tuzlu Ay Çekirdeği", "Çekirdekler", "Günlük kavrulmuş tuzlu ay çekirdeği.", 49],
  ["ay-cekirdegi-tuzsuz", "Tuzsuz Ay Çekirdeği", "Çekirdekler", "Tuz eklenmeden kavrulmuş ay çekirdeği.", 49],
  ["karisik-kuruyemis-klasik", "Klasik Karışık Kuruyemiş", "Karışımlar", "Günlük tüketime uygun klasik karışım.", 119],
  ["karisik-kuruyemis-luks", "Lüks Karışık Kuruyemiş", "Karışımlar", "Premium kuruyemişlerden hazırlanan özel karışım.", 179],
  ["kokteyl-kuruyemis", "Kokteyl Kuruyemiş", "Karışımlar", "Dengeli ve çıtır kokteyl karışımı.", 129],
  ["kuru-kayisi", "Kuru Kayısı", "Kuru Meyveler", "Doğal kurutulmuş Malatya kayısısı.", 109],
  ["gun-kurusu-kayisi", "Gün Kurusu Kayısı", "Kuru Meyveler", "Güneşte kurutulmuş geleneksel gün kurusu.", 119],
  ["kuru-incir", "Kuru İncir", "Kuru Meyveler", "Yumuşak dokulu seçilmiş Aydın inciri.", 129],
  ["cekirdeksiz-kuru-uzum", "Çekirdeksiz Kuru Üzüm", "Kuru Meyveler", "Doğal tatlı çekirdeksiz kuru üzüm.", 79],
  ["hurma", "Hurma", "Kuru Meyveler", "Yumuşak ve doğal tatlı hurma.", 89],
  ["medine-hurmasi", "Medine Hurması", "Kuru Meyveler", "İri ve seçilmiş Medine hurması.", 139],
  ["kuru-dut", "Kuru Dut", "Kuru Meyveler", "Doğal kurutulmuş beyaz dut.", 99],
  ["kuru-erik", "Kuru Erik", "Kuru Meyveler", "Yumuşak dokulu çekirdeksiz kuru erik.", 94],
  ["turna-yemisi", "Turna Yemişi", "Kuru Meyveler", "Kurutulmuş turna yemişi.", 109],
  ["kuru-mango", "Kuru Mango", "Kuru Meyveler", "Dilimlenmiş tropikal kuru mango.", 119],
  ["kuru-ananas", "Kuru Ananas", "Kuru Meyveler", "Dilimlenmiş kuru ananas.", 119],
  ["kuru-elma", "Kuru Elma", "Kuru Meyveler", "İnce dilim doğal kuru elma.", 79],
  ["pestil", "Meyve Pestili", "Yöresel Lezzetler", "Geleneksel meyve pestili.", 89],
  ["cevizli-sucuk", "Cevizli Sucuk", "Yöresel Lezzetler", "Ceviz ve üzüm şırasıyla hazırlanan yöresel lezzet.", 119],
  ["lokum-sade", "Sade Lokum", "Lokum ve Şekerleme", "Geleneksel, yumuşak sade lokum.", 69],
  ["lokum-gullu", "Güllü Lokum", "Lokum ve Şekerleme", "Gül aromalı geleneksel lokum.", 79],
  ["lokum-antep-fistikli", "Antep Fıstıklı Lokum", "Lokum ve Şekerleme", "Bol Antep fıstıklı lokum.", 139],
  ["lokum-cifte-kavrulmus", "Çifte Kavrulmuş Lokum", "Lokum ve Şekerleme", "Yoğun fıstıklı çifte kavrulmuş lokum.", 159],
  ["lokum-narli", "Narlı Lokum", "Lokum ve Şekerleme", "Nar aromalı yumuşak lokum.", 89],
  ["lokum-kadayifli", "Kadayıflı Lokum", "Lokum ve Şekerleme", "Kadayıf kaplı dolgulu lokum.", 129],
  ["draje-badem", "Çikolatalı Badem Draje", "Draje ve Çikolata", "Sütlü çikolata kaplı badem draje.", 109],
  ["draje-findik", "Çikolatalı Fındık Draje", "Draje ve Çikolata", "Sütlü çikolata kaplı fındık draje.", 105],
  ["kahve-cekirdegi", "Kahve Çekirdeği", "Kahve", "Taze kavrulmuş kahve çekirdeği.", 129],
  ["turk-kahvesi", "Türk Kahvesi", "Kahve", "İnce çekilmiş geleneksel Türk kahvesi.", 99],
];

export const DEMO_CATALOG: DemoCatalogProduct[] = catalogRows.map(
  ([slug, name, category, description, basePrice], index) => ({
    id: `demo-catalog-${String(index + 1).padStart(2, "0")}`,
    slug,
    name,
    category,
    description,
    defaultQuantity: 250,
    defaultUnit: "gram",
    basePrice,
  }),
);

function packages(prefix: string, localName: string): DemoSellerPackage[] {
  return [
    { id: `${prefix}-aile`, name: "Aile Keyif Paketi", type: "Aile", description: "Film geceleri ve kalabalık sofralar için dengeli seçki.", price: 549, active: true, contents: ["Klasik Karışık Kuruyemiş 500 g", "Kuru Kayısı 250 g", "Tuzlu Ay Çekirdeği 250 g"] },
    { id: `${prefix}-ofis`, name: "Ofis Enerji Paketi", type: "Ofis", description: "Paylaşması kolay, porsiyonlanmış çalışma arası paketi.", price: 429, active: true, contents: ["Çiğ Badem 250 g", "Kaju 250 g", "Kuru Üzüm 250 g"] },
    { id: `${prefix}-hediye`, name: `${localName} Hediye Kutusu`, type: "Hediye", description: "Lokum, draje ve premium kuruyemişlerden şık sunum.", price: 749, active: true, contents: ["Fıstıklı Lokum 300 g", "Badem Draje 250 g", "Antep Fıstığı 250 g"] },
    { id: `${prefix}-fit`, name: "Fit Atıştırmalık Paketi", type: "Fit", description: "Çiğ kuruyemiş ve kuru meyve ağırlıklı katkısız seçki.", price: 479, active: true, contents: ["Çiğ Badem 250 g", "Ceviz İçi 250 g", "Kuru Elma 200 g"] },
  ];
}

export const DEMO_SELLERS: DemoSeller[] = [
  {
    slug: "fistikci-mehmet",
    storeId: "demo-fistikci-mehmet",
    name: "Fıstıkçı Mehmet",
    initials: "FM",
    description: "Caferağa'da günlük kavrulan kuruyemişler, taze lokumlar ve mahalleye özel hızlı teslimat.",
    provinceId: "34", province: "İstanbul", districtId: "1421", district: "Kadıköy", neighborhoodId: "40512", neighborhood: "Caferağa",
    accent: "#166534", deliveryMinutes: "25–35 dk", minimumOrder: 250, freeDeliveryThreshold: 650, deliveryFee: 39, catalogOffset: 0,
    packages: packages("fm", "Caferağa"),
  },
  {
    slug: "cankaya-kuruyemis",
    storeId: "demo-cankaya-kuruyemis",
    name: "Çankaya Kuruyemiş",
    initials: "ÇK",
    description: "Bahçelievler'e taze kuruyemiş, kuru meyve ve ofis paketleri ulaştıran yeni nesil mahalle dükkânı.",
    provinceId: "6", province: "Ankara", districtId: "1231", district: "Çankaya", neighborhoodId: "1526", neighborhood: "Bahçelievler",
    accent: "#9a3412", deliveryMinutes: "30–40 dk", minimumOrder: 225, freeDeliveryThreshold: 600, deliveryFee: 35, catalogOffset: 4,
    packages: packages("ck", "Bahçelievler"),
  },
  {
    slug: "bostanli-lezzet",
    storeId: "demo-bostanli-lezzet",
    name: "Bostanlı Lezzet Durağı",
    initials: "BL",
    description: "Bostanlı'da premium karışımlar, kuru meyveler ve güne enerji katan taze seçkiler.",
    provinceId: "35", province: "İzmir", districtId: "1448", district: "Karşıyaka", neighborhoodId: "41108", neighborhood: "Bostanlı",
    accent: "#0f766e", deliveryMinutes: "20–30 dk", minimumOrder: 275, freeDeliveryThreshold: 700, deliveryFee: 42, catalogOffset: 8,
    packages: packages("bl", "Bostanlı"),
  },
  {
    slug: "karatas-fistik-evi",
    storeId: "demo-karatas-fistik-evi",
    name: "Karataş Fıstık Evi",
    initials: "KF",
    description: "Gaziantep'ten bol fıstıklı lokumlar, yöresel lezzetler ve seçilmiş Antep fıstığı.",
    provinceId: "27", province: "Gaziantep", districtId: "1841", district: "Şahinbey", neighborhoodId: "30435", neighborhood: "Karataş",
    accent: "#7c2d12", deliveryMinutes: "25–40 dk", minimumOrder: 200, freeDeliveryThreshold: 550, deliveryFee: 30, catalogOffset: 12,
    packages: packages("kf", "Karataş"),
  },
  {
    slug: "ozluce-lokum",
    storeId: "demo-ozluce-lokum",
    name: "Özlüce Lokum & Kuruyemiş",
    initials: "ÖL",
    description: "Özlüce'ye özel lokum kutuları, çikolatalı drajeler ve taze kuruyemiş çeşitleri.",
    provinceId: "16", province: "Bursa", districtId: "1829", district: "Nilüfer", neighborhoodId: "11115", neighborhood: "Özlüce",
    accent: "#6b21a8", deliveryMinutes: "30–45 dk", minimumOrder: 250, freeDeliveryThreshold: 650, deliveryFee: 38, catalogOffset: 16,
    packages: packages("ol", "Özlüce"),
  },
];

export function getDemoSeller(slugOrId: string) {
  return DEMO_SELLERS.find((seller) => seller.slug === slugOrId || seller.storeId === slugOrId) ?? null;
}

export function getInitialDemoProducts(seller: DemoSeller): DemoSellerProduct[] {
  return DEMO_CATALOG.map((product, index) => {
    const active = (index + seller.catalogOffset) % 3 !== 0;
    const priceDelta = (seller.catalogOffset % 5) * 3 + (index % 4) * 2;
    return {
      ...product,
      active,
      inStock: true,
      quantity: product.defaultQuantity,
      unit: product.defaultUnit,
      price: product.basePrice + priceDelta,
    };
  });
}

export const DEMO_STORAGE_PREFIX = "fistik360-demo-seller-v1:";
export const DEMO_CART_KEY = "fistik360-demo-cart-v1";

