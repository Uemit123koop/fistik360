import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function AdminProductsPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  // Ürün kimliği platforma aittir: satıcı `catalog_products` içinden seçer ve
  // yalnız ticari değerleri (fiyat, gramaj, birim) belirler. Bu ekran merkezi
  // kataloğu ve satıcıların onu ne kadar kullandığını gösterir.
  const admin = createSupabaseAdminClient();
  const [{ data: catalog }, { data: retail }] = await Promise.all([
    admin
      .from("catalog_products")
      .select("id, name, category, retail_quantity, retail_unit, is_active, available_to_retail, available_to_wholesale, display_order")
      .order("display_order", { ascending: true })
      .limit(300),
    admin.from("retail_products").select("catalog_product_id, is_active").eq("is_active", true),
  ]);

  const rows = catalog ?? [];
  const usage = new Map<string, number>();
  for (const row of retail ?? []) {
    if (row.catalog_product_id) usage.set(row.catalog_product_id, (usage.get(row.catalog_product_id) ?? 0) + 1);
  }

  const byCategory = rows.reduce<Record<string, typeof rows>>((acc, product) => {
    (acc[product.category] ??= []).push(product);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Merkezi ürün kataloğu</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          {rows.length} katalog ürünü · Satıcılar bu listeden seçip yalnız fiyat ve gramaj belirler.
        </p>
      </div>

      {Object.entries(byCategory).map(([category, products]) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`} className="text-lg font-bold">{category}</h2>
          <div className="mt-3 overflow-x-auto rounded-[16px] border border-[var(--color-border)]">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-[var(--color-surface)] text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Ürün</th>
                  <th scope="col" className="px-4 py-3 font-bold">Perakende</th>
                  <th scope="col" className="px-4 py-3 font-bold">Kanal</th>
                  <th scope="col" className="px-4 py-3 font-bold">Satıcı kullanımı</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[var(--color-border-soft)]">
                    <td className="px-4 py-3">
                      {product.name}
                      {!product.is_active && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800">Pasif</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-text)]">{product.retail_quantity} {product.retail_unit}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-text)]">
                      {[product.available_to_retail ? "Perakende" : null, product.available_to_wholesale ? "Toptan" : null]
                        .filter(Boolean)
                        .join(" · ") || "Kapalı"}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{usage.get(product.id) ?? 0} mağaza</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {rows.length === 0 && (
        <p className="rounded-[16px] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">Katalog boş.</p>
      )}
    </div>
  );
}
