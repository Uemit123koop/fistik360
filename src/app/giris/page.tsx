import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="w-full max-w-md rounded-[28px] border border-[#e8dcc5] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Giriş</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Fıstık360’a giriş yapın</h1>
        <p className="mt-3 text-sm text-[#6b5a43]">Ürün eklemek, paket oluşturmak veya toptan pazara girmek için giriş yapın.</p>
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-4 text-sm text-[#6b5a43]">
            <p className="font-semibold text-[#2b231b]">Demo kullanıcılar</p>
            <p className="mt-1">Admin: admin@fistik360.com</p>
            <p>Kuruyemişçi: store@fistik360.com</p>
            <p>Toptancı: wholesale@fistik360.com</p>
          </div>
          <button className="w-full rounded-full bg-[#4f6b3c] px-4 py-3 font-semibold text-white transition hover:bg-[#3f592f]">
            E-posta ile devam et
          </button>
          <Link href="/" className="block text-center text-sm font-semibold text-[#4f6b3c]">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
