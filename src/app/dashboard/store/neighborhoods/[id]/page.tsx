import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { NeighborhoodSettingsForm } from "@/components/neighborhood-settings-form";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function NeighborhoodSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!store) notFound();

  const { data: neighborhood } = await supabase
    .from("store_neighborhoods")
    .select("id, neighborhood, district, province")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!neighborhood) notFound();

  const [deliveryResult, paymentResult, overrideResult] = await Promise.all([
    supabase
      .from("store_delivery_settings")
      .select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_payment_settings")
      .select("cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_neighborhood_settings")
      .select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold, cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_neighborhood_id", neighborhood.id)
      .maybeSingle(),
  ]);

  if (!deliveryResult.data || !paymentResult.data) throw new Error("Mağaza ayarları henüz oluşturulmamış.");

  const override = overrideResult.data;
  const effective = override ?? {
    minimum_order_amount: deliveryResult.data.minimum_order_amount,
    standard_delivery_fee: deliveryResult.data.standard_delivery_fee,
    free_delivery_threshold: deliveryResult.data.free_delivery_threshold,
    cash_on_delivery: paymentResult.data.cash_on_delivery,
    card_on_delivery: paymentResult.data.card_on_delivery,
    bank_transfer: paymentResult.data.bank_transfer,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/store/neighborhoods" className="text-link text-xs">← Mahallelerim</Link>
        <DashboardPageHeader
          eyebrow="Mahalleye özel ayar"
          title={`${neighborhood.neighborhood} Mahallesi`}
          description={`${neighborhood.district}, ${neighborhood.province} — teslimat ve ödeme ayarlarını bu mahalleye özel yapabilir, ya da mağaza varsayılanında bırakabilirsin.`}
        />
      </div>

      <NeighborhoodSettingsForm
        neighborhoodId={neighborhood.id}
        neighborhoodName={neighborhood.neighborhood}
        initialHasOverride={Boolean(override)}
        initial={{
          minimumOrderAmount: Number(effective.minimum_order_amount),
          standardDeliveryFee: Number(effective.standard_delivery_fee),
          freeDeliveryThreshold: effective.free_delivery_threshold === null ? null : Number(effective.free_delivery_threshold),
          cashOnDelivery: effective.cash_on_delivery,
          cardOnDelivery: effective.card_on_delivery,
          bankTransfer: effective.bank_transfer,
        }}
      />
    </div>
  );
}
