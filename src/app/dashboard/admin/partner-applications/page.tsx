import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PARTNER_APPLICATION_STATUSES, partnerStatusLabels, type PartnerApplicationStatus } from "@/lib/partner";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function PartnerApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();
  const requested = (await searchParams).status;
  const activeStatus = PARTNER_APPLICATION_STATUSES.includes(requested as PartnerApplicationStatus) ? requested as PartnerApplicationStatus : null;
  let query = createSupabaseAdminClient().from("partner_applications").select("id, brand_name, company_name, authorized_person, email, categories, status, created_at").order("created_at", { ascending: false });
  if (activeStatus) query = query.eq("status", activeStatus);
  const { data, error } = await query;

  return (
    <div>
      <p className="eyebrow">Partner programı</p>
      <h1 className="mt-2 text-3xl font-bold">Partner başvuruları</h1>
      <p className="mt-3 text-sm text-[var(--color-muted-text)]">Onay işlemi, rol ataması ve marka oluşturmayı tek transaction içinde tamamlar.</p>
      <nav aria-label="Başvuru durumu filtresi" className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <Link href="/dashboard/admin/partner-applications" className={`chip ${!activeStatus ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : ""}`}>Tümü</Link>
        {PARTNER_APPLICATION_STATUSES.map((status) => <Link key={status} href={`/dashboard/admin/partner-applications?status=${status}`} className={`chip ${activeStatus === status ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : ""}`}>{partnerStatusLabels[status]}</Link>)}
      </nav>
      {error ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Partner migration’ı remote ortama uygulanmadan başvuru listesi yüklenemez.</p> : !data?.length ? <div className="mt-7 rounded-[18px] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted-text)]">Bu filtrede partner başvurusu yok.</div> : <div className="mt-5 space-y-3">{data.map((item) => <Link key={item.id} href={`/dashboard/admin/partner-applications/${item.id}`} className="grid min-h-24 gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-primary-light)] sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-bold">{item.brand_name}</p><p className="mt-1 text-sm text-[var(--color-muted-text)]">{item.company_name} · {item.authorized_person}</p><p className="mt-2 text-xs text-[var(--color-muted-text)]">{item.categories.slice(0, 3).join(" · ")} · {new Date(item.created_at).toLocaleDateString("tr-TR")}</p></div><span className="badge-success">{partnerStatusLabels[item.status as PartnerApplicationStatus] ?? item.status}</span></Link>)}</div>}
    </div>
  );
}
