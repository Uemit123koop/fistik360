import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { PackageBuilder, type ActiveProductOption, type ExistingPackage } from "@/components/package-builder";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StorePackagesPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();

  const [{ data: packages }, { data: activeProductRows }] = store
    ? await Promise.all([
        supabase.from("packages").select("id, name, package_type, image_url, price, discount_percent, is_active").eq("store_id", store.id).order("created_at", { ascending: false }),
        supabase.from("retail_products").select("id, name, price").eq("store_id", store.id).eq("is_active", true).eq("is_in_stock", true).order("name", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];

  const packageIds = (packages ?? []).map((pkg) => pkg.id);
  const { data: itemRows } = packageIds.length
    ? await supabase.from("package_items").select("package_id, product_id").in("package_id", packageIds)
    : { data: [] };

  const productIdsInPackages = Array.from(new Set((itemRows ?? []).map((row) => row.product_id)));
  const { data: includedProductRows } = productIdsInPackages.length
    ? await supabase.from("retail_products").select("id, name").in("id", productIdsInPackages)
    : { data: [] };
  const productNameById = new Map((includedProductRows ?? []).map((row) => [row.id, row.name]));

  const productIdsByPackageId = new Map<string, string[]>();
  for (const row of itemRows ?? []) {
    productIdsByPackageId.set(row.package_id, [...(productIdsByPackageId.get(row.package_id) ?? []), row.product_id]);
  }

  const existingPackages: ExistingPackage[] = (packages ?? []).map((pkg) => {
    const productIds = productIdsByPackageId.get(pkg.id) ?? [];
    return {
      id: pkg.id,
      name: pkg.name,
      packageType: pkg.package_type,
      imageUrl: pkg.image_url,
      price: Number(pkg.price),
      discountPercent: Number(pkg.discount_percent),
      isActive: pkg.is_active,
      productIds,
      productNames: productIds.flatMap((id) => (productNameById.get(id) ? [productNameById.get(id) as string] : [])),
    };
  });

  const activeProducts: ActiveProductOption[] = (activeProductRows ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
  }));

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Hazır seçkiler"
        title="Paketlerim"
        description="Aktif ürünlerini seçip tüm pakete indirim uygula; fiyat otomatik hesaplanır."
      />
      <div className="mt-7">
        <PackageBuilder existingPackages={existingPackages} activeProducts={activeProducts} />
      </div>
    </div>
  );
}
