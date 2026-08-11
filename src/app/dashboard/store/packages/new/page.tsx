import { notFound } from "next/navigation"; import { StorePackageForm } from "@/components/store-catalog-form"; import { requireRole } from "@/lib/auth";
export default async function NewStorePackagePage() { const user = await requireRole(["NUT_STORE"]); if (!user) notFound(); return <div className="space-y-7"><div><p className="eyebrow">Hazır seçkiler</p><h1 className="mt-2 text-3xl font-bold">Yeni paket</h1></div><StorePackageForm /></div>; }

