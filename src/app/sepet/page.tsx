import Link from "next/link";
import { redirect } from "next/navigation";
import { CartItemControls } from "@/components/cart-ui";
import { MapPinIcon, ShieldIcon } from "@/components/marketplace-ui";
import { SiteShell } from "@/components/site-shell";
import { getServerUser } from "@/lib/auth";
import { getCustomerCart, type CartViewItem } from "@/lib/cart";

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

function money(value: number) {
  return moneyFormatter.format(value);
}

function CartArtwork({ item, index }: { item: CartViewItem; index: number }) {
  const imageUrl = item.imageUrl && (/^https?:\/\//i.test(item.imageUrl) || item.imageUrl.startsWith("/"))
    ? item.imageUrl
    : null;
  return (
    <div
      role="img"
      aria-label={`${item.name} görseli`}
      className="h-24 w-24 shrink-0 rounded-[16px] border border-[var(--color-border-soft)] bg-[#e9dfcf] bg-cover bg-center sm:h-28 sm:w-28"
      style={imageUrl
        ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` }
        : { backgroundImage: `url(/assets/category-atlas.png)`, backgroundSize: "400% 200%", backgroundPosition: `${(index % 4) * 33.333}% ${Math.floor(index / 4) * 100}%` }}
    />
  );
}

export default async function CartPage() {
  const user = await getServerUser();
  if (!user) redirect("/giris?next=/sepet");

  if (user.role !== "CUSTOMER") {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <h1 className="font-serif text-3xl font-bold">Sepet tüketici hesabına özeldir</h1>
            <p className="mt-3 text-[var(--color-muted-text)]">Satıcı ve partner hesapları kendi yönetim panellerinden devam edebilir.</p>
            <Link href="/dashboard" className="button-primary mt-6">Panele dön</Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  const cart = await getCustomerCart(user.id);
  if (!cart || cart.items.length === 0) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:py-20">
          <div className="rounded-[26px] border border-[var(--color-border)] bg-white px-6 py-12 shadow-[var(--shadow-soft)] sm:px-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7"><path d="M3.5 4.5h2l1.7 10.2a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.5L20.5 8H6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" /><circle cx="17.2" cy="19.5" r="1.2" fill="currentColor" /></svg>
            </span>
            <p className="eyebrow mt-5">Sepetin</p>
            <h1 className="mt-2 font-serif text-4xl font-bold">Henüz boş</h1>
            <p className="mx-auto mt-4 max-w-md leading-7 text-[var(--color-muted-text)]">Mahallene teslimat yapan bir mağazadan taze ürün veya hazır paket ekleyebilirsin.</p>
            <Link href="/magazalar" className="button-primary mt-7">Mağazaları keşfet</Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  const progress = cart.totals.minimumOrder > 0
    ? Math.min(100, Math.round((cart.totals.subtotal / cart.totals.minimumOrder) * 100))
    : 100;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border-soft)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Tek mağazalı sepet</p>
            <h1 className="mt-2 font-serif text-4xl font-bold tracking-[-0.025em] sm:text-5xl">Sepetin</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="chip"><ShieldIcon className="h-4 w-4" /> {cart.store.name}</span>
              <span className="chip"><MapPinIcon className="h-4 w-4" /> {cart.serviceArea.label}</span>
            </div>
          </div>
          <Link href={`/magaza/${cart.store.id}`} className="button-secondary">Mağazaya dön</Link>
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="cart-items-title">
            <h2 id="cart-items-title" className="sr-only">Sepet ürünleri</h2>
            <div className="space-y-4">
              {cart.items.map((item, index) => (
                <article key={item.cartItemId} className="rounded-[20px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
                  <div className="flex gap-4 sm:gap-5">
                    <CartArtwork item={item} index={index} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--color-accent)]">{item.kind === "PACKAGE" ? "Paket" : "Ürün"}</p>
                          <h3 className="mt-1 text-lg font-bold text-[var(--color-ink)]">{item.name}</h3>
                          <p className="mt-1 text-sm text-[var(--color-muted-text)]">{item.detail} · {money(item.price)}</p>
                        </div>
                        <p className="text-lg font-extrabold tabular-nums text-[var(--color-primary-dark)]">{money(item.lineTotal)}</p>
                      </div>
                      <div className="mt-4">
                        <CartItemControls cartItemId={item.cartItemId} quantity={item.quantity} itemName={item.name} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-28" aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title" className="text-xl font-bold">Sepet özeti</h2>
            {cart.totals.minimumRemaining > 0 && (
              <div className="mt-4 rounded-[16px] bg-[#fff5df] p-4 text-sm text-[#6d4b17]">
                <p className="font-bold">Minimum tutara {money(cart.totals.minimumRemaining)} kaldı</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" aria-label={`Minimum sepet ilerlemesi yüzde ${progress}`}>
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Ara toplam</dt><dd className="font-bold tabular-nums">{money(cart.totals.subtotal)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--color-muted-text)]">Teslimat</dt><dd className="font-bold tabular-nums">{cart.totals.deliveryFee === 0 ? "Ücretsiz" : money(cart.totals.deliveryFee)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-4 text-base"><dt className="font-bold">Toplam</dt><dd className="text-xl font-extrabold tabular-nums text-[var(--color-primary-dark)]">{money(cart.totals.total)}</dd></div>
            </dl>
            {cart.totals.freeDeliveryThreshold !== null && cart.totals.deliveryFee > 0 && (
              <p className="mt-4 text-xs leading-5 text-[var(--color-muted-text)]">{money(cart.totals.freeDeliveryThreshold)} ve üzeri siparişlerde teslimat ücretsiz.</p>
            )}
            {cart.warning && <p className="mt-4 rounded-[12px] bg-[#fff5df] p-3 text-sm font-semibold text-[#6d4b17]" role="status">{cart.warning}</p>}
            {cart.totals.minimumRemaining > 0 ? (
              <p className="mt-5 rounded-[14px] border border-dashed border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 text-sm leading-6 text-[var(--color-primary-dark)]">
                Siparişi tamamlamak için minimum sepet tutarına ulaşman gerekiyor.
              </p>
            ) : (
              <Link href="/sepet/odeme" className="button-primary mt-5 w-full">Teslimat ve ödemeye geç</Link>
            )}
            <p className="mt-3 text-center text-xs leading-5 text-[var(--color-muted-text)]">
              Sonraki adımda teslimat bilgilerini girip ödeme yöntemini seçeceksin.
            </p>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
