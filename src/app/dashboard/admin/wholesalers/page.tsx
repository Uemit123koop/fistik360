import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export default async function AdminWholesalersPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("wholesale_seller_profiles")
    .select("id, owner_id, business_name, slug, phone, product_categories, is_active, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = profiles ?? [];
  const ownerIds = rows.map((row) => row.owner_id);
  const [{ data: owners }, { data: products }] = await Promise.all([
    ownerIds.length ? admin.from("profiles").select("id, email").in("id", ownerIds) : Promise.resolve({ data: [] }),
    ownerIds.length
      ? admin.from("wholesale_products").select("seller_id").in("seller_id", ownerIds).eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ]);

  const emails = new Map((owners ?? []).map((owner) => [owner.id, owner.email]));
  const productCounts = new Map<string, number>();
  for (const row of products ?? []) productCounts.set(row.seller_id, (productCounts.get(row.seller_id) ?? 0) + 1);

  const publishedCount = rows.filter((row) => row.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Toptancılar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          Toptancı profilini yayına alma kararı toptancının kendisine aittir; bu ekran izleme amaçlıdır.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Yayında</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{publishedCount}</p>
        </article>
        <article className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Toplam kayıt</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{rows.length}</p>
        </article>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">Henüz toptancı kaydı yok.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{row.business_name}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        row.is_active ? "bg-emerald-50 text-emerald-800" : "bg-[#fff5df] text-[#6d4b17]"
                      }`}
                    >
                      {row.is_active ? "Yayında" : "Yayında değil"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-muted-text)]">
                    {emails.get(row.owner_id) ?? "—"}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted-text)]">
                    {productCounts.get(row.owner_id) ?? 0} aktif toptan ürün · Kayıt {dateFormatter.format(new Date(row.created_at))}
                  </p>
                  {row.product_categories?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {row.product_categories.map((category: string) => (
                        <span key={category} className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold">
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {row.is_active && (
                  <Link href={`/toptanci/${row.slug}`} className="text-link shrink-0 text-sm">Profili gör</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
