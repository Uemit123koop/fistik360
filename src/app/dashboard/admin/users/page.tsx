import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/roles";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  WHOLESALE_SELLER: "Toptancı",
  NUT_STORE: "Kuruyemişçi",
  CUSTOMER: "Müşteri",
  BRAND_PARTNER: "Marka partneri",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export default async function AdminUsersPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  // Rol değişikliği bilinçli olarak buradan yapılmaz: `block_profile_role_updates`
  // tetikleyicisi istemci kaynaklı rol değişimini engeller ve roller yalnız
  // kayıt/onay RPC'leri üzerinden atanır (complete_seller_registration,
  // approve_partner_application). Bu ekran okuma amaçlıdır.
  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = profiles ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, profile) => {
    acc[profile.role] = (acc[profile.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Kullanıcılar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          Roller yalnız kayıt ve onay akışlarıyla atanır; buradan değiştirilemez.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {USER_ROLES.map((role) => (
          <article key={role} className="rounded-[16px] border border-[var(--color-border)] bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[var(--color-muted-text)]">{ROLE_LABELS[role]}</p>
            <p className="mt-2 text-xl font-extrabold text-[var(--color-primary-dark)]">{counts[role] ?? 0}</p>
          </article>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted-text)]">Kayıtlı kullanıcı yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-[var(--color-border)]">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[var(--color-surface)] text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">E-posta</th>
                <th scope="col" className="px-4 py-3 font-bold">Ad</th>
                <th scope="col" className="px-4 py-3 font-bold">Rol</th>
                <th scope="col" className="px-4 py-3 font-bold">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => (
                <tr key={profile.id} className="border-t border-[var(--color-border-soft)]">
                  <td className="px-4 py-3">{profile.email}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-text)]">{profile.full_name || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{ROLE_LABELS[profile.role as UserRole] ?? profile.role}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-text)]">{dateFormatter.format(new Date(profile.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
