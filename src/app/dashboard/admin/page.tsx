export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#7a5b2d]">Admin paneli</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#2b231b]">Genel bakış</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-5">
          <p className="text-sm text-[#6b5a43]">Aktif mağaza</p>
          <p className="mt-2 text-2xl font-semibold">24</p>
        </div>
        <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-5">
          <p className="text-sm text-[#6b5a43]">Bekleyen toptan talep</p>
          <p className="mt-2 text-2xl font-semibold">8</p>
        </div>
        <div className="rounded-2xl border border-[#efe5d0] bg-[#fffaf2] p-5">
          <p className="text-sm text-[#6b5a43]">Yayınlanan paket</p>
          <p className="mt-2 text-2xl font-semibold">12</p>
        </div>
      </div>
    </div>
  );
}
