import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { OrderCard } from "@/components/order-card";
import { requireRole } from "@/lib/auth";
import { getOrderById } from "@/lib/orders-server";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/admin/orders" className="text-link text-xs">← Siparişler</Link>
        <DashboardPageHeader eyebrow="Admin paneli" title={order.orderNumber} description="Salt okunur — durum değişikliği mağaza/müşteri panelinden yapılır." />
      </div>
      <OrderCard order={order} actor="admin" />
    </div>
  );
}
