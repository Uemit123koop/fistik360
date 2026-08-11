import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderCard } from "@/components/order-card";
import { requireRole } from "@/lib/auth";
import { isTerminal, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { getStoreOrders } from "@/lib/orders-server";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default async function StoreOrdersPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();

  const orders = await getStoreOrders(user.id);
  const open = orders.filter((order) => !isTerminal(order.status));
  const closed = orders.filter((order) => isTerminal(order.status));
  const revenue = orders
    .filter((order) => order.status === "DELIVERED")
    .reduce((sum, order) => sum + order.total, 0);

  const counts = open.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Kuruyemişçi paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Siparişler</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          Sipariş durumunu ilerlettikçe müşteri kendi panelinden aynı durumu görür.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Açık sipariş</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{open.length}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">
            {Object.entries(counts).map(([status, count]) => `${ORDER_STATUS_LABELS[status as OrderStatus]}: ${count}`).join(" · ") || "Bekleyen yok"}
          </p>
        </article>
        <article className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Toplam sipariş</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{orders.length}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">Son 60 kayıt</p>
        </article>
        <article className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Teslim edilen ciro</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--color-primary-dark)]">{moneyFormatter.format(revenue)}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">Teslimat ücreti dahil</p>
        </article>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[24px] border border-[#efe5d0] bg-[#fffaf2] p-6 text-center">
          <p className="text-[#6b5a43]">Henüz sipariş yok. Vitrinin yayında ve ürünlerin aktifse siparişler buraya düşer.</p>
          <Link href="/dashboard/store/products" className="button-primary mt-5">Ürünlerimi yönet</Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="open-orders-title">
            <h2 id="open-orders-title" className="text-xl font-bold">Açık siparişler</h2>
            {open.length === 0 ? (
              <p className="mt-3 rounded-[14px] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-muted-text)]">
                Bekleyen sipariş yok.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {open.map((order) => <OrderCard key={order.id} order={order} actor="store" />)}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section aria-labelledby="closed-orders-title">
              <h2 id="closed-orders-title" className="text-xl font-bold">Kapanan siparişler</h2>
              <div className="mt-4 space-y-4">
                {closed.map((order) => <OrderCard key={order.id} order={order} actor="store" />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
