import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });

export default async function AdminPackagesPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const admin = createSupabaseAdminClient();
  const { data: packages } = await admin
    .from("packages")
    .select("id, store_id, name, package_type, price, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(150);

  const rows = packages ?? [];
  const storeIds = [...new Set(rows.map((row) => row.store_id))];
  const [{ data: stores }, { data: items }] = await Promise.all([
    storeIds.length
      ? admin.from("stores").select("id, name, platform_status").in("id", storeIds)
      : Promise.resolve({ data: [] }),
    rows.length
      ? admin.from("package_items").select("package_id").in("package_id", rows.map((row) => row.id))
      : Promise.resolve({ data: [] }),
  ]);

  const storeMap = new Map((stores ?? []).map((store) => [store.id, store]));
  const itemCounts = new Map<string, number>();
  for (const item of items ?? []) itemCounts.set(item.package_id, (itemCounts.get(item.package_id) ?? 0) + 1);

  const activeCount = rows.filter((row) => row.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Paketler</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          {activeCount} aktif / {rows.length} toplam paket. Paketler mağazaya aittir; içerikleri satıcı tarafından düzenlenir.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">Henüz paket yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-[var(--color-border)]">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-[var(--color-surface)] text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Paket</th>
                <th scope="col" className="px-4 py-3 font-bold">Mağaza</th>
                <th scope="col" className="px-4 py-3 font-bold">Tür</th>
                <th scope="col" className="px-4 py-3 font-bold">İçerik</th>
                <th scope="col" className="px-4 py-3 font-bold">Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const store = storeMap.get(row.store_id);
                return (
                  <tr key={row.id} className="border-t border-[var(--color-border-soft)]">
                    <td className="px-4 py-3">
                      {row.name}
                      {!row.is_active && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800">Pasif</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-text)]">
                      {store?.name ?? "—"}
                      {store && store.platform_status !== "ACTIVE" && (
                        <span className="ml-2 text-xs text-[#6d4b17]">({store.platform_status === "SUSPENDED" ? "askıda" : "yayın bekliyor"})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-text)]">{row.package_type || "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{itemCounts.get(row.id) ?? 0} kalem</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{moneyFormatter.format(Number(row.price))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
