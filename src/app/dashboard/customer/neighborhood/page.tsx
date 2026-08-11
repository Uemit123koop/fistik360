import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCustomerCart } from "@/lib/cart";

export default async function CustomerNeighborhoodPage() {
  const user = await requireRole(["CUSTOMER"]);
  if (!user) notFound();

  // `profiles` tablosunda mahalle tercihi kolonu YOK; kalıcı bir tercih kaydetmek
  // migration gerektirir. Teslimat bölgesi bugün sepetin kendisinde tutuluyor
  // (`carts.store_neighborhood_id`), bu yüzden ekran mevcut gerçeği gösterir.
  const cart = await getCustomerCart(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Müşteri paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Mahalle seçimi</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">
          Fıstık360&apos;ta teslimat bölgesi sepete bağlıdır: bir mağazadan alışverişe başladığında o mağazanın hizmet
          verdiği mahalle sepetine işlenir.
        </p>
      </div>

      {cart ? (
        <div className="rounded-[18px] border border-[var(--color-border)] bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[var(--color-muted-text)]">Aktif sepetin</p>
          <p className="mt-2 text-lg font-bold">{cart.serviceArea.label}</p>
          <p className="mt-1 text-sm text-[var(--color-muted-text)]">{cart.store.name} · {cart.items.length} kalem</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sepet" className="button-primary">Sepete git</Link>
            <Link href="/magazalar" className="button-secondary">Başka mağaza seç</Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--color-muted-text)]">
            Başka bir mahalledeki mağazadan alışveriş yapmak istersen mevcut sepetin arşivlenir ve yenisi açılır.
          </p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-[#efe5d0] bg-[#fffaf2] p-6 text-center">
          <p className="text-[#6b5a43]">Aktif sepetin yok. Mahalleni seçerek sana teslimat yapan mağazaları görebilirsin.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/mahalle" className="button-primary">Mahalleni seç</Link>
            <Link href="/magazalar" className="button-secondary">Tüm mağazalar</Link>
          </div>
        </div>
      )}
    </div>
  );
}
