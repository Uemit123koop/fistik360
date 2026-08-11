import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function metric(label: string, value: number | string, note: string, href?: string) {
  const body = (
    <>
      <p className="text-sm text-[#6b5a43]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[#948164]">{note}</p>
    </>
  );

  return href ? (
    <Link
      key={label}
      href={href}
      className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-5 transition hover:border-[var(--color-primary-light)]"
    >
      {body}
    </Link>
  ) : (
    <div key={label} className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-5">{body}</div>
  );
}

export default async function AdminDashboardPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const admin = createSupabaseAdminClient();
  const [activeStores, pendingStores, suspendedStores, openInquiries, activePackages, pendingApplications, openOrders] =
    await Promise.all([
      admin.from("stores").select("id", { count: "exact", head: true }).eq("platform_status", "ACTIVE").eq("is_active", true),
      admin.from("stores").select("id", { count: "exact", head: true }).eq("platform_status", "PENDING_ONBOARDING"),
      admin.from("stores").select("id", { count: "exact", head: true }).eq("platform_status", "SUSPENDED"),
      admin.from("wholesale_inquiries").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      admin.from("packages").select("id", { count: "exact", head: true }).eq("is_active", true),
      admin.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      admin.from("orders").select("id", { count: "exact", head: true }).in("status", ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"]),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Genel bakış</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metric("Yayındaki mağaza", activeStores.count ?? 0, "Vitrinde görünen kuruyemişçiler", "/dashboard/admin/stores")}
        {metric("Yayın bekleyen", pendingStores.count ?? 0, "Onboarding tamamlanmadı", "/dashboard/admin/stores")}
        {metric("Askıdaki mağaza", suspendedStores.count ?? 0, "Platform kararıyla kapalı", "/dashboard/admin/stores")}
        {metric("Açık sipariş", openOrders.count ?? 0, "Teslim edilmemiş siparişler")}
        {metric("Bekleyen toptan talep", openInquiries.count ?? 0, "Toptancı yanıtı bekliyor")}
        {metric("Aktif paket", activePackages.count ?? 0, "Satıştaki hazır seçkiler", "/dashboard/admin/packages")}
      </div>

      {(pendingApplications.count ?? 0) > 0 && (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-amber-800">İşlem bekliyor</p>
          <p className="mt-2 font-bold">{pendingApplications.count} partner başvurusu değerlendirilmeyi bekliyor.</p>
          <Link href="/dashboard/admin/partner-applications" className="button-primary mt-4">Başvuruları aç</Link>
        </div>
      )}
    </div>
  );
}
