"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth";
import { type CartItemKind, isUuid } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface AddToCartInput {
  storeId: string;
  serviceAreaId: string;
  itemId: string;
  kind: CartItemKind;
  quantity?: number;
  replaceExisting?: boolean;
}

export interface CartActionResult {
  ok: boolean;
  code?: "AUTH_REQUIRED" | "FORBIDDEN" | "CONFIRM_REPLACEMENT" | "INVALID" | "ERROR";
  message: string;
}

function refreshCartViews(storeId?: string) {
  revalidatePath("/sepet");
  if (storeId) revalidatePath(`/magaza/${storeId}`);
  revalidatePath("/", "layout");
}

function safeQuantity(value: number | undefined) {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value < 1 || value > 99) return null;
  return value;
}

export async function addToCartAction(input: AddToCartInput): Promise<CartActionResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Sepete eklemek için giriş yapmalısın." };
  }
  if (user.role !== "CUSTOMER") {
    return { ok: false, code: "FORBIDDEN", message: "Sepet yalnız tüketici hesaplarında kullanılabilir." };
  }

  const quantity = safeQuantity(input.quantity);
  if (
    !isUuid(input.storeId) ||
    !isUuid(input.serviceAreaId) ||
    !isUuid(input.itemId) ||
    !quantity ||
    !["PRODUCT", "PACKAGE"].includes(input.kind)
  ) {
    return { ok: false, code: "INVALID", message: "Sepet isteği geçersiz." };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: serviceArea }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name")
      .eq("id", input.storeId)
      .eq("is_active", true)
      .eq("platform_status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("store_neighborhoods")
      .select("id")
      .eq("id", input.serviceAreaId)
      .eq("store_id", input.storeId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!store || !serviceArea) {
    return { ok: false, code: "INVALID", message: "Mağaza bu teslimat bölgesinde aktif değil." };
  }

  const itemQuery = input.kind === "PRODUCT"
    ? supabase
        .from("retail_products")
        .select("id")
        .eq("id", input.itemId)
        .eq("store_id", input.storeId)
        .eq("is_active", true)
        .eq("is_in_stock", true)
        .maybeSingle()
    : supabase
        .from("packages")
        .select("id")
        .eq("id", input.itemId)
        .eq("store_id", input.storeId)
        .eq("is_active", true)
        .maybeSingle();
  const { data: availableItem } = await itemQuery;
  if (!availableItem) {
    return { ok: false, code: "INVALID", message: "Bu ürün şu anda satışta değil." };
  }

  const { data: existingCart, error: cartReadError } = await supabase
    .from("carts")
    .select("id, store_id, store_neighborhood_id")
    .eq("customer_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  let cart = existingCart;

  if (cartReadError) {
    return { ok: false, code: "ERROR", message: "Aktif sepet okunamadı." };
  }

  if (cart && cart.store_id !== input.storeId && !input.replaceExisting) {
    const { data: currentStore } = await supabase
      .from("stores")
      .select("name")
      .eq("id", cart.store_id)
      .maybeSingle();
    return {
      ok: false,
      code: "CONFIRM_REPLACEMENT",
      message: `Sepetinde ${currentStore?.name ?? "başka bir mağazadan"} ürünler var. Sepeti ${store.name} ürünleriyle değiştirmek istiyor musun?`,
    };
  }

  if (cart && cart.store_id !== input.storeId) {
    const oldCartId = cart.id;
    const { error: abandonError } = await supabase
      .from("carts")
      .update({ status: "ABANDONED" })
      .eq("id", oldCartId)
      .eq("customer_id", user.id)
      .eq("status", "ACTIVE");
    if (abandonError) {
      return { ok: false, code: "ERROR", message: "Mevcut sepet korunurken yeni mağazaya geçilemedi." };
    }

    const { data: newCart, error: createError } = await supabase
      .from("carts")
      .insert({
        customer_id: user.id,
        store_id: input.storeId,
        store_neighborhood_id: input.serviceAreaId,
      })
      .select("id, store_id, store_neighborhood_id")
      .single();
    if (createError || !newCart) {
      await supabase
        .from("carts")
        .update({ status: "ACTIVE" })
        .eq("id", oldCartId)
        .eq("customer_id", user.id)
        .eq("status", "ABANDONED");
      return { ok: false, code: "ERROR", message: "Yeni sepet oluşturulamadı; önceki sepetin korundu." };
    }
    cart = newCart;
  }

  if (!cart) {
    const { data: createdCart, error: createError } = await supabase
      .from("carts")
      .insert({
        customer_id: user.id,
        store_id: input.storeId,
        store_neighborhood_id: input.serviceAreaId,
      })
      .select("id, store_id, store_neighborhood_id")
      .single();
    if (createError || !createdCart) {
      return { ok: false, code: "ERROR", message: "Sepet oluşturulamadı." };
    }
    cart = createdCart;
  } else if (cart.store_neighborhood_id !== input.serviceAreaId) {
    const { data: updatedCart, error: areaError } = await supabase
      .from("carts")
      .update({ store_neighborhood_id: input.serviceAreaId })
      .eq("id", cart.id)
      .eq("customer_id", user.id)
      .eq("status", "ACTIVE")
      .select("id, store_id, store_neighborhood_id")
      .single();
    if (areaError || !updatedCart) {
      return { ok: false, code: "ERROR", message: "Teslimat bölgesi sepete uygulanamadı." };
    }
    cart = updatedCart;
  }

  const sourceColumn = input.kind === "PRODUCT" ? "retail_product_id" : "package_id";
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, item_quantity")
    .eq("cart_id", cart.id)
    .eq(sourceColumn, input.itemId)
    .maybeSingle();

  const itemMutation = existing
    ? supabase
        .from("cart_items")
        .update({ item_quantity: Math.min(99, Number(existing.item_quantity) + quantity) })
        .eq("id", existing.id)
    : supabase.from("cart_items").insert({
        cart_id: cart.id,
        [sourceColumn]: input.itemId,
        item_quantity: quantity,
      });
  const { error: itemError } = await itemMutation;
  if (itemError) {
    return { ok: false, code: "ERROR", message: "Ürün sepete eklenemedi." };
  }

  refreshCartViews(input.storeId);
  return { ok: true, message: `${store.name} ürününüz sepete eklendi.` };
}

export async function updateCartItemAction(
  cartItemId: string,
  quantity: number,
): Promise<CartActionResult> {
  const user = await getServerUser();
  if (!user) return { ok: false, code: "AUTH_REQUIRED", message: "Oturum bulunamadı." };
  if (user.role !== "CUSTOMER") {
    return { ok: false, code: "FORBIDDEN", message: "Sepet yalnız tüketici hesaplarında kullanılabilir." };
  }
  if (!isUuid(cartItemId) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    return { ok: false, code: "INVALID", message: "Ürün adedi geçersiz." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from("cart_items")
    .select("id, cart_id")
    .eq("id", cartItemId)
    .maybeSingle();
  if (!item) return { ok: false, code: "INVALID", message: "Sepet ürünü bulunamadı." };

  const { data: cart } = await supabase
    .from("carts")
    .select("id, store_id")
    .eq("id", item.cart_id)
    .eq("customer_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!cart) return { ok: false, code: "FORBIDDEN", message: "Bu sepeti değiştirme yetkin yok." };

  const mutation = quantity === 0
    ? supabase.from("cart_items").delete().eq("id", cartItemId).eq("cart_id", cart.id)
    : supabase.from("cart_items").update({ item_quantity: quantity }).eq("id", cartItemId).eq("cart_id", cart.id);
  const { error } = await mutation;
  if (error) return { ok: false, code: "ERROR", message: "Sepet güncellenemedi." };

  refreshCartViews(cart.store_id);
  return { ok: true, message: quantity === 0 ? "Ürün sepetten çıkarıldı." : "Ürün adedi güncellendi." };
}
