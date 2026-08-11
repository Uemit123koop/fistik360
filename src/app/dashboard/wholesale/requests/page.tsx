import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function WholesaleRequestsPage() {
  const user = await requireRole(["WHOLESALE_SELLER"]); if (!user) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase.from("wholesale_products").select("id, name").eq("seller_id", user.id);
  const ids = (products ?? []).map((item) => item.id); const names = new Map((products ?? []).map((item) => [item.id, item.name]));
  const { data: requests } = ids.length ? await supabase.from("wholesale_inquiries").select("id, wholesale_product_id, message, status, created_at").in("wholesale_product_id", ids).order("created_at", { ascending: false }) : { data: [] };
  return <div><p className="eyebrow">Kuruyemişçilerden</p><h1 className="mt-2 text-3xl font-bold">Alım talepleri</h1><div className="mt-7 space-y-3">{requests?.length ? requests.map((request) => <article key={request.id} className="rounded-[16px] border border-[var(--color-border)] p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">{names.get(request.wholesale_product_id) ?? "Toptan ürün"}</h2><span className="chip">{request.status}</span></div><p className="mt-3 text-sm leading-6 text-[var(--color-muted-text)]">{request.message}</p></article>) : <p className="rounded-[16px] border border-dashed border-[var(--color-border)] p-6 text-[var(--color-muted-text)]">Henüz alım talebi yok.</p>}</div></div>;
}

