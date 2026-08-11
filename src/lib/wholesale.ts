import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface WholesaleSellerSummary {
  ownerId: string;
  businessName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  categories: string[];
}

export interface WholesaleProductView {
  id: string;
  sellerId: string;
  name: string;
  category: string;
  origin: string | null;
  productType: string | null;
  unit: string;
  stockQuantity: number;
  minimumOrderQuantity: number;
  unitPrice: number;
  description: string | null;
  imageUrl: string | null;
  seller: WholesaleSellerSummary | null;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getWholesaleProducts(): Promise<WholesaleProductView[]> {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("wholesale_products")
    .select("id, seller_id, name, category, origin, product_type, unit, stock_quantity, minimum_order_quantity, unit_price, description, image_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Toptan ürünler okunamadı.");
  const sellerIds = [...new Set((products ?? []).map((product) => product.seller_id))];
  const { data: profiles, error: profileError } = sellerIds.length
    ? await supabase
        .from("wholesale_seller_profiles")
        .select("owner_id, business_name, slug, description, logo_url, cover_url, product_categories")
        .in("owner_id", sellerIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (profileError) throw new Error("Toptancı profilleri okunamadı.");
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.owner_id, profile]));

  return (products ?? []).flatMap((product) => {
    const profile = profileMap.get(product.seller_id);
    if (!profile) return [];
    return [{
      id: product.id,
      sellerId: product.seller_id,
      name: product.name,
      category: product.category,
      origin: product.origin,
      productType: product.product_type,
      unit: product.unit,
      stockQuantity: toNumber(product.stock_quantity),
      minimumOrderQuantity: toNumber(product.minimum_order_quantity),
      unitPrice: toNumber(product.unit_price),
      description: product.description,
      imageUrl: product.image_url,
      seller: {
        ownerId: profile.owner_id,
        businessName: profile.business_name,
        slug: profile.slug,
        description: profile.description,
        logoUrl: profile.logo_url,
        coverUrl: profile.cover_url,
        categories: profile.product_categories ?? [],
      },
    }];
  });
}

export async function getWholesaleProduct(id: string): Promise<WholesaleProductView | null> {
  const supabase = await createSupabaseServerClient();
  const { data: product, error } = await supabase
    .from("wholesale_products")
    .select("id, seller_id, name, category, origin, product_type, unit, stock_quantity, minimum_order_quantity, unit_price, description, image_url, is_active")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("Toptan ürün okunamadı.");
  if (!product) return null;

  const { data: profile, error: profileError } = await supabase
    .from("wholesale_seller_profiles")
    .select("owner_id, business_name, slug, description, logo_url, cover_url, product_categories")
    .eq("owner_id", product.seller_id)
    .eq("is_active", true)
    .maybeSingle();
  if (profileError) throw new Error("Toptancı profili okunamadı.");
  if (!profile) return null;

  return {
    id: product.id,
    sellerId: product.seller_id,
    name: product.name,
    category: product.category,
    origin: product.origin,
    productType: product.product_type,
    unit: product.unit,
    stockQuantity: toNumber(product.stock_quantity),
    minimumOrderQuantity: toNumber(product.minimum_order_quantity),
    unitPrice: toNumber(product.unit_price),
    description: product.description,
    imageUrl: product.image_url,
    seller: {
      ownerId: profile.owner_id,
      businessName: profile.business_name,
      slug: profile.slug,
      description: profile.description,
      logoUrl: profile.logo_url,
      coverUrl: profile.cover_url,
      categories: profile.product_categories ?? [],
    },
  };
}

