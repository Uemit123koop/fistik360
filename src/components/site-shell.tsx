import Link from "next/link";

const navItems = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/toptan", label: "Toptan" },
  { href: "/mahalle", label: "Mahalle" },
  { href: "/magazalar", label: "Mağazalar" },
  { href: "/giris", label: "Giriş" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f1e6] text-[#2b231b]">
      <header className="border-b border-[#d8c6a0] bg-[#fffaf2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4f6b3c] text-lg font-semibold text-white">
              F
            </div>
            <div>
              <p className="text-lg font-semibold">Fıstık360</p>
              <p className="text-sm text-[#6b5a43]">Mahallenin kuruyemiş pazarı</p>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[#4f6b3c]">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/giris"
            className="rounded-full bg-[#4f6b3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3f592f]"
          >
            Mağazanı Aç
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#d8c6a0] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-[#6b5a43] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>Fıstık360 — toptan pazaryeri ve mahalle kuruyemişçileri için modern bir ilk MVP.</p>
          <div className="flex gap-4">
            <Link href="/toptan" className="hover:text-[#4f6b3c]">Toptan</Link>
            <Link href="/mahalle" className="hover:text-[#4f6b3c]">Mahalle</Link>
            <Link href="/giris" className="hover:text-[#4f6b3c]">Giriş</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
