import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderCard } from "@/components/order-card";
import { requireRole } from "@/lib/auth";
import { getCustomerOrders } from "@/lib/orders-server";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireRole(["CUSTOMER"]);
  if (!user) notFound();

  const { placed } = await searchParams;
  const orders = await getCustomerOrders(user.id);
  const placedOrder = placed ? orders.find((order) => order.id === placed) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Müşteri paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Siparişlerim</h1>
      </div>

      {placedOrder && (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-5" role="status">
          <p className="font-bold text-emerald-900">Siparişin alındı · {placedOrder.orderNumber}</p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            {placedOrder.storeName} siparişini onayladığında durumu buradan takip edebilirsin.
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-[24px] border border-[#efe5d0] bg-[#fffaf2] p-6 text-center">
          <p className="text-[#6b5a43]">Henüz siparişin yok.</p>
          <Link href="/magazalar" className="button-primary mt-5">Mağazaları keşfet</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} actor="customer" highlighted={order.id === placed} />
          ))}
        </div>
      )}
    </div>
  );
}
