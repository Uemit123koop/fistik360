import "server-only";

import type { GuestCartEntry } from "@/lib/guest-cart";
import type { CartView, CartViewItem } from "@/lib/cart";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Resolves a client-held guest cart (product/package ids only) into the same
// CartView shape getCustomerCart() returns, using live DB prices/availability
// — never trusts client-cached name/price. Single-store only, same invariant
// as the real cart_items table.
export async function resolveGuestCart(entries: GuestCartEntry[]): Promise<CartView | null> {
  if (entries.length === 0) return null;

  const storeId = entries[0].storeId;
  const serviceAreaId = entries[0].serviceAreaId;
  const admin = createSupabaseAdminClient();

  const [{ data: store }, { data: area }, { data: delivery }, { data: products }, { data: packages }] =
    await Promise.all([
      admin.from("stores").select("id, name, logo_url").eq("id", storeId).eq("is_active", true).eq("platform_status", "ACTIVE").maybeSingle(),
      admin.from("store_neighborhoods").select("id, neighborhood_id, neighborhood").eq("id", serviceAreaId).eq("store_id", storeId).eq("is_active", true).maybeSingle(),
      admin.from("store_delivery_settings").select("minimum_order_amount, standard_delivery_fee, free_delivery_threshold").eq("store_id", storeId).maybeSingle(),
      admin.from("retail_products").select("id, name, description, price, quantity, unit, image_url, is_active, is_in_stock").eq("store_id", storeId).in("id", entries.filter((e) => e.kind === "PRODUCT").map((e) => e.itemId)),
      admin.from("packages").select("id, name, package_type, price, image_url, is_active").eq("store_id", storeId).in("id", entries.filter((e) => e.kind === "PACKAGE").map((e) => e.itemId)),
    ]);

  if (!store || !area) return null;

  const { data: neighborhoodRow } = await admin.from("neighborhoods").select("district_id").eq("id", area.neighborhood_id).maybeSingle();
  const { data: district } = neighborhoodRow
    ? await admin.from("districts").select("name, province_id").eq("id", neighborhoodRow.district_id).maybeSingle()
    : { data: null };
  const { data: province } = district
    ? await admin.from("provinces").select("name").eq("id", district.province_id).maybeSingle()
    : { data: null };

  const items: CartViewItem[] = [];
  for (const entry of entries) {
    if (entry.kind === "PRODUCT") {
      const product = products?.find((p) => p.id === entry.itemId);
      if (!product || !product.is_active || !product.is_in_stock) continue;
      const price = toNumber(product.price);
      items.push({
        id: product.id,
        cartItemId: `guest:PRODUCT:${product.id}`,
        kind: "PRODUCT",
        name: product.name,
        description: product.description,
        price,
        imageUrl: product.image_url,
        detail: `${toNumber(product.quantity)} ${product.unit}`,
        quantity: entry.quantity,
        lineTotal: Math.round(price * entry.quantity * 100) / 100,
      });
    } else {
      const pkg = packages?.find((p) => p.id === entry.itemId);
      if (!pkg || !pkg.is_active) continue;
      const price = toNumber(pkg.price);
      items.push({
        id: pkg.id,
        cartItemId: `guest:PACKAGE:${pkg.id}`,
        kind: "PACKAGE",
        name: pkg.name,
        description: null,
        price,
        imageUrl: pkg.image_url,
        detail: pkg.package_type || "Hazır paket",
        quantity: entry.quantity,
        lineTotal: Math.round(price * entry.quantity * 100) / 100,
      });
    }
  }

  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const minimumOrder = toNumber(delivery?.minimum_order_amount ?? 0);
  const standardFee = toNumber(delivery?.standard_delivery_fee ?? 0);
  const freeThreshold = delivery?.free_delivery_threshold === null || delivery?.free_delivery_threshold === undefined
    ? null
    : toNumber(delivery.free_delivery_threshold);
  const deliveryFee = freeThreshold !== null && subtotal >= freeThreshold ? 0 : standardFee;

  return {
    id: "guest",
    store: { id: store.id, name: store.name, logoUrl: store.logo_url },
    serviceArea: {
      id: area.id,
      neighborhoodId: area.neighborhood_id,
      label: `${area.neighborhood} Mahallesi`,
      neighborhoodName: area.neighborhood,
      districtName: district?.name ?? "",
      provinceName: province?.name ?? "",
    },
    items,
    totals: {
      subtotal,
      deliveryFee,
      total: Math.round((subtotal + deliveryFee) * 100) / 100,
      minimumOrder,
      freeDeliveryThreshold: freeThreshold,
      minimumRemaining: Math.max(0, Math.round((minimumOrder - subtotal) * 100) / 100),
      authoritative: false,
    },
    warning: null,
  };
}
