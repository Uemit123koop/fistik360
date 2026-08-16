import "server-only";

import sharp from "sharp";

export const CATALOG_IMAGE_DRAFT_BUCKET = "catalog-product-image-drafts";
export const CATALOG_IMAGE_BUCKET = "catalog-product-images";
export const CATALOG_IMAGE_PROMPT_VERSION = "fistik360-catalog-v2";
export const MAX_GENERATED_IMAGE_BYTES = 20 * 1024 * 1024;

export interface CatalogProductPlacement {
  category: string;
  subcategorySlug: string | null;
  description: string;
}

const TURKISH_SLUG_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

export function slugifyCatalogProductName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (character) => TURKISH_SLUG_MAP[character] ?? character)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function includesAny(value: string, words: readonly string[]) {
  return words.some((word) => value.includes(word));
}

export function inferCatalogProductPlacement(name: string): CatalogProductPlacement {
  const normalized = name.toLocaleLowerCase("tr-TR");
  const description = `${name}, Fıstık360 merkezi ürün kataloğunda mağazaların fiyat ve stok bilgisiyle satışa sunabileceği üründür.`;

  const category = (subcategorySlug: string | null, flatCategory: string): CatalogProductPlacement => ({
    category: flatCategory,
    subcategorySlug,
    description,
  });

  if (includesAny(normalized, ["kahve", "espresso"])) {
    if (normalized.includes("türk")) return category("turk-kahvesi", "Kahve");
    if (normalized.includes("dibek")) return category("dibek-kahvesi", "Kahve");
    if (normalized.includes("menengiç")) return category("menengic-kahvesi", "Kahve");
    if (normalized.includes("damla sakız")) return category("damla-sakizli-kahve", "Kahve");
    if (normalized.includes("filtre")) return category("filtre-kahve", "Kahve");
    if (normalized.includes("espresso")) return category("espresso-kahvesi", "Kahve");
    return category("aromali-kahveler", "Kahve");
  }

  const spices: Array<[string, string]> = [
    ["pul biber", "pul-biber"], ["karabiber", "karabiber"], ["kekik", "kekik"],
    ["kimyon", "kimyon"], ["sumak", "sumak"], ["nane", "nane"],
    ["tarçın", "tarcin"], ["zerdeçal", "zerdecal"], ["köri", "kori"],
  ];
  const spice = spices.find(([keyword]) => normalized.includes(keyword));
  if (spice) return category(spice[1], "Baharatlar");
  if (includesAny(normalized, ["baharat", "kurutulmuş ot"])) {
    return category(normalized.includes("ot") ? "kurutulmus-otlar" : "karisim-baharatlar", "Baharatlar");
  }

  if (normalized.includes("lokum")) {
    if (includesAny(normalized, ["antep fıstık", "fıstıklı"])) return category("fistikli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("fındık")) return category("findikli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("ceviz")) return category("cevizli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("badem")) return category("bademli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("hindistan cevizi")) return category("hindistan-cevizli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("gül")) return category("gul-lokumu", "Lokum ve Şekerleme");
    if (includesAny(normalized, ["nar", "meyve"])) return category("meyveli-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("çikolata")) return category("cikolatali-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("fitil")) return category("fitil-lokum", "Lokum ve Şekerleme");
    if (includesAny(normalized, ["sarma", "kadayıf"])) return category("sarma-lokum", "Lokum ve Şekerleme");
    if (normalized.includes("kaymak")) return category("kaymakli-lokum", "Lokum ve Şekerleme");
    if (includesAny(normalized, ["çifte kavrulmuş", "premium"])) return category("premium-lokum", "Lokum ve Şekerleme");
    return category("sade-lokum", "Lokum ve Şekerleme");
  }

  if (includesAny(normalized, ["çikolata", "draje"])) {
    if (normalized.includes("draje")) return category("draje", "Draje ve Çikolata");
    if (normalized.includes("bitter")) return category("bitter-cikolata", "Draje ve Çikolata");
    if (normalized.includes("beyaz")) return category("beyaz-cikolata", "Draje ve Çikolata");
    if (normalized.includes("sütlü")) return category("sutlu-cikolata", "Draje ve Çikolata");
    if (normalized.includes("fıstık")) return category("fistikli-cikolata", "Draje ve Çikolata");
    if (normalized.includes("fındık")) return category("findikli-cikolata", "Draje ve Çikolata");
    if (normalized.includes("dolgulu")) return category("dolgulu-cikolata", "Draje ve Çikolata");
    return category("tablet-cikolata", "Draje ve Çikolata");
  }

  if (includesAny(normalized, ["şeker", "bonbon", "jelibon"])) {
    if (normalized.includes("akide")) return category("akide-sekeri", "Şekerleme");
    if (normalized.includes("badem")) return category("badem-sekeri", "Şekerleme");
    if (normalized.includes("bonbon")) return category("bonbon", "Şekerleme");
    if (normalized.includes("jelibon")) return category("jelibon", "Şekerleme");
    if (normalized.includes("nane")) return category("naneli-sekerleme", "Şekerleme");
    if (normalized.includes("meyve")) return category("meyveli-sekerleme", "Şekerleme");
    return category("dolgulu-sekerleme", "Şekerleme");
  }

  const driedFruits: Array<[readonly string[], string]> = [
    [["kayısı"], "kuru-kayisi"], [["incir"], "kuru-incir"], [["hurma"], "hurma"],
    [["üzüm"], "kuru-uzum"], [["erik"], "kuru-erik"], [["dut"], "kuru-dut"],
    [["elma"], "kuru-elma"], [["çilek"], "kuru-cilek"], [["mango"], "kuru-mango"],
    [["ananas"], "kuru-ananas"], [["muz"], "kuru-muz"],
  ];
  const driedFruit = driedFruits.find(([keywords]) => includesAny(normalized, keywords));
  if (driedFruit && includesAny(normalized, ["kuru", "kurusu", "gün kurusu", "hurma", "turna yemişi"])) {
    return category(driedFruit[1], "Kuru Meyveler");
  }
  if (includesAny(normalized, ["turna yemişi", "kuru meyve", "meyve cipsi"])) {
    return category("meyve-cipsleri", "Kuru Meyveler");
  }

  if (includesAny(normalized, ["pestil", "cezerye", "köme", "cevizli sucuk", "tahin", "pekmez", "bal", "helva"])) {
    const regional: Array<[string, string]> = [
      ["pestil", "pestil"], ["cezerye", "cezerye"], ["köme", "kome"], ["sucuk", "sucuk"],
      ["tahin", "tahin"], ["pekmez", "pekmez"], ["bal", "bal"], ["helva", "helva"],
    ];
    return category(regional.find(([keyword]) => normalized.includes(keyword))?.[1] ?? "yoresel-tatlilar", "Yöresel Lezzetler");
  }

  if (normalized.includes("ay çekirdeği")) return category("ay-cekirdegi", "Çekirdekler");
  if (normalized.includes("kabak çekirdeği")) return category("kabak-cekirdegi", "Çekirdekler");
  if (normalized.includes("çekirdek")) return category(normalized.includes("tuzsuz") ? "tuzsuz-cekirdek" : "tuzlu-cekirdek", "Çekirdekler");
  if (normalized.includes("soslu mısır")) return category("soslu-misir", "Atıştırmalıklar");
  if (normalized.includes("patlamış mısır")) return category("patlamis-misir", "Atıştırmalıklar");
  if (includesAny(normalized, ["atıştırmalık", "çıtır"])) return category("baharatli-atistirmalik", "Atıştırmalıklar");

  if (includesAny(normalized, ["karışık", "kokteyl", "mix"])) return category("karisik-kuruyemis", "Karışımlar");

  const nuts: Array<[readonly string[], string]> = [
    [["antep fıstığı"], "antep-fistigi"], [["yer fıstığı"], "yer-fistigi"],
    [["brezilya cevizi"], "brezilya-cevizi"], [["pekan"], "pekan-cevizi"],
    [["makademya"], "makademya"], [["fındık"], "findik"], [["badem"], "badem"],
    [["kaju"], "kaju"], [["ceviz"], "ceviz"], [["leblebi"], "leblebi"],
  ];
  const nut = nuts.find(([keywords]) => includesAny(normalized, keywords));
  if (nut) return category(nut[1], "Kuruyemişler");

  return category(null, "Diğer Ürünler");
}

export function buildCatalogImagePrompt(productName: string) {
  return `Create one premium, photorealistic e-commerce cutout of exactly this Turkish food product: “${productName}”.

Product accuracy is the highest priority. Interpret every modifier literally: “çiğ” must look raw and unroasted; “kavrulmuş” must look naturally roasted; “tuzlu” may show a restrained salt coating; “tuzsuz” must not show salt; “içi” means shelled edible kernels only. The product must be immediately recognizable and must never be substituted with a visually similar food.

Fıstık360 catalog art direction: a compact, abundant mound of the product only, photographed from a consistent 35-degree three-quarter overhead camera angle. Soft large key light from upper-left, neutral fill, clean premium food photography, realistic color and texture, appetizing but natural. Square 1:1 composition, centered, approximately 70% of canvas width and 60% of canvas height, generous consistent empty margin.

TRUE TRANSPARENT ALPHA BACKGROUND. No white studio background, no gradient, no plate, no bowl, no scoop, no packaging, no labels, no typography, no logo, no watermark, no extra garnish, no hands. No baked-in cast shadow and no reflection; those are added consistently in post-production. Return one isolated product group only.`;
}

async function hasMeaningfulTransparency(image: Buffer) {
  const { data, info } = await sharp(image, { failOn: "error" })
    .ensureAlpha()
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  let transparentPixels = 0;
  let opaquePixels = 0;
  for (let offset = 3; offset < data.length; offset += info.channels) {
    if (data[offset] <= 12) transparentPixels += 1;
    if (data[offset] >= 220) opaquePixels += 1;
  }
  return transparentPixels / pixelCount >= 0.18 && opaquePixels / pixelCount >= 0.02;
}

export async function normalizeCatalogProductImage(source: Buffer) {
  if (!(await hasMeaningfulTransparency(source))) {
    throw new Error("Görsel servisi gerçek alfa şeffaflığı üretmedi. Lütfen yeniden deneyin.");
  }
  const trimmed = await sharp(source, { failOn: "error" })
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 })
    .resize({ width: 2920, height: 2480, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  const subject = await sharp(trimmed).metadata();
  if (!subject.width || !subject.height) throw new Error("Üretilen görselde geçerli bir ürün alanı bulunamadı.");
  const left = Math.round((4096 - subject.width) / 2);
  const top = Math.max(300, Math.round(1950 - subject.height / 2));

  const shadow = Buffer.from(`<svg width="4096" height="4096" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="42"/></filter></defs><ellipse cx="2048" cy="${Math.min(3500, top + subject.height - 20)}" rx="${Math.max(480, Math.round(subject.width * 0.34))}" ry="92" fill="#281f13" fill-opacity=".18" filter="url(#b)"/></svg>`);

  const output = await sharp({
    create: { width: 4096, height: 4096, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: trimmed, top, left },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();

  const metadata = await sharp(output).metadata();
  if (metadata.width !== 4096 || metadata.height !== 4096 || !metadata.hasAlpha) {
    throw new Error("Üretilen katalog görseli 4K şeffaf PNG standardını karşılamadı.");
  }
  if (output.byteLength > MAX_GENERATED_IMAGE_BYTES) {
    throw new Error("Üretilen katalog görseli 20 MiB sınırını aştı.");
  }
  return output;
}

export async function generateCatalogProductImage(productName: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

  const prompt = buildCatalogImagePrompt(productName);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
      prompt,
      size: "1024x1024",
      quality: "high",
      background: "transparent",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(240_000),
  });

  const payload = await response.json().catch(() => null) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    const reason = payload?.error?.message?.slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(`IMAGE_GENERATION_FAILED:${reason}`);
  }

  const encoded = payload?.data?.[0]?.b64_json;
  if (!encoded) throw new Error("IMAGE_GENERATION_EMPTY");
  return { image: await normalizeCatalogProductImage(Buffer.from(encoded, "base64")), prompt };
}

export async function validateCatalogProductPng(image: Buffer) {
  const metadata = await sharp(image, { failOn: "error" }).metadata();
  return metadata.format === "png"
    && metadata.width === 4096
    && metadata.height === 4096
    && Boolean(metadata.hasAlpha)
    && await hasMeaningfulTransparency(image)
    && image.byteLength <= MAX_GENERATED_IMAGE_BYTES;
}
