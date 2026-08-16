import "server-only";

import { productCategories, type ProductCategory } from "@/lib/marketplace-content";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function getProductCategories(): Promise<ProductCategory[]> {
  const slugs = productCategories.map((category) => category.catalogProductSlug);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("catalog_products")
    .select("slug, image_url")
    .in("slug", slugs)
    .eq("is_active", true);

  if (error) return productCategories.map((category) => ({ ...category, heroImage: null }));
  const imageBySlug = new Map((data ?? []).map((row) => [row.slug, row.image_url]));

  return productCategories.map((category) => ({
    ...category,
    heroImage: imageBySlug.get(category.catalogProductSlug) ?? null,
  }));
}