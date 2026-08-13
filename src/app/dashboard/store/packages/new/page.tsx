import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-ui";
import { StorePackageForm } from "@/components/store-catalog-form";
import { requireRole } from "@/lib/auth";

export default async function NewStorePackagePage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  return (
    <div className="space-y-7">
      <DashboardPageHeader eyebrow="Hazır seçkiler" title="Yeni paket" />
      <StorePackageForm />
    </div>
  );
}
