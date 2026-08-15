import "server-only";

import { cache } from "react";
import { getServerUser } from "@/lib/auth";
import { getCatalogMetadata, type CatalogAttributeTag } from "@/lib/catalog-metadata";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type CartItemKind = "PRODUCT" | "PACKAGE" | "CUSTOM_MIX";

export type StorefrontAttributeTag = CatalogAttributeTag;

interface StorefrontItemBase {
  id: string;
  kind: CartItemKind;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  detail: string;
}

export interface StorefrontItem extends StorefrontItemBase {
  subcategoryId: string | null;
  subcategoryName: string | null;
  attributeTags: StorefrontAttributeTag[];
  // Yalnız PRODUCT kalemlerinde dolu — karışım oluşturucunun gramaj bazlı
  // (adet değil) ürünleri ayıklaması ve gram başı fiyatı hesaplaması için.
  unit: "gram" | "kg" | "adet" | null;
  baseQuantity: number | null;
  // Yalnız PACKAGE kalemlerinde dolu — panelde seçilen gerçek ürünlerden gelir.
  packageContents: string[];
  discountPercent: number | null;
}

export interface StorefrontCategoryNode {
  id: string;
  name: string;
  productCount: number;
  subcategories: Array<{ id: string; name: string; productCount: number }>;
}

export interface StorefrontData {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  serviceArea: {
    id: string;
    neighborhoodId: string;
    neighborhood: string;
    district: string;
    province: string;
    settlementType: string;
  } | null;
  serviceAreas: Array<{
    id: string;
    neighborhoodId: string;
    name: string;
    isPrimary: boolean;
  }>;
  products: StorefrontItem[];
  packages: StorefrontItem[];
  categoryTree: StorefrontCategoryNode[];
}

export interface CartViewItem extends StorefrontItemBase {
  cartItemId: string;
  quantity: number;
  lineTotal: number;
}

export interface CartView {
  id: string;
  store: { id: string; name: string; logoUrl: string | null };
  serviceArea: {
    id: string;
    neighborhoodId: string;
    label: string;
    neighborhoodName: string;
    districtName: string;
    provinceName: string;
  };
  items: CartViewItem[];
  totals: {
    subtotal: number;
    deliveryFee: number;
    total: number;
    minimumOrder: number;
    freeDeliveryThreshold: number | null;
    minimumRemaining: number;
    authoritative: boolean;
  };
  warning: string | null;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getPublicStorefront(
  storeId: string,
  selectedNeighborhoodId?: string,
): Promise<StorefrontData | null> {
  if (!isUuid(storeId)) return null;

  const supabase = await createSupabaseServerClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, description, logo_url, cover_url")
    .eq("id", storeId)
    .eq("is_active", true)
    .eq("platform_status", "ACTIVE")
    .maybeSingle();

  if (storeError) throw new Error("Mağaza bilgileri okunamadı.");
  if (!store) return null;

  const [{ data: areas, error: areasError }, { data: products, error: productsError }, { data: packages, error: packagesError }] =
    await Promise.all([
      supabase
        .from("store_neighborhoods")
        .select("id, neighborhood_id, neighborhood, is_primary")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("neighborhood", { ascending: true }),
      supabase
        .from("retail_products")
        .select("id, name, description, price, quantity, unit, image_url, catalog_product_id")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("is_in_stock", true)
        .order("name", { ascending: true }),
      supabase
        .from("packages")
        .select("id, name, package_type, price, discount_percent, image_url")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

  if (areasError || productsError || packagesError) {
    throw new Error("Mağaza vitrini okunamadı.");
  }

  const serviceAreas = (areas ?? []).map((area) => ({
    id: area.id,
    neighborhoodId: area.neighborhood_id,
    name: area.neighborhood,
    isPrimary: area.is_primary,
  }));
  const chosenArea =
    serviceAreas.find((area) => area.neighborhoodId === selectedNeighborhoodId) ??
    serviceAreas.find((area) => area.isPrimary) ??
    serviceAreas[0] ??
    null;

  let serviceArea: StorefrontData["serviceArea"] = null;
  if (chosenArea) {
    const { data: neighborhood, error: neighborhoodError } = await supabase
      .from("neighborhoods")
      .select("id, name, settlement_type, district_id")
      .eq("id", chosenArea.neighborhoodId)
      .maybeSingle();

    if (neighborhoodError) throw new Error("Teslimat mahallesi okunamadı.");
    if (neighborhood) {
      const { data: district } = await supabase
        .from("districts")
        .select("id, name, province_id")
        .eq("id", neighborhood.district_id)
        .maybeSingle();
      const { data: province } = district
        ? await supabase.from("provinces").select("name").eq("id", district.province_id).maybeSingle()
        : { data: null };

      serviceArea = {
        id: chosenArea.id,
        neighborhoodId: chosenArea.neighborhoodId,
        neighborhood: neighborhood.name,
        district: district?.name ?? "",
        province: province?.name ?? "",
        settlementType: neighborhood.settlement_type,
      };
    }
  }

  const catalogProductIds = Array.from(
    new Set((products ?? []).flatMap((product) => (product.catalog_product_id ? [product.catalog_product_id] : []))),
  );

  const { subcategoryByCatalogProductId, attributeTagsByCatalogProductId, subcategoryRows, mainCategoryRows } =
    await getCatalogMetadata(supabase, catalogProductIds);

  const subcategoryById = new Map(subcategoryRows.map((row) => [row.id, row]));
  const mainCategoryById = new Map(mainCategoryRows.map((row) => [row.id, row]));

  const storefrontProducts: StorefrontItem[] = (products ?? []).map((product) => {
    const subcategory = product.catalog_product_id ? subcategoryByCatalogProductId.get(product.catalog_product_id) : undefined;
    return {
      id: product.id,
      kind: "PRODUCT" as const,
      name: product.name,
      description: product.description,
      price: toNumber(product.price),
      imageUrl: product.image_url,
      detail: `${toNumber(product.quantity)} ${product.unit}`,
      subcategoryId: subcategory?.id ?? null,
      subcategoryName: subcategory?.name ?? null,
      attributeTags: product.catalog_product_id ? attributeTagsByCatalogProductId.get(product.catalog_product_id) ?? [] : [],
      unit: product.unit as "gram" | "kg" | "adet",
      baseQuantity: toNumber(product.quantity),
      packageContents: [],
      discountPercent: null,
    };
  });

  const productCountBySubcategoryId = new Map<string, number>();
  for (const product of storefrontProducts) {
    if (!product.subcategoryId) continue;
    productCountBySubcategoryId.set(product.subcategoryId, (productCountBySubcategoryId.get(product.subcategoryId) ?? 0) + 1);
  }

  const categoryTree: StorefrontCategoryNode[] = Array.from(mainCategoryById.values())
    .sort((a, b) => a.display_order - b.display_order)
    .map((mainCategory): StorefrontCategoryNode => {
      const subcategories = Array.from(subcategoryById.values())
        .filter((sub) => sub.parent_id === mainCategory.id)
        .map((sub) => ({ id: sub.id, name: sub.name, productCount: productCountBySubcategoryId.get(sub.id) ?? 0 }))
        .filter((sub) => sub.productCount > 0)
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
      const productCount = subcategories.reduce((sum, sub) => sum + sub.productCount, 0);
      return { id: mainCategory.id, name: mainCategory.name, productCount, subcategories };
    })
    .filter((category) => category.productCount > 0);

  const packageIds = (packages ?? []).map((item) => item.id);
  const { data: packageItemRows } = packageIds.length
    ? await supabase.from("package_items").select("package_id, product_id").in("package_id", packageIds)
    : { data: [] };
  const packageContentProductIds = Array.from(new Set((packageItemRows ?? []).map((row) => row.product_id)));
  const { data: packageContentProducts } = packageContentProductIds.length
    ? await supabase.from("retail_products").select("id, name").in("id", packageContentProductIds)
    : { data: [] };
  const packageContentProductNameById = new Map((packageContentProducts ?? []).map((row) => [row.id, row.name]));
  const contentsByPackageId = new Map<string, string[]>();
  for (const row of packageItemRows ?? []) {
    const productName = packageContentProductNameById.get(row.product_id);
    if (!productName) continue;
    contentsByPackageId.set(row.package_id, [...(contentsByPackageId.get(row.package_id) ?? []), productName]);
  }

  return {
    id: store.id,
    name: store.name,
    description: store.description,
    logoUrl: store.logo_url,
    coverUrl: store.cover_url,
    serviceArea,
    serviceAreas,
    products: storefrontProducts,
    packages: (packages ?? []).map((item) => ({
      id: item.id,
      kind: "PACKAGE" as const,
      name: item.name,
      description: null,
      price: toNumber(item.price),
      imageUrl: item.image_url,
      detail: item.package_type || "Hazır paket",
      subcategoryId: null,
      subcategoryName: null,
      attributeTags: [],
      unit: null,
      baseQuantity: null,
      packageContents: contentsByPackageId.get(item.id) ?? [],
      discountPercent: toNumber(item.discount_percent) || null,
    })),
    categoryTree,
  };
}

export const getCartItemCount = cache(async () => {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") return 0;

  const supabase = await createSupabaseServerClient();
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!cart) return 0;
  const { data: items } = await supabase.from("cart_items").select("item_quantity").eq("cart_id", cart.id);
  return Math.round((items ?? []).reduce((sum, item) => sum + toNumber(item.item_quantity), 0));
});

export async function getCustomerCart(customerId: string): Promise<CartView | null> {
  const admin = createSupabaseAdminClient();
  const { data: cart, error: cartError } = await admin
    .from("carts")
    .select("id, store_id, store_neighborhood_id")
    .eq("customer_id", customerId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (cartError) throw new Error("Sepet okunamadı.");
  if (!cart) return null;

  const [{ data: store }, { data: area }, { data: rows, error: itemError }] = await Promise.all([
    admin.from("stores").select("id, name, logo_url").eq("id", cart.store_id).single(),
    admin
      .from("store_neighborhoods")
      .select("id, neighborhood_id, delivery_fee_override")
      .eq("id", cart.store_neighborhood_id)
      .single(),
    admin
      .from("cart_items")
      .select("id, retail_product_id, package_id, custom_mix_id, item_quantity")
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!store || !area || itemError) throw new Error("Sepet ayrıntıları okunamadı.");

  const productIds = (rows ?? []).flatMap((row) => (row.retail_product_id ? [row.retail_product_id] : []));
  const packageIds = (rows ?? []).flatMap((row) => (row.package_id ? [row.package_id] : []));
  const customMixIds = (rows ?? []).flatMap((row) => (row.custom_mix_id ? [row.custom_mix_id] : []));
  const [{ data: products }, { data: packages }, { data: customMixes }, { data: neighborhood }, { data: delivery }] = await Promise.all([
    productIds.length
      ? admin.from("retail_products").select("id, name, description, price, quantity, unit, image_url").in("id", productIds)
      : Promise.resolve({ data: [] }),
    packageIds.length
      ? admin.from("packages").select("id, name, package_type, price, image_url").in("id", packageIds)
      : Promise.resolve({ data: [] }),
    customMixIds.length
      ? admin.from("cart_custom_mixes").select("id, name_snapshot, total_weight_grams, total_price_amount").in("id", customMixIds)
      : Promise.resolve({ data: [] }),
    // Tek sorguda iç içe embed (districts -> provinces): ayrı district/province
    // round-trip'lerini ortadan kaldırır, hosted Supabase'e gidip gelme
    // gecikmesini (sepet drawer açılışında hissedilen "2 saniye" gecikme) azaltır.
    admin
      .from("neighborhoods")
      .select("id, name, settlement_type, districts(name, provinces(name))")
      .eq("id", area.neighborhood_id)
      .single() as unknown as Promise<{ data: { id: string; name: string; settlement_type: string; districts: { name: string; provinces: { name: string } | null } | null } | null }>,
    admin
      .from("store_delivery_settings")
      .select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold")
      .eq("store_id", cart.store_id)
      .single(),
  ]);

  const district = neighborhood?.districts ?? null;
  const province = district?.provinces ?? null;

  const productMap = new Map((products ?? []).map((item) => [item.id, item]));
  const packageMap = new Map((packages ?? []).map((item) => [item.id, item]));
  const customMixMap = new Map((customMixes ?? []).map((item) => [item.id, item]));
  const items = (rows ?? []).flatMap<CartViewItem>((row) => {
    const quantity = toNumber(row.item_quantity);
    const product = row.retail_product_id ? productMap.get(row.retail_product_id) : null;
    const packageItem = row.package_id ? packageMap.get(row.package_id) : null;
    const customMix = row.custom_mix_id ? customMixMap.get(row.custom_mix_id) : null;
    if (product) {
      const price = toNumber(product.price);
      return [{
        cartItemId: row.id,
        id: product.id,
        kind: "PRODUCT",
        name: product.name,
        description: product.description,
        price,
        imageUrl: product.image_url,
        detail: `${toNumber(product.quantity)} ${product.unit}`,
        quantity,
        lineTotal: Math.round(price * quantity * 100) / 100,
      }];
    }
    if (packageItem) {
      const price = toNumber(packageItem.price);
      return [{
        cartItemId: row.id,
        id: packageItem.id,
        kind: "PACKAGE",
        name: packageItem.name,
        description: null,
        price,
        imageUrl: packageItem.image_url,
        detail: packageItem.package_type || "Hazır paket",
        quantity,
        lineTotal: Math.round(price * quantity * 100) / 100,
      }];
    }
    if (customMix) {
      const price = toNumber(customMix.total_price_amount);
      return [{
        cartItemId: row.id,
        id: customMix.id,
        kind: "CUSTOM_MIX",
        name: customMix.name_snapshot,
        description: null,
        price,
        imageUrl: null,
        detail: `${toNumber(customMix.total_weight_grams)} gram karışım`,
        quantity,
        lineTotal: Math.round(price * quantity * 100) / 100,
      }];
    }
    return [];
  });

  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const minimumOrder = toNumber(delivery?.minimum_order_amount);
  const freeDeliveryThreshold = delivery?.free_delivery_threshold == null
    ? null
    : toNumber(delivery.free_delivery_threshold);
  const configuredFee = area.delivery_fee_override == null
    ? toNumber(delivery?.standard_delivery_fee)
    : toNumber(area.delivery_fee_override);
  const previewFee = freeDeliveryThreshold !== null && subtotal >= freeDeliveryThreshold ? 0 : configuredFee;

  let deliveryFee = previewFee;
  let total = subtotal + previewFee;
  let authoritative = false;
  let warning: string | null = null;

  if (items.length > 0) {
    const { data: calculated, error: totalsError } = await admin.rpc("calculate_cart_totals", {
      p_cart_id: cart.id,
      p_customer_id: customerId,
    });
    const result = calculated?.[0];
    if (!totalsError && result) {
      deliveryFee = toNumber(result.delivery_fee_amount);
      total = toNumber(result.total_amount);
      authoritative = true;
    } else if (totalsError?.message.includes("Minimum order amount")) {
      warning = "Minimum sepet tutarına henüz ulaşılmadı.";
    } else if (totalsError) {
      warning = totalsError.message;
    }
  }

  return {
    id: cart.id,
    store: { id: store.id, name: store.name, logoUrl: store.logo_url },
    serviceArea: {
      id: area.id,
      neighborhoodId: area.neighborhood_id,
      label: neighborhood ? `${neighborhood.name} Mahallesi` : "Teslimat bölgesi",
      neighborhoodName: neighborhood?.name ?? "",
      districtName: district?.name ?? "",
      provinceName: province?.name ?? "",
    },
    items,
    totals: {
      subtotal,
      deliveryFee,
      total: Math.round(total * 100) / 100,
      minimumOrder,
      freeDeliveryThreshold,
      minimumRemaining: Math.max(0, Math.round((minimumOrder - subtotal) * 100) / 100),
      authoritative,
    },
    warning,
  };
}
