import "server-only";

import { isUuid, type CartItemKind } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface HomeFeedStore {
  id: string;
  name: string;
  description: string | null;
  neighborhoodId: string;
  neighborhood: string;
  serviceAreaId: string;
}

export interface HomeFeedItem {
  id: string;
  kind: CartItemKind;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  detail: string;
  storeId: string;
  storeName: string;
  serviceAreaId: string;
}

export interface HomeFeed {
  stores: HomeFeedStore[];
  products: HomeFeedItem[];
  packages: HomeFeedItem[];
}

const EMPTY_FEED: HomeFeed = { stores: [], products: [], packages: [] };

export async function getHomeFeed(neighborhoodId?: string | null, storeLimit = 8): Promise<HomeFeed> {
  const supabase = await createSupabaseServerClient();

  let storeIds: string[] | null = null;
  if (neighborhoodId && isUuid(neighborhoodId)) {
    const { data: areas, error: areasError } = await supabase
      .from("store_neighborhoods")
      .select("store_id")
      .eq("neighborhood_id", neighborhoodId)
      .eq("is_active", true);
    if (areasError) throw new Error("Mahalle mağazaları okunamadı.");
    storeIds = (areas ?? []).map((area) => area.store_id);
    if (storeIds.length === 0) return EMPTY_FEED;
  }

  let storesQuery = supabase
    .from("stores")
    .select("id, name, description")
    .eq("is_active", true)
    .eq("platform_status", "ACTIVE")
    .order("name", { ascending: true })
    .limit(storeLimit);
  if (storeIds) storesQuery = storesQuery.in("id", storeIds);

  const { data: stores, error: storesError } = await storesQuery;
  if (storesError) throw new Error("Mağazalar okunamadı.");
  if (!stores || stores.length === 0) return EMPTY_FEED;

  const perStore = await Promise.all(
    stores.map(async (store) => {
      let areaQuery = supabase
        .from("store_neighborhoods")
        .select("id, neighborhood_id, neighborhood, is_primary")
        .eq("store_id", store.id)
        .eq("is_active", true);
      // Müşteri belirli bir mahalle seçtiyse mağaza kartı o mahalleye kilitlenir;
      // aksi halde (mahalle seçilmemiş genel listeleme) mağazanın ana mahallesi gösterilir.
      areaQuery = neighborhoodId && isUuid(neighborhoodId)
        ? areaQuery.eq("neighborhood_id", neighborhoodId)
        : areaQuery.order("is_primary", { ascending: false });

      const [{ data: areas }, { data: products }, { data: packages }] = await Promise.all([
        areaQuery.limit(1),
        supabase
          .from("retail_products")
          .select("id, name, description, price, quantity, unit, image_url")
          .eq("store_id", store.id)
          .eq("is_active", true)
          .eq("is_in_stock", true)
          .order("price", { ascending: false })
          .limit(2),
        supabase
          .from("packages")
          .select("id, name, package_type, price, image_url")
          .eq("store_id", store.id)
          .eq("is_active", true)
          .order("price", { ascending: false })
          .limit(1),
      ]);

      const area = areas?.[0];
      if (!area) return null;

      const feedStore: HomeFeedStore = {
        id: store.id,
        name: store.name,
        description: store.description,
        neighborhoodId: area.neighborhood_id,
        neighborhood: area.neighborhood,
        serviceAreaId: area.id,
      };

      const feedProducts: HomeFeedItem[] = (products ?? []).map((product) => ({
        id: product.id,
        kind: "PRODUCT",
        name: product.name,
        description: product.description,
        price: toNumber(product.price),
        imageUrl: product.image_url,
        detail: `${toNumber(product.quantity)} ${product.unit}`,
        storeId: store.id,
        storeName: store.name,
        serviceAreaId: area.id,
      }));

      const feedPackages: HomeFeedItem[] = (packages ?? []).map((item) => ({
        id: item.id,
        kind: "PACKAGE",
        name: item.name,
        description: null,
        price: toNumber(item.price),
        imageUrl: item.image_url,
        detail: item.package_type || "Hazır paket",
        storeId: store.id,
        storeName: store.name,
        serviceAreaId: area.id,
      }));

      return { store: feedStore, products: feedProducts, packages: feedPackages };
    }),
  );

  const resolved = perStore.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    stores: resolved.map((entry) => entry.store),
    products: resolved.flatMap((entry) => entry.products),
    packages: resolved.flatMap((entry) => entry.packages),
  };
}
