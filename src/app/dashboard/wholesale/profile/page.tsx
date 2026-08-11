import Link from "next/link";
import { notFound } from "next/navigation";
import { WholesaleProfileForm } from "@/components/wholesale-profile-form";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function WholesaleProfilePage() {
  const user = await requireRole(["WHOLESALE_SELLER"]); if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("wholesale_seller_profiles").select("business_name, slug, description, phone, logo_url, cover_url, product_categories, is_active").eq("owner_id", user.id).maybeSingle();
  if (!profile) notFound();
  return <div className="space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Toptancı vitrini</p><h1 className="mt-2 text-3xl font-bold">Profil ve hakkında</h1></div><Link href={`/toptanci/${profile.slug}`} className="button-secondary">Vitrini önizle</Link></div><WholesaleProfileForm initial={{ businessName: profile.business_name, description: profile.description ?? "", phone: profile.phone ?? "", logoUrl: profile.logo_url ?? "", coverUrl: profile.cover_url ?? "", categories: profile.product_categories ?? [], isActive: profile.is_active }} /></div>;
}

