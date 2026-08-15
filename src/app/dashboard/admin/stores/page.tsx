import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStoreActions } from "@/components/admin-store-actions";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800",
  PENDING_ONBOARDING: "bg-[#fff5df] text-[#6d4b17]",
  SUSPENDED: "bg-red-50 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Yayında",
  PENDING_ONBOARDING: "Yayın bekliyor",
  SUSPENDED: "Askıda",
};

export default async function AdminStoresPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  // Askıya alma ve yayına alma service_role gerektirdiği için liste de admin
  // istemcisiyle okunur; böylece yayına alınmamış mağazalar da görünür.
  const admin = createSupabaseAdminClient();
  const { data: stores } = await admin
    .from("stores")
    .select("id, name, slug, phone, address, province, district, neighborhood, is_active, platform_status, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = stores ?? [];
  const storeIds = rows.map((store) => store.id);
  const [{ data: products }, { data: areas }] = await Promise.all([
    storeIds.length
      ? admin.from("retail_products").select("store_id").in("store_id", storeIds).eq("is_active", true).eq("is_in_stock", true)
      : Promise.resolve({ data: [] }),
    storeIds.length
      ? admin.from("store_neighborhoods").select("store_id").in("store_id", storeIds).eq("is_primary", true).eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ]);

  const productCounts = new Map<string, number>();
  for (const row of products ?? []) productCounts.set(row.store_id, (productCounts.get(row.store_id) ?? 0) + 1);
  const withArea = new Set((areas ?? []).map((row) => row.store_id));

  const counts = rows.reduce<Record<string, number>>((acc, store) => {
    acc[store.platform_status] = (acc[store.platform_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Kuruyemişçiler</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          Yayına alma ve askıya alma platform kararıdır. Satıcının kendi &ldquo;tatil modu&rdquo; anahtarı ayrıdır ve
          buradan değiştirilmez.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["ACTIVE", "PENDING_ONBOARDING", "SUSPENDED"] as const).map((status) => (
          <article key={status} className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
            <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">{STATUS_LABEL[status]}</p>
            <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{counts[status] ?? 0}</p>
          </article>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">Henüz mağaza kaydı yok.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((store) => {
            const productCount = productCounts.get(store.id) ?? 0;
            const areaReady = withArea.has(store.id);
            const location = [store.neighborhood, store.district, store.province].filter(Boolean).join(" · ");

            return (
              <article key={store.id} className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{store.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_TONE[store.platform_status] ?? ""}`}>
                        {STATUS_LABEL[store.platform_status] ?? store.platform_status}
                      </span>
                      {!store.is_active && (
                        <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-bold text-[var(--color-muted-text)]">
                          Satıcı kapattı
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted-text)]">{location || "Mahalle seçilmemiş"}</p>
                    <p className="mt-2 text-xs text-[var(--color-muted-text)]">
                      {areaReady ? "✅ Ana mahalle" : "❌ Ana mahalle yok"} · {productCount > 0 ? `✅ ${productCount} satılabilir ürün` : "❌ Satılabilir ürün yok"}
                    </p>
                    {(store.phone || store.address) && (
                      <p className="mt-2 rounded-[10px] bg-[var(--color-surface)] px-3 py-2 text-xs leading-5 text-[var(--color-muted-text)]">
                        <span className="font-bold text-[var(--color-ink)]">İletişim (yalnız yönetim):</span>{" "}
                        {store.phone || "telefon yok"}{store.address ? ` · ${store.address}` : " · adres yok"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <AdminStoreActions
                      storeId={store.id}
                      storeName={store.name}
                      platformStatus={store.platform_status as "PENDING_ONBOARDING" | "ACTIVE" | "SUSPENDED"}
                    />
                    {store.platform_status === "ACTIVE" && store.is_active && (
                      <Link href={`/magaza/${store.id}`} className="text-link text-sm">Vitrini gör</Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
