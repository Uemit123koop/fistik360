import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardListIcon, DashboardEmptyState, DashboardPageHeader, DashboardStatCard, ReceiptIcon } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";
import { isTerminal, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { getAllOrders } from "@/lib/orders-server";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: "bg-[#fff5df] text-[#6d4b17]",
  CONFIRMED: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  PREPARING: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  OUT_FOR_DELIVERY: "bg-[#e2edff] text-[#1c3f74]",
  DELIVERED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-800",
};

function isOrderStatusValue(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const { status: statusParam, q } = await searchParams;
  const status = isOrderStatusValue(statusParam) ? statusParam : undefined;
  const orders = await getAllOrders({ status, search: q, limit: 150 });

  const openCount = orders.filter((order) => !isTerminal(order.status)).length;
  const revenue = orders.filter((order) => order.status === "DELIVERED").reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Admin paneli"
        title="Siparişler"
        description="Tüm mağazalardan gelen son 150 sipariş, en yeni önde. Mahalle ve müşteri bilgisiyle birlikte."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStatCard icon={<ClipboardListIcon />} label="Listelenen" value={String(orders.length)} note="Filtreye göre" tone="info" />
        <DashboardStatCard icon={<ClipboardListIcon />} label="Açık sipariş" value={String(openCount)} note="Teslim/iptal edilmemiş" tone={openCount > 0 ? "warning" : "default"} />
        <DashboardStatCard icon={<ReceiptIcon />} label="Teslim edilen ciro" value={moneyFormatter.format(revenue)} note="Bu listedeki DELIVERED toplamı" tone="success" />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-[16px] border border-[var(--color-border)] bg-white p-4" method="get">
        <label className="form-field flex-1 min-w-[220px]" htmlFor="order-search">
          Ara
          <input id="order-search" name="q" defaultValue={q ?? ""} className="form-control" placeholder="Sipariş no, müşteri adı veya telefon" />
        </label>
        <label className="form-field w-full sm:w-56" htmlFor="order-status">
          Durum
          <select id="order-status" name="status" defaultValue={status ?? ""} className="form-control">
            <option value="">Tümü</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="button-primary shrink-0">Filtrele</button>
        {(status || q) && <Link href="/dashboard/admin/orders" className="text-link shrink-0 text-sm">Filtreyi temizle</Link>}
      </form>

      {orders.length === 0 ? (
        <DashboardEmptyState
          icon={<ClipboardListIcon className="h-6 w-6" />}
          title="Sipariş bulunamadı"
          description="Filtreyle eşleşen sipariş yok."
        />
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-[var(--color-border)]">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[var(--color-surface)] text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Sipariş</th>
                <th scope="col" className="px-4 py-3 font-bold">Mağaza · Mahalle</th>
                <th scope="col" className="px-4 py-3 font-bold">Müşteri</th>
                <th scope="col" className="px-4 py-3 font-bold">Durum</th>
                <th scope="col" className="px-4 py-3 font-bold">Ödeme</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--color-border-soft)] hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/admin/orders/${order.id}`} className="font-mono text-xs font-bold text-[var(--color-primary-dark)] hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--color-muted-text)]">{dateFormatter.format(new Date(order.placedAt))}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{order.storeName}</p>
                    <p className="text-xs text-[var(--color-muted-text)]">{order.neighborhoodName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-xs text-[var(--color-muted-text)]">{order.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS_TONE[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-text)]">
                    <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
                    <p>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{moneyFormatter.format(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
