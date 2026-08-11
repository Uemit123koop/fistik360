import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivePartner } from "@/lib/partner-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function PartnerDashboardPage() {
  const access = await getActivePartner();
  if (!access) notFound();
  const admin = createSupabaseAdminClient();
  const { data: brand } = await admin.from("brands").select("id, name, slug, is_active, is_verified").eq("partner_id", access.partner.id).maybeSingle();
  const { count: activeProducts } = await admin.from("brand_products").select("id", { count: "exact", head: true }).eq("partner_id", access.partner.id).eq("status", "ACTIVE");

  return (
    <div>
      <p className="eyebrow">Genel bakış</p>
      <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Merhaba, {brand?.name ?? "partner"}.</h1>
      <p className="mt-3 max-w-2xl leading-7 text-[var(--color-muted-text)]">Marka mağazanı ve satışa açık ürünlerini buradan yönetebilirsin.</p>
      <div className="mt-6 inline-flex items-center gap-2 border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-bold text-[var(--color-primary-dark)]">
        <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
        {brand?.is_verified ? "Fıstık360 onaylı marka" : "Marka doğrulaması bekleniyor"}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="border-y border-[var(--color-border)] py-5"><p className="data-label">Aktif ürünler</p><p className="mt-2 text-3xl font-bold tabular-nums">{activeProducts ?? 0}</p></div>
        <div className="border-y border-[var(--color-border)] py-5"><p className="data-label">Marka mağazası</p><p className="mt-2 text-xl font-bold">{brand?.is_active && brand?.is_verified ? "Yayında" : "Kontrol ediliyor"}</p></div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold">Hızlı işlemler</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/dashboard/partner/products/new" className="button-primary">+ Ürün ekle</Link>
          <Link href="/dashboard/partner/products" className="button-secondary">Ürünlerimi gör</Link>
          {brand && <Link href={`/marka/${brand.slug}`} className="button-secondary">Marka mağazamı gör</Link>}
        </div>
      </div>
    </div>
  );
}
