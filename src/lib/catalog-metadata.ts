import "server-only";

// catalog_products -> catalog_categories (alt/ana kategori) ve
// catalog_product_attribute_values -> catalog_attribute_values/catalog_attributes
// zincirini tek yerde çözer. getPublicStorefront (müşteri vitrini) ve satıcı
// "Ürünlerim" tablosu aynı bilgiyi ihtiyaç duyuyor, mantık burada paylaşılıyor.

export interface CatalogAttributeTag {
  attributeKey: string;
  attributeLabel: string;
  valueKey: string;
  valueLabel: string;
}

export interface CatalogCategoryInfo {
  id: string;
  name: string;
  mainCategoryId: string | null;
  mainCategoryName: string | null;
}

export interface CatalogCategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number;
}

export interface CatalogMainCategoryRow {
  id: string;
  name: string;
  display_order: number;
}

export interface CatalogMetadata {
  subcategoryByCatalogProductId: Map<string, CatalogCategoryInfo>;
  attributeTagsByCatalogProductId: Map<string, CatalogAttributeTag[]>;
  subcategoryRows: CatalogCategoryRow[];
  mainCategoryRows: CatalogMainCategoryRow[];
}

type AttributeLinkRow = {
  catalog_product_id: string;
  catalog_attribute_values: {
    value_key: string;
    label: string;
    catalog_attributes: { key: string; label: string } | null;
  } | null;
};

const EMPTY_METADATA: CatalogMetadata = {
  subcategoryByCatalogProductId: new Map(),
  attributeTagsByCatalogProductId: new Map(),
  subcategoryRows: [],
  mainCategoryRows: [],
};

// Supabase istemcisinin türü kasıtlı gevşek: proje genelinde generic Database
// tipi kullanılmıyor, hem RLS'li server client hem admin client aynı şekli
// sağlıyor (`.from(table).select(...).in(...)`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCatalogMetadata(supabase: any, catalogProductIds: string[]): Promise<CatalogMetadata> {
  if (catalogProductIds.length === 0) return EMPTY_METADATA;

  const [{ data: catalogProducts }, { data: attributeLinks }] = await Promise.all([
    supabase.from("catalog_products").select("id, subcategory_id").in("id", catalogProductIds),
    supabase
      .from("catalog_product_attribute_values")
      .select("catalog_product_id, catalog_attribute_values(value_key, label, catalog_attributes(key, label))")
      .in("catalog_product_id", catalogProductIds),
  ]);

  const subcategoryIdByCatalogProductId = new Map<string, string | null>(
    (catalogProducts ?? []).map((row: { id: string; subcategory_id: string | null }) => [row.id, row.subcategory_id]),
  );
  const subcategoryIds = Array.from(
    new Set((catalogProducts ?? []).flatMap((row: { subcategory_id: string | null }) => (row.subcategory_id ? [row.subcategory_id] : []))),
  );

  const { data: subcategoryRows } = subcategoryIds.length
    ? await supabase.from("catalog_categories").select("id, name, parent_id, display_order").in("id", subcategoryIds)
    : { data: [] };
  const mainCategoryIds = Array.from(
    new Set((subcategoryRows ?? []).flatMap((row: CatalogCategoryRow) => (row.parent_id ? [row.parent_id] : []))),
  );
  const { data: mainCategoryRows } = mainCategoryIds.length
    ? await supabase.from("catalog_categories").select("id, name, display_order").in("id", mainCategoryIds)
    : { data: [] };

  const subcategoryById = new Map<string, CatalogCategoryRow>((subcategoryRows ?? []).map((row: CatalogCategoryRow) => [row.id, row]));
  const mainCategoryById = new Map<string, CatalogMainCategoryRow>((mainCategoryRows ?? []).map((row: CatalogMainCategoryRow) => [row.id, row]));

  const subcategoryByCatalogProductId = new Map<string, CatalogCategoryInfo>();
  for (const [catalogProductId, subcategoryId] of subcategoryIdByCatalogProductId) {
    if (!subcategoryId) continue;
    const sub = subcategoryById.get(subcategoryId);
    if (!sub) continue;
    const main = sub.parent_id ? mainCategoryById.get(sub.parent_id) : undefined;
    subcategoryByCatalogProductId.set(catalogProductId, {
      id: sub.id,
      name: sub.name,
      mainCategoryId: main?.id ?? null,
      mainCategoryName: main?.name ?? null,
    });
  }

  const attributeTagsByCatalogProductId = new Map<string, CatalogAttributeTag[]>();
  for (const link of (attributeLinks ?? []) as unknown as AttributeLinkRow[]) {
    const value = link.catalog_attribute_values;
    const attribute = value?.catalog_attributes;
    if (!value || !attribute) continue;
    const list = attributeTagsByCatalogProductId.get(link.catalog_product_id) ?? [];
    list.push({ attributeKey: attribute.key, attributeLabel: attribute.label, valueKey: value.value_key, valueLabel: value.label });
    attributeTagsByCatalogProductId.set(link.catalog_product_id, list);
  }

  return {
    subcategoryByCatalogProductId,
    attributeTagsByCatalogProductId,
    subcategoryRows: subcategoryRows ?? [],
    mainCategoryRows: mainCategoryRows ?? [],
  };
}
