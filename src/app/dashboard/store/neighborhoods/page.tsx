import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNeighborhoodForm } from "@/components/add-neighborhood-form";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { MapPinIcon } from "@/components/marketplace-ui";
import { requireRole } from "@/lib/auth";
import { calculatePrice, getActiveAreaCount } from "@/lib/neighborhood-billing";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const money = (value: number) => moneyFormatter.format(value);

export default async function StoreNeighborhoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; status?: string }>;
}) {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: store } = await supabase.from("stores").select("id, name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (!store) notFound();

  const [{ data: areas }, { data: billingAddress }] = await Promise.all([
    supabase
      .from("store_neighborhoods")
      .select("id, province, district, neighborhood, is_primary, is_active, activated_at")
      .eq("store_id", store.id)
      .order("is_primary", { ascending: false })
      .order("activated_at", { ascending: true }),
    supabase
      .from("store_billing_addresses")
      .select("contact_name, address, district, province, postal_code, identity_number")
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  const activeAreas = (areas ?? []).filter((area) => area.is_active);
  const activeCount = await getActiveAreaCount(supabase, store.id);
  // Bugünkü fiyat/indirimle mevcut mahalle sayını yeniden satın alsan ne tutar — geçmiş
  // ödemelerin (ücretsiz plan, farklı tarihli indirimler) yerine güncel bir tahmin.
  const currentMonthly = activeCount > 0 ? await calculatePrice(supabase, activeCount, activeCount, "MONTH") : null;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Mahallelerim"
        title="Hizmet mahallelerin"
        description="İlk mahallen ücretsiz. Her ek mahalle için 899₺/ay (yıllıkta mahalle başına 8990₺); 4+ mahallede %10, 7+'de %15, 11+'de %20 indirim otomatik uygulanır."
      />

      {status === "success" && (
        <p className="rounded-[14px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
          Ödeme alındı, yeni mahallen aktifleşti.
        </p>
      )}
      {status === "failed" && (
        <p className="rounded-[14px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
          Ödeme tamamlanamadı, mahalle eklenmedi. Tekrar deneyebilirsin.
        </p>
      )}

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--color-ink)]">Aktif mahalle sayısı: {activeCount}</p>
            {currentMonthly && (
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-text)]">
                Bugünkü fiyatla {activeCount} mahalle: <strong className="text-[var(--color-primary-dark)]">{money(currentMonthly.amount)}</strong>/ay
                {currentMonthly.discountRate > 0 && <> · %{Math.round(currentMonthly.discountRate * 100)} hacim indirimi uygulanıyor</>}
              </p>
            )}
          </div>
          <Link href="/fiyatlandirma" className="text-link text-xs">Fiyatlandırmayı gör</Link>
        </div>

        <ul className="mt-5 space-y-2">
          {activeAreas.map((area) => (
            <li key={area.id} className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border-soft)] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]">
                <MapPinIcon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-ink)]">{area.neighborhood} Mahallesi</p>
                <p className="text-xs text-[var(--color-muted-text)]">{area.district}, {area.province}</p>
              </div>
              {area.is_primary && (
                <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-extrabold text-white">Ücretsiz · Ana</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--color-ink)]">Yeni mahalle ekle</h2>
        <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted-text)]">
          Mahalleyi seç, dönem ve fatura bilgilerini doldur; İyzico&apos;nun güvenli ödeme sayfasına yönlendirileceksin. Her satın alım seçtiğin dönem
          (1 ay/1 yıl) için tek seferlik bir ödemedir — dönem sonunda otomatik olarak tekrar tahsilat yapılmaz.
        </p>
        <div className="mt-5">
          <AddNeighborhoodForm
            initialBillingAddress={
              billingAddress
                ? {
                    contactName: billingAddress.contact_name,
                    address: billingAddress.address,
                    district: billingAddress.district,
                    province: billingAddress.province,
                    postalCode: billingAddress.postal_code ?? "",
                    identityNumber: billingAddress.identity_number,
                  }
                : null
            }
          />
        </div>
      </section>
    </div>
  );
}
