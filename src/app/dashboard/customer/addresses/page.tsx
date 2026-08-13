import { notFound } from "next/navigation";
import { CustomerAddressManager } from "@/components/customer-address-manager";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function CustomerAddressesPage() {
  const user = await requireRole(["CUSTOMER"]);
  if (!user) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select("id, province, district, neighborhood, street, building_no, apartment_no, label, is_default")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Müşteri paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Adreslerim</h1>
        <p className="mt-2 text-sm leading-6 text-[#6b5a43]">
          Kayıtlı teslimat adreslerini buradan yönetebilirsin. Sipariş sırasında da bu listeden seçim yapabilirsin.
        </p>
      </div>
      <CustomerAddressManager initialAddresses={addresses ?? []} />
    </div>
  );
}
