import type { Metadata } from "next";
import { PasswordlessAuthCard } from "@/components/passwordless-auth-card";
import { SellerEntryActions, SellerEntryHashFocus } from "@/components/seller-entry-actions";
import { SellerRegistrationForm } from "@/components/seller-registration-form";
import { PackageIcon, ShieldIcon } from "@/components/marketplace-ui";

export const metadata: Metadata = {
  title: "Giriş Yap veya Mağazanı Aç | Fıstık360",
  description: "Fıstık360 hesabına 6 haneli e-posta koduyla giriş yap veya kuruyemişçi ve toptancı mağazanı aç.",
};

interface SellerEntryPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SellerEntryPage({ searchParams }: SellerEntryPageProps) {
  const { error } = await searchParams;
  const initialError = error === "confirmation" ? "E-posta doğrulama bağlantısı geçersiz veya süresi dolmuş." : "";
  // /auth/confirm, bekleyen satıcı kaydı olan birini bağlantıdan buraya yollar:
  // mağaza kurulumu yalnız kod girilen sekmede tamamlanabilir.
  const sellerOtpRequired = error === "seller-otp-required";

  return (
    <div className="bg-[var(--color-background)]">
      <SellerEntryHashFocus />
      <section className="border-b border-[var(--color-border-soft)] bg-[#12382b] text-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d7ec9c]">Fıstık360 hesabın</p>
            <h1 className="mt-3 max-w-xl font-serif text-3xl font-bold leading-[1.08] tracking-[-0.025em] sm:text-4xl">
              Giriş mi yapacaksın, mağaza mı açacaksın?
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
              Tek sayfada doğru akışa geç. Şifre yok; hesabın 6 haneli e-posta koduyla güvenle açılır.
            </p>
          </div>
          <SellerEntryActions />
        </div>
      </section>

      <section id="login" tabIndex={-1} className="scroll-mt-28 outline-none">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:px-8">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Zaten hesabın var mı?</p>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-[-0.02em] text-[var(--color-ink)] sm:text-4xl">Giriş yap.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-muted-text)]">Kayıtlı e-posta adresine gelen 6 haneli kodla rolüne uygun panele devam et.</p>
            <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-muted-text)]">
              <ShieldIcon className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              Şifresiz, hızlı ve güvenli erişim.
            </div>
          </div>
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
            <PasswordlessAuthCard initialError={initialError} allowRegister={false} />
          </div>
        </div>
      </section>

      <section id="onboarding" tabIndex={-1} className="scroll-mt-28 border-t border-[var(--color-border-soft)] bg-[var(--color-surface-strong)] outline-none">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[0.66fr_1.34fr] lg:items-start lg:px-8">
          <aside className="rounded-[22px] bg-[var(--color-primary-dark)] p-5 text-white shadow-[var(--shadow-soft)] sm:p-7 lg:sticky lg:top-28">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#d7ec9c]">Yeni mağaza</p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight">İşletmeni doğru pazarda büyüt.</h2>
            <p className="mt-3 text-sm leading-6 text-white/72">Kuruyemişçiler tüketiciye, toptancılar doğrulanmış kuruyemişçilere ulaşır.</p>
            <div className="mt-5 space-y-3">
              <div className="flex gap-3 rounded-[15px] bg-white/10 p-4"><ShieldIcon className="h-5 w-5 shrink-0 text-[#d7ec9c]" /><p className="text-sm leading-6"><strong className="block text-white">6 haneli doğrulama</strong>E-posta koduyla güvenli seller hesabı.</p></div>
              <div className="flex gap-3 rounded-[15px] bg-white/10 p-4"><PackageIcon className="h-5 w-5 shrink-0 text-[#d7ec9c]" /><p className="text-sm leading-6"><strong className="block text-white">Katalogdan satış</strong>Ürününü seç, fiyatını belirle, yayınla.</p></div>
            </div>
            <p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-white/65">Kuruyemişçiler için ilk hizmet mahallesi ücretsizdir.</p>
          </aside>
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:p-9">
            {sellerOtpRequired && (
              <p className="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
                <strong className="block">Kaydın henüz tamamlanmadı.</strong>
                E-postadaki bağlantı yerine gelen <strong>6 haneli kodu</strong> aşağıdaki forma gir. Mağaza kurulumun ve
                mahalle seçimin yalnız bu adımda kaydedilir.
              </p>
            )}
            <SellerRegistrationForm />
          </div>
        </div>
      </section>
    </div>
  );
}
