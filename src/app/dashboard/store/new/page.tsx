import { notFound } from "next/navigation";
import { StoreCatalogPriceForm, type CatalogProductOption } from "@/components/catalog-price-forms";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NewStoreProductPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("catalog_products")
    .select("id, slug, name, category, image_url, retail_quantity, retail_unit, wholesale_unit")
    .eq("is_active", true)
    .eq("available_to_retail", true)
    .order("display_order");

  return (
    <div className="space-y-7">
      <DashboardPageHeader eyebrow="Mağaza kataloğu" title="Katalogdan ürün seç" description="Fıstık360 ürününü seç, yalnız mağaza fiyatını belirle." />
      <StoreCatalogPriceForm products={(products ?? []) as CatalogProductOption[]} />
    </div>
  );
}
