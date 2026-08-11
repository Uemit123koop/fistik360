import { notFound } from "next/navigation";
import { StoreCatalogPriceForm, type CatalogProductOption } from "@/components/catalog-price-forms";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NewStoreProductPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("catalog_products")
    .select("id, name, category, retail_quantity, retail_unit, wholesale_unit")
    .eq("is_active", true)
    .eq("available_to_retail", true)
    .order("display_order");

  return (
    <div className="space-y-7">
      <div><p className="eyebrow">Mağaza kataloğu</p><h1 className="mt-2 text-3xl font-bold">Katalogdan ürün seç</h1><p className="mt-2 text-[var(--color-muted-text)]">Fıstık360 ürününü seç, yalnız mağaza fiyatını belirle.</p></div>
      <StoreCatalogPriceForm products={(products ?? []) as CatalogProductOption[]} />
    </div>
  );
}
