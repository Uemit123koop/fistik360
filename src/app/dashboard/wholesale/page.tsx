import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function WholesaleDashboardPage() {
  const user = await requireRole(["WHOLESALE_SELLER"]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Toptancı paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Toptan ürünlerim</h1>
      </div>
      <div className="rounded-[24px] border border-[#efe5d0] bg-[#fffaf2] p-6">
        <p className="text-[#6b5a43]">Yeni ürün eklemek için “Yeni Toptan Ürün” sayfasını kullanın. Talep akışını burada takip edebilirsiniz.</p>
      </div>
    </div>
  );
}
