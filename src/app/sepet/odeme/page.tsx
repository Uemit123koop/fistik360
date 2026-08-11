import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import { SiteShell } from "@/components/site-shell";
import { getServerUser } from "@/lib/auth";
import { getCustomerCart } from "@/lib/cart";
import { canStoreReceiveOrders, storeUnavailableMessage, type PaymentMethod } from "@/lib/orders";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const money = (value: number) => moneyFormatter.format(value);

export default async function CheckoutPage() {
  const user = await getServerUser();
  if (!user) redirect("/giris?next=/sepet/odeme");
  if (user.role !== "CUSTOMER") redirect("/dashboard");

  const cart = await getCustomerCart(user.id);
  if (!cart || cart.items.length === 0) redirect("/sepet");

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: payment }, { data: profile }] = await Promise.all([
    supabase.from("stores").select("id, name, is_active, platform_status").eq("id", cart.store.id).maybeSingle(),
    supabase
      .from("store_payment_settings")
      .select("cash_on_delivery, card_on_delivery, bank_transfer")
      .eq("store_id", cart.store.id)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const availableMethods: PaymentMethod[] = [
    ...(payment?.cash_on_delivery ? (["CASH_ON_DELIVERY"] as const) : []),
    ...(payment?.card_on_delivery ? (["CARD_ON_DELIVERY"] as const) : []),
    ...(payment?.bank_transfer ? (["BANK_TRANSFER"] as const) : []),
  ];

  let blocked: string | null = null;
  if (!canStoreReceiveOrders(store)) blocked = storeUnavailableMessage(store);
  else if (cart.totals.minimumRemaining > 0) {
    blocked = `Minimum sepet tutarına ${money(cart.totals.minimumRemaining)} kaldı; sipariş verilemiyor.`;
  } else if (cart.warning) blocked = cart.warning;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Son adım</p>
            <h1 className="mt-2 font-serif text-4xl font-bold tracking-[-0.025em] sm:text-5xl">Siparişi tamamla</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="chip"><ShieldIcon className="h-4 w-4" /> {cart.store.name}</span>
              <span className="chip"><MapPinIcon className="h-4 w-4" /> {cart.serviceArea.label}</span>
            </div>
          </div>
          <Link href="/sepet" className="button-secondary">Sepete dön</Link>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7" aria-labelledby="checkout-form-title">
            <h2 id="checkout-form-title" className="text-xl font-bold">Teslimat ve ödeme</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
              Sipariş {cart.serviceArea.label} bölgesine teslim edilir. Ödeme yöntemleri mağazanın tanımladığı seçeneklerden gelir.
            </p>
            <div className="mt-6">
              <CheckoutForm availableMethods={availableMethods} defaultName={profile?.full_name ?? ""} blocked={blocked} />
            </div>
          </section>

          <aside className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-28" aria-labelledby="checkout-summary-title">
            <h2 id="checkout-summary-title" className="text-xl font-bold">Sipariş özeti</h2>
            <ul className="mt-4 space-y-3 border-b border-[var(--color-border-soft)] pb-4 text-sm">
              {cart.items.map((item) => (
                <li key={item.cartItemId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="text-xs text-[var(--color-muted-text)]">{item.quantity} × {money(item.price)}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{money(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Ara toplam</dt><dd className="font-bold tabular-nums">{money(cart.totals.subtotal)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Teslimat</dt><dd className="font-bold tabular-nums">{cart.totals.deliveryFee === 0 ? "Ücretsiz" : money(cart.totals.deliveryFee)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-4 text-base"><dt className="font-bold">Toplam</dt><dd className="text-xl font-extrabold tabular-nums text-[var(--color-primary-dark)]">{money(cart.totals.total)}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
