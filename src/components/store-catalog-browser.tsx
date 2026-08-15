"use client";

import { useMemo, useState } from "react";
import { StorefrontItemCard } from "@/components/cart-ui";
import type { StorefrontCategoryNode, StorefrontItem } from "@/lib/cart";

export function StoreCatalogBrowser({
  categoryTree,
  products,
  storeId,
  serviceAreaId,
}: {
  categoryTree: StorefrontCategoryNode[];
  products: StorefrontItem[];
  storeId: string;
  serviceAreaId: string | null;
}) {
  const [activeValueKeys, setActiveValueKeys] = useState<Set<string>>(new Set());

  const attributeGroups = useMemo(() => {
    const groups = new Map<string, { label: string; values: Map<string, { valueLabel: string; count: number }> }>();
    for (const product of products) {
      for (const tag of product.attributeTags) {
        const group = groups.get(tag.attributeKey) ?? { label: tag.attributeLabel, values: new Map() };
        const existing = group.values.get(tag.valueKey);
        group.values.set(tag.valueKey, { valueLabel: tag.valueLabel, count: (existing?.count ?? 0) + 1 });
        groups.set(tag.attributeKey, group);
      }
    }
    return Array.from(groups.entries()).map(([attributeKey, group]) => ({
      attributeKey,
      label: group.label,
      values: Array.from(group.values.entries())
        .map(([valueKey, value]) => ({ valueKey, ...value }))
        .sort((a, b) => a.valueLabel.localeCompare(b.valueLabel, "tr")),
    }));
  }, [products]);

  const attributeKeyByValueKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of attributeGroups) for (const value of group.values) map.set(value.valueKey, group.attributeKey);
    return map;
  }, [attributeGroups]);

  function toggleFilterValue(valueKey: string) {
    setActiveValueKeys((prev) => {
      const next = new Set(prev);
      if (next.has(valueKey)) next.delete(valueKey);
      else next.add(valueKey);
      return next;
    });
  }

  const filteredProducts = useMemo(() => {
    if (activeValueKeys.size === 0) return products;
    const activeByAttribute = new Map<string, string[]>();
    for (const valueKey of activeValueKeys) {
      const attributeKey = attributeKeyByValueKey.get(valueKey);
      if (!attributeKey) continue;
      activeByAttribute.set(attributeKey, [...(activeByAttribute.get(attributeKey) ?? []), valueKey]);
    }
    return products.filter((product) =>
      Array.from(activeByAttribute.values()).every((values) => product.attributeTags.some((tag) => values.includes(tag.valueKey))),
    );
  }, [products, activeValueKeys, attributeKeyByValueKey]);

  const productsBySubcategoryId = useMemo(() => {
    const map = new Map<string, StorefrontItem[]>();
    for (const product of filteredProducts) {
      if (!product.subcategoryId) continue;
      map.set(product.subcategoryId, [...(map.get(product.subcategoryId) ?? []), product]);
    }
    return map;
  }, [filteredProducts]);

  const uncategorized = filteredProducts.filter((product) => !product.subcategoryId);

  return (
    <div>
      {attributeGroups.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Ürün özelliklerine göre filtrele">
          {attributeGroups.flatMap((group) =>
            group.values.map((value) => (
              <button
                key={value.valueKey}
                type="button"
                onClick={() => toggleFilterValue(value.valueKey)}
                className={`chip transition-colors ${
                  activeValueKeys.has(value.valueKey)
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"
                    : "hover:border-[var(--color-primary-light)]"
                }`}
              >
                {value.valueLabel} ({value.count})
              </button>
            )),
          )}
        </div>
      )}

      <div className={`space-y-10 ${attributeGroups.length > 0 ? "mt-7" : ""}`}>
        {categoryTree.map((main) => {
          const items = main.subcategories.flatMap((sub) => productsBySubcategoryId.get(sub.id) ?? []);
          if (items.length === 0) return null;
          return (
            <div key={main.id}>
              <h3 className="font-serif text-xl font-bold text-[var(--color-ink)] sm:text-2xl">{main.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item, index) => (
                  <StorefrontItemCard key={item.id} item={item} index={index} storeId={storeId} serviceAreaId={serviceAreaId} />
                ))}
              </div>
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div>
            <h3 className="font-serif text-xl font-bold text-[var(--color-ink)] sm:text-2xl">Diğer</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {uncategorized.map((item, index) => (
                <StorefrontItemCard key={item.id} item={item} index={index} storeId={storeId} serviceAreaId={serviceAreaId} />
              ))}
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <p className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-6 text-[var(--color-muted-text)]">
            Bu filtrede ürün bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}
