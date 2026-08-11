import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/orders";

// Okumalar bilerek RLS üzerinden yapılır: `orders_select_related` politikası
// erişimi siparişi veren müşteri, mağaza sahibi ve ADMIN ile sınırlar. Burada
// service_role kullanmak o korumayı devre dışı bırakırdı.

export interface OrderLine {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  sourceType: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerNote: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  bankAccountHolder: string | null;
  bankIban: string | null;
  placedAt: string;
  items: OrderLine[];
}

const ORDER_COLUMNS =
  "id, order_number, status, payment_method, payment_status, store_id, customer_name, customer_phone, delivery_address, customer_note, subtotal_amount, delivery_fee_amount, total_amount, bank_account_holder_snapshot, bank_iban_snapshot, placed_at";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type OrderRow = Record<string, unknown>;

async function decorate(rows: OrderRow[]): Promise<OrderSummary[]> {
  if (rows.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const orderIds = rows.map((row) => String(row.id));
  const storeIds = [...new Set(rows.map((row) => String(row.store_id)))];

  const [{ data: items }, { data: stores }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, order_id, source_type, item_name_snapshot, unit_snapshot, unit_price_snapshot, item_quantity, line_total_amount")
      .in("order_id", orderIds),
    supabase.from("stores").select("id, name").in("id", storeIds),
  ]);

  const storeNames = new Map((stores ?? []).map((store) => [store.id, store.name]));
  const linesByOrder = new Map<string, OrderLine[]>();
  for (const item of items ?? []) {
    const list = linesByOrder.get(item.order_id) ?? [];
    list.push({
      id: item.id,
      name: item.item_name_snapshot,
      unit: item.unit_snapshot ?? "",
      unitPrice: toNumber(item.unit_price_snapshot),
      quantity: toNumber(item.item_quantity),
      lineTotal: toNumber(item.line_total_amount),
      sourceType: item.source_type,
    });
    linesByOrder.set(item.order_id, list);
  }

  return rows.map((row) => ({
    id: String(row.id),
    orderNumber: String(row.order_number),
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as PaymentStatus,
    storeId: String(row.store_id),
    storeName: storeNames.get(String(row.store_id)) ?? "Mağaza",
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    deliveryAddress: String(row.delivery_address),
    customerNote: (row.customer_note as string | null) ?? null,
    subtotal: toNumber(row.subtotal_amount),
    deliveryFee: toNumber(row.delivery_fee_amount),
    total: toNumber(row.total_amount),
    bankAccountHolder: (row.bank_account_holder_snapshot as string | null) ?? null,
    bankIban: (row.bank_iban_snapshot as string | null) ?? null,
    placedAt: String(row.placed_at),
    items: linesByOrder.get(String(row.id)) ?? [],
  }));
}

export async function getCustomerOrders(customerId: string, limit = 30): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Siparişlerin okunamadı.");
  return decorate(data ?? []);
}

export async function getStoreOrders(ownerId: string, limit = 60): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!store) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("store_id", store.id)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Mağaza siparişleri okunamadı.");
  return decorate(data ?? []);
}

export async function getOrderById(orderId: string): Promise<OrderSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", orderId).maybeSingle();
  if (error || !data) return null;
  const [decorated] = await decorate([data]);
  return decorated ?? null;
}
