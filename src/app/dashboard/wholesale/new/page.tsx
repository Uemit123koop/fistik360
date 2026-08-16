import { notFound } from "next/navigation";
import { WholesaleCatalogPriceForm, type CatalogProductOption } from "@/components/catalog-price-forms";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NewWholesaleProductPage() {
  const user = await requireRole(["WHOLESALE_SELLER"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("catalog_products")
    .select("id, slug, name, category, image_url, retail_quantity, retail_unit, wholesale_unit")
    .eq("is_active", true)
    .eq("available_to_wholesale", true)
    .order("display_order");

  return (
    <div className="space-y-7">
      <div><p className="eyebrow">Toptan katalog</p><h1 className="mt-2 text-3xl font-bold">Katalogdan toptan ürün seç</h1><p className="mt-2 text-[var(--color-muted-text)]">Ürün Fıstık360 kataloğundan gelir; stok, minimum sipariş ve fiyatını sen belirlersin.</p></div>
      <WholesaleCatalogPriceForm products={(products ?? []) as CatalogProductOption[]} />
    </div>
  );
}
