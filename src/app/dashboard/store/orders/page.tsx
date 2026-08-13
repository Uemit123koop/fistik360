import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderCard } from "@/components/order-card";
import { ClipboardListIcon, DashboardEmptyState, DashboardPageHeader, DashboardStatCard, ReceiptIcon } from "@/components/dashboard-ui";
import { PackageIcon } from "@/components/marketplace-ui";
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
      <DashboardPageHeader
        eyebrow="Kuruyemişçi paneli"
        title="Siparişler"
        description="Sipariş durumunu ilerlettikçe müşteri kendi panelinden aynı durumu görür."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStatCard
          icon={<ClipboardListIcon />}
          label="Açık sipariş"
          value={String(open.length)}
          note={Object.entries(counts).map(([status, count]) => `${ORDER_STATUS_LABELS[status as OrderStatus]}: ${count}`).join(" · ") || "Bekleyen yok"}
          tone={open.length > 0 ? "warning" : "default"}
        />
        <DashboardStatCard icon={<PackageIcon className="h-4.5 w-4.5" />} label="Toplam sipariş" value={String(orders.length)} note="Son 60 kayıt" tone="info" />
        <DashboardStatCard icon={<ReceiptIcon />} label="Teslim edilen ciro" value={moneyFormatter.format(revenue)} note="Teslimat ücreti dahil" tone="success" />
      </div>

      {orders.length === 0 ? (
        <DashboardEmptyState
          icon={<ClipboardListIcon className="h-6 w-6" />}
          title="Henüz sipariş yok"
          description="Vitrinin yayında ve ürünlerin aktifse siparişler buraya düşer."
          action={<Link href="/dashboard/store/products" className="button-primary">Ürünlerimi yönet</Link>}
        />
      ) : (
        <>
          <section aria-labelledby="open-orders-title">
            <h2 id="open-orders-title" className="text-xl font-bold text-[var(--color-ink)]">Açık siparişler</h2>
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
              <h2 id="closed-orders-title" className="text-xl font-bold text-[var(--color-ink)]">Kapanan siparişler</h2>
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
