import { notFound } from "next/navigation";
import { StoreDeliverySettingsForm } from "@/components/store-delivery-settings-form";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StoreDeliveryPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (storeError) throw new Error("Mağaza bilgisi okunamadı.");
  if (!store) notFound();

  const [deliveryResult, paymentResult, accountsResult] = await Promise.all([
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
      .from("store_bank_accounts")
      .select("id, account_holder_name, iban, is_default, is_active, created_at")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (deliveryResult.error || paymentResult.error || accountsResult.error) {
    throw new Error("Teslimat ve ödeme ayarları okunamadı.");
  }
  if (!deliveryResult.data || !paymentResult.data) {
    throw new Error("Mağaza ayarları henüz oluşturulmamış.");
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Sipariş ayarları</p>
        <h1 className="mt-2 text-3xl font-bold">Teslimat ve ödeme</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
          {store.name} için minimum sepeti, teslimat ücretini ve müşterilerin ödeme seçeneklerini yönetin.
          Kaydettiğiniz değişiklikler sepet ve ödeme ekranına yansır.
        </p>
      </div>

      <StoreDeliverySettingsForm
        initial={{
          delivery: {
            minimumOrderAmount: Number(deliveryResult.data.minimum_order_amount),
            standardDeliveryFee: Number(deliveryResult.data.standard_delivery_fee),
            freeDeliveryThreshold:
              deliveryResult.data.free_delivery_threshold === null
                ? null
                : Number(deliveryResult.data.free_delivery_threshold),
          },
          payment: {
            cashOnDelivery: paymentResult.data.cash_on_delivery,
            cardOnDelivery: paymentResult.data.card_on_delivery,
            bankTransfer: paymentResult.data.bank_transfer,
          },
          bankAccounts: (accountsResult.data ?? []).map((account) => ({
            id: account.id,
            accountHolderName: account.account_holder_name,
            iban: account.iban,
            isDefault: account.is_default,
            isActive: account.is_active,
            createdAt: account.created_at,
          })),
        }}
      />
    </div>
  );
}
