import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { SellerInventoryManager, type SellerProductRow } from "@/components/seller-inventory-manager";
import { requireRole } from "@/lib/auth";
import { getCatalogMetadata } from "@/lib/catalog-metadata";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StoreProductsPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  const { data: products } = store
    ? await supabase.from("retail_products").select("id, name, category, image_url, price, quantity, unit, is_in_stock, is_active, catalog_product_id").eq("store_id", store.id).order("created_at", { ascending: false })
    : { data: [] };

  const catalogProductIds = Array.from(
    new Set((products ?? []).flatMap((product) => (product.catalog_product_id ? [product.catalog_product_id] : []))),
  );
  const { subcategoryByCatalogProductId, attributeTagsByCatalogProductId } = await getCatalogMetadata(supabase, catalogProductIds);

  const rows: SellerProductRow[] = (products ?? []).map((product) => {
    const subcategory = product.catalog_product_id ? subcategoryByCatalogProductId.get(product.catalog_product_id) : undefined;
    return {
      ...product,
      price: Number(product.price),
      quantity: Number(product.quantity),
      subcategoryName: subcategory?.name ?? null,
      mainCategoryName: subcategory?.mainCategoryName ?? null,
      attributeTags: product.catalog_product_id ? attributeTagsByCatalogProductId.get(product.catalog_product_id) ?? [] : [],
    };
  });

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Mağaza kataloğu"
        title="Ürünlerim"
        description="Katalog ürünlerinin mağazana özel fiyatını, satış ölçüsünü, stok ve vitrin durumunu yönet."
        action={<Link href="/dashboard/store/new" className="button-primary">Katalogdan ürün seç</Link>}
      />
      <div className="mt-7"><SellerInventoryManager initialProducts={rows} /></div>
    </div>
  );
}
