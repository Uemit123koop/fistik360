import { notFound } from "next/navigation";
import { BrandProductForm } from "@/components/brand-product-form";
import { getActivePartner } from "@/lib/partner-auth";

export default async function NewPartnerProductPage() { const access = await getActivePartner(); if (!access) notFound(); return <div><p className="eyebrow">Katalog</p><h1 className="mt-2 text-3xl font-bold">Yeni marka ürünü</h1><p className="mt-3 text-sm text-[var(--color-muted-text)]">Ürünü bir kez tanımlayın; gramaj ve fiyatı varyant olarak yönetin.</p><BrandProductForm /></div>; }
