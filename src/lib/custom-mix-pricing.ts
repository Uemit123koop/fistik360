export type WeighableUnit = "gram" | "kg" | "adet";

// Yalnızca gramaj/kilogram bazlı ürünler karışıma uygun; adet bazlı ürünler
// için gram başı fiyat tanımsızdır.
export function pricePerGram(price: number, quantity: number, unit: WeighableUnit): number | null {
  if (unit === "adet") return null;
  const grams = unit === "kg" ? quantity * 1000 : quantity;
  if (!(grams > 0)) return null;
  return price / grams;
}

export function mixLineTotal(pricePerGramValue: number, grams: number): number {
  return Math.round(pricePerGramValue * grams * 100) / 100;
}
