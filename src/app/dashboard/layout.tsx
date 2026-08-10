import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";

const adminLinks = [
  { href: "/dashboard/admin", label: "Genel Bakış" },
  { href: "/dashboard/admin/users", label: "Kullanıcılar" },
  { href: "/dashboard/admin/stores", label: "Kuruyemişçiler" },
  { href: "/dashboard/admin/wholesalers", label: "Toptancılar" },
  { href: "/dashboard/admin/products", label: "Ürünler" },
  { href: "/dashboard/admin/packages", label: "Paketler" },
];

const wholesaleLinks = [
  { href: "/dashboard/wholesale", label: "Genel Bakış" },
  { href: "/dashboard/wholesale/products", label: "Toptan Ürünlerim" },
  { href: "/dashboard/wholesale/new", label: "Yeni Toptan Ürün" },
  { href: "/dashboard/wholesale/requests", label: "Talepler" },
  { href: "/dashboard/wholesale/profile", label: "Profil" },
];

const storeLinks = [
  { href: "/dashboard/store", label: "Genel Bakış" },
  { href: "/dashboard/store/profile", label: "Mağazam" },
  { href: "/dashboard/store/products", label: "Ürünlerim" },
  { href: "/dashboard/store/new", label: "Yeni Ürün" },
  { href: "/dashboard/store/packages", label: "Paketlerim" },
  { href: "/dashboard/store/packages/new", label: "Paket Oluştur" },
  { href: "/dashboard/store/wholesale", label: "Toptan Pazar" },
  { href: "/dashboard/store/profile", label: "Profil" },
];

const customerLinks = [
  { href: "/dashboard/customer", label: "Profil" },
  { href: "/dashboard/customer/neighborhood", label: "Mahalle seçimi" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "WHOLESALE_SELLER", "NUT_STORE", "CUSTOMER"]);
  if (!user) notFound();

  const links = user.role === "ADMIN"
    ? adminLinks
    : user.role === "WHOLESALE_SELLER"
      ? wholesaleLinks
      : user.role === "NUT_STORE"
        ? storeLinks
        : customerLinks;

  return (
    <div className="min-h-screen bg-[#f7f1e6] text-[#2b231b]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full rounded-[24px] border border-[#e8dcc5] bg-white p-5 shadow-sm lg:w-72">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Fıstık360</p>
            <h2 className="mt-2 text-xl font-semibold">{user.role.replace(/_/g, " ")}</h2>
            <p className="mt-1 text-sm text-[#6b5a43]">{user.email}</p>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block rounded-2xl border border-[#efe5d0] bg-[#fffaf2] px-4 py-3 text-sm font-medium text-[#4f6b3c] transition hover:bg-[#f4e8cc]">
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="flex-1 rounded-[24px] border border-[#e8dcc5] bg-white p-6 shadow-sm">{children}</section>
      </div>
    </div>
  );
}
