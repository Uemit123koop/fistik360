import Link from "next/link";

export function WholesaleProductForm() {
  return (
    <div className="rounded-[18px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-5 text-sm leading-6 text-[var(--color-primary-dark)]">
      Ürün adı, kategorisi ve görseli Fıstık360 merkezi kataloğundan gelir; toptan satıcı tarafından değiştirilemez.
      <Link href="/dashboard/wholesale/new" className="ml-1 font-extrabold underline underline-offset-4">Katalogdan ürün seç</Link>
    </div>
  );
}
