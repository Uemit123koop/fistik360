// Sipariş alan-mantığı: durum makinesi ve mağaza uygunluk guard'ı.
// Ortam-bağımsız (saf) — hem API uçları hem sunucu bileşenleri aynı kuralları kullanır.
// Durum kümesi `orders_status_check` kısıtıyla birebir aynıdır; buraya yeni bir durum
// eklemek migration gerektirir.

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "CARD_ON_DELIVERY", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = "PENDING" | "AWAITING_TRANSFER" | "PAID" | "FAILED" | "CANCELLED";

// Geçerli durum geçişleri. Terminal durumların listesi boştur.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Onay bekliyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  OUT_FOR_DELIVERY: "Yolda",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal edildi",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Kapıda nakit",
  CARD_ON_DELIVERY: "Kapıda kart",
  BANK_TRANSFER: "Havale / EFT",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Tahsilat bekliyor",
  AWAITING_TRANSFER: "Havale bekleniyor",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Geçersiz geçişte açıklayıcı mesaj döner; geçerliyse null. */
export function transitionError(from: OrderStatus, to: OrderStatus): string | null {
  if (!isOrderStatus(from)) return `Bilinmeyen mevcut durum: ${from}`;
  if (!isOrderStatus(to)) return `Bilinmeyen hedef durum: ${to}`;
  if (canTransition(from, to)) return null;
  const allowed = nextStatuses(from);
  return allowed.length
    ? `Bu sipariş "${ORDER_STATUS_LABELS[from]}" durumundan yalnız şuraya geçebilir: ${allowed.map((s) => ORDER_STATUS_LABELS[s]).join(", ")}.`
    : `"${ORDER_STATUS_LABELS[from]}" son durumdur; değiştirilemez.`;
}

export function isTerminal(status: OrderStatus): boolean {
  return nextStatuses(status).length === 0;
}

// Bu durumdaki mağaza yeni sipariş alamaz. mahalle360'taki abonelik guard'ının
// fıstık360 karşılığı: orada `subscription_status` + `is_blocked`, burada
// `platform_status` + `is_active`.
export function canStoreReceiveOrders(
  store: { is_active?: boolean | null; platform_status?: string | null } | null | undefined,
): boolean {
  if (!store) return false;
  if (!store.is_active) return false;
  return store.platform_status === "ACTIVE";
}

export function storeUnavailableMessage(
  store: { is_active?: boolean | null; platform_status?: string | null } | null | undefined,
): string {
  if (!store) return "Mağaza bulunamadı.";
  if (store.platform_status === "SUSPENDED") return "Bu mağaza şu anda askıya alınmış; sipariş alınamıyor.";
  if (store.platform_status === "PENDING_ONBOARDING") return "Bu mağaza henüz yayına alınmadı; sipariş alınamıyor.";
  return "Bu mağaza şu anda sipariş almıyor.";
}
