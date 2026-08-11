import { OrderStatusActions } from "@/components/order-status-actions";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders";
import type { OrderSummary } from "@/lib/orders-server";

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
const money = (value: number) => moneyFormatter.format(value);
const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: "bg-[#fff5df] text-[#6d4b17]",
  CONFIRMED: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  PREPARING: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  OUT_FOR_DELIVERY: "bg-[#e2edff] text-[#1c3f74]",
  DELIVERED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-red-50 text-red-800",
};

interface Props {
  order: OrderSummary;
  actor: "store" | "customer";
  highlighted?: boolean;
}

export function OrderCard({ order, actor, highlighted = false }: Props) {
  return (
    <article
      className={`rounded-[20px] border bg-white p-5 shadow-[var(--shadow-card)] ${
        highlighted ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]" : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-bold text-[var(--color-primary-dark)]">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-text)]">
            {dateFormatter.format(new Date(order.placedAt))}
            {actor === "customer" ? ` · ${order.storeName}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${STATUS_TONE[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <ul className="mt-4 space-y-2 border-t border-[var(--color-border-soft)] pt-4 text-sm">
        {order.items.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{line.name}</span>
              <span className="text-xs text-[var(--color-muted-text)]">
                {line.quantity} {line.unit || "adet"} × {money(line.unitPrice)}
              </span>
            </span>
            <span className="shrink-0 font-bold tabular-nums">{money(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-[var(--color-border-soft)] pt-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Ara toplam</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Teslimat</dt><dd className="tabular-nums">{order.deliveryFee === 0 ? "Ücretsiz" : money(order.deliveryFee)}</dd></div>
        <div className="flex justify-between gap-4 text-base"><dt className="font-bold">Toplam</dt><dd className="font-extrabold tabular-nums text-[var(--color-primary-dark)]">{money(order.total)}</dd></div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="chip">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
        <span className="chip">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
      </div>

      {order.bankIban && (
        <div className="mt-4 rounded-[14px] border border-dashed border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 text-sm leading-6 text-[var(--color-primary-dark)]">
          <p className="font-bold">Havale bilgileri</p>
          <p className="mt-1">{order.bankAccountHolder}</p>
          <p className="font-mono text-xs">{order.bankIban}</p>
        </div>
      )}

      {actor === "store" && (
        <div className="mt-4 rounded-[14px] bg-[var(--color-surface)] p-4 text-sm leading-6">
          <p className="font-bold">{order.customerName} · {order.customerPhone}</p>
          <p className="mt-1 text-[var(--color-muted-text)]">{order.deliveryAddress}</p>
          {order.customerNote && <p className="mt-2 italic text-[var(--color-muted-text)]">“{order.customerNote}”</p>}
        </div>
      )}

      <OrderStatusActions orderId={order.id} status={order.status} actor={actor} />
    </article>
  );
}
