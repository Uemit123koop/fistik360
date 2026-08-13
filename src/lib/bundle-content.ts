export type IngredientId =
  | "antep-fistigi"
  | "kaju"
  | "badem"
  | "findik"
  | "kabak-cekirdegi"
  | "kuru-kayisi"
  | "kuru-incir"
  | "ceviz-ici";

export interface BundleIngredient {
  id: IngredientId;
  name: string;
  grams: number;
}

export interface BundleTier {
  id: string;
  label: string;
  weightKg: number;
  priceLabel: string;
  tagline: string;
  ingredients: BundleIngredient[];
}

const baseRecipe: Array<{ id: IngredientId; name: string; share: number }> = [
  { id: "antep-fistigi", name: "Antep Fıstığı", share: 0.2 },
  { id: "kaju", name: "Kaju", share: 0.15 },
  { id: "badem", name: "Badem", share: 0.15 },
  { id: "findik", name: "Fındık", share: 0.15 },
  { id: "kabak-cekirdegi", name: "Kabak Çekirdeği", share: 0.1 },
  { id: "kuru-kayisi", name: "Kuru Kayısı", share: 0.1 },
  { id: "kuru-incir", name: "Kuru İncir", share: 0.075 },
  { id: "ceviz-ici", name: "Ceviz İçi", share: 0.075 },
];

function buildTier(id: string, weightKg: number, label: string, priceLabel: string, tagline: string): BundleTier {
  const totalGrams = weightKg * 1000;
  return {
    id,
    label,
    weightKg,
    priceLabel,
    tagline,
    ingredients: baseRecipe.map((item) => ({
      id: item.id,
      name: item.name,
      grams: Math.round((totalGrams * item.share) / 10) * 10,
    })),
  };
}

export const bundleTiers: BundleTier[] = [
  buildTier("10kg", 10, "10 KG", "8.900 TL", "Mahalle bakkalları ve küçük işletmeler için başlangıç hacmi"),
  buildTier("50kg", 50, "50 KG", "42.500 TL", "Kafe, ofis ve orta ölçekli marketler için haftalık tedarik"),
  buildTier("100kg", 100, "100 KG", "79.900 TL", "Zincir mağaza ve toptan alıcılar için tam palet hacmi"),
];

export const homeBundleTiers: BundleTier[] = [
  buildTier("home-10kg", 10, "10 KG", "8.900 TL", "Küçük işletmeler için başlangıç hacmi"),
  buildTier("home-20kg", 20, "20 KG", "16.900 TL", "Kafe ve ofisler için haftalık tedarik"),
  buildTier("home-50kg", 50, "50 KG", "42.500 TL", "Marketler için toplu tedarik"),
];

export function formatGrams(value: number) {
  if (value >= 1000) {
    const kg = value / 1000;
    return `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg`;
  }
  return `${value} g`;
}
