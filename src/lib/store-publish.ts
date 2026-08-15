import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type StorePlatformStatus = "PENDING_ONBOARDING" | "ACTIVE" | "SUSPENDED";
export type OnboardingStatus = "IN_PROGRESS" | "READY_TO_PUBLISH" | "COMPLETED" | "CANCELLED";
export type OnboardingStep =
  | "STORE_PROFILE"
  | "PRIMARY_SERVICE_AREA"
  | "DELIVERY_AND_PAYMENT"
  | "CATALOG"
  | "REVIEW"
  | "COMPLETED";

export interface PublishCheck {
  key: "PRIMARY_SERVICE_AREA" | "SELLABLE_PRODUCT" | "DELIVERY_SETTINGS" | "PAYMENT_METHOD" | "BANK_ACCOUNT";
  label: string;
  description: string;
  ready: boolean;
  href: string;
  actionLabel: string;
}

export interface StorePublishState {
  store: {
    id: string;
    name: string;
    isActive: boolean;
    platformStatus: StorePlatformStatus;
    publishedAt: string | null;
  } | null;
  onboarding: {
    id: string;
    status: OnboardingStatus;
    currentStep: OnboardingStep;
    completedAt: string | null;
  } | null;
  checks: PublishCheck[];
  allReady: boolean;
}

export async function getStorePublishState(supabase: SupabaseClient, userId: string): Promise<StorePublishState> {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, is_active, platform_status, published_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (storeError) throw new Error("Mağaza yayın durumu okunamadı.");
  if (!store) return { store: null, onboarding: null, checks: [], allReady: false };

  const [areaResult, productResult, deliveryResult, paymentResult, bankResult, onboardingResult] = await Promise.all([
    supabase
      .from("store_neighborhoods")
      .select("id")
      .eq("store_id", store.id)
      .eq("is_primary", true)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("retail_products")
      .select("id")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("is_in_stock", true)
      .limit(1)
      .maybeSingle(),
    supabase.from("store_delivery_settings").select("store_id").eq("store_id", store.id).maybeSingle(),
    supabase
      .from("store_payment_settings")
      .select("cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase
      .from("store_bank_accounts")
      .select("id")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("seller_onboardings")
      .select("id, status, current_step, completed_at")
      .eq("user_id", userId)
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  if (
    areaResult.error ||
    productResult.error ||
    deliveryResult.error ||
    paymentResult.error ||
    bankResult.error ||
    onboardingResult.error
  ) {
    throw new Error("Mağaza yayın kontrol listesi okunamadı.");
  }

  const payment = paymentResult.data;
  const hasPaymentMethod = Boolean(
    payment && (payment.cash_on_delivery || payment.card_on_delivery || payment.bank_transfer),
  );
  const checks: PublishCheck[] = [
    {
      key: "PRIMARY_SERVICE_AREA",
      label: "Ana hizmet mahallesi",
      description: "Aktif ana mahalleniz seçilmiş olmalı.",
      ready: Boolean(areaResult.data),
      href: "/dashboard/store/neighborhoods",
      actionLabel: "Mahalle seç",
    },
    {
      key: "SELLABLE_PRODUCT",
      label: "Satılabilir ürün",
      description: "Aktif ve stokta en az bir ürününüz olmalı.",
      ready: Boolean(productResult.data),
      href: "/dashboard/store/new",
      actionLabel: "Ürün seç",
    },
    {
      key: "DELIVERY_SETTINGS",
      label: "Teslimat ayarları",
      description: "Minimum sepet ve teslimat kuralları hazır olmalı.",
      ready: Boolean(deliveryResult.data),
      href: "/dashboard/store/delivery",
      actionLabel: "Teslimatı ayarla",
    },
    {
      key: "PAYMENT_METHOD",
      label: "Ödeme yöntemi",
      description: "En az bir ödeme yöntemi açık olmalı.",
      ready: hasPaymentMethod,
      href: "/dashboard/store/delivery",
      actionLabel: "Ödemeyi ayarla",
    },
    {
      key: "BANK_ACCOUNT",
      label: "Havale hesabı",
      description: payment?.bank_transfer
        ? "Havale için aktif varsayılan IBAN bulunmalı."
        : "Havale kapalı; banka hesabı zorunlu değil.",
      ready: !payment?.bank_transfer || Boolean(bankResult.data),
      href: "/dashboard/store/delivery",
      actionLabel: "IBAN ekle",
    },
  ];

  return {
    store: {
      id: store.id,
      name: store.name,
      isActive: store.is_active,
      platformStatus: store.platform_status as StorePlatformStatus,
      publishedAt: store.published_at,
    },
    onboarding: onboardingResult.data
      ? {
          id: onboardingResult.data.id,
          status: onboardingResult.data.status as OnboardingStatus,
          currentStep: onboardingResult.data.current_step as OnboardingStep,
          completedAt: onboardingResult.data.completed_at,
        }
      : null,
    checks,
    allReady: checks.every((check) => check.ready),
  };
}
