import { redirect } from "next/navigation";
import { AdminLoginCard } from "@/components/admin-login-card";
import { BrandLogo } from "@/components/brand-logo";
import { ShieldIcon } from "@/components/marketplace-ui";
import { getServerUser } from "@/lib/auth";

export const metadata = {
  title: "Admin girişi",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getServerUser();
  if (user?.role === "ADMIN") redirect("/dashboard/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-10">
      <div className="w-full max-w-md rounded-[24px] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-soft)] sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="h-12 w-36" preload sizes="144px" />
          <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]"><ShieldIcon /></span>
          <h1 className="mt-3 text-xl font-bold text-[var(--color-ink)]">Admin girişi</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-text)]">Yalnız yetkili e-posta adresi kod alabilir.</p>
        </div>
        <AdminLoginCard />
      </div>
    </div>
  );
}
