"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/confirm-modal";

export interface ActiveProductOption {
  id: string;
  name: string;
  price: number;
}

export interface ExistingPackage {
  id: string;
  name: string;
  packageType: string | null;
  imageUrl: string | null;
  price: number;
  discountPercent: number;
  isActive: boolean;
  productIds: string[];
  productNames: string[];
}

const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function PackageForm({
  activeProducts,
  editing,
  onDone,
  onCancel,
}: {
  activeProducts: ActiveProductOption[];
  editing?: ExistingPackage;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(editing);
  const [name, setName] = useState(editing?.name ?? "");
  const [packageType, setPackageType] = useState(editing?.packageType ?? "");
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(editing?.isActive ?? false);
  const [discountPercent, setDiscountPercent] = useState(editing?.discountPercent ?? 0);
  const activeProductIds = new Set(activeProducts.map((product) => product.id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set((editing?.productIds ?? []).filter((id) => activeProductIds.has(id))),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedProducts = activeProducts.filter((product) => selectedIds.has(product.id));
  const subtotal = selectedProducts.reduce((sum, product) => sum + product.price, 0);
  const finalPrice = Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Paket adını gir.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Pakete en az bir ürün seç.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(isEdit ? `/api/store/packages/${editing!.id}` : "/api/store/packages", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          packageType: packageType.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          isActive,
          discountPercent,
          productIds: Array.from(selectedIds),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Paket kaydedilemedi.");
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (activeProducts.length === 0) {
    return (
      <p className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-6 text-[var(--color-muted-text)]">
        Paket oluşturmak için önce en az bir aktif ve stokta ürünün olmalı.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-[22px] border border-[var(--color-border)] bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field">
          Paket adı
          <input className="form-control" value={name} onChange={(event) => setName(event.target.value)} maxLength={140} required />
        </label>
        <label className="form-field">
          Paket türü <span className="font-normal opacity-60">(isteğe bağlı)</span>
          <input className="form-control" value={packageType} onChange={(event) => setPackageType(event.target.value)} maxLength={100} placeholder="Aile, ofis, hediye..." />
        </label>
      </div>
      <label className="form-field">
        Görsel URL <span className="font-normal opacity-60">(isteğe bağlı)</span>
        <input className="form-control" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
      </label>

      <div>
        <p className="text-sm font-extrabold text-[var(--color-ink)]">Pakete dahil ürünler</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {activeProducts.map((product) => (
            <label
              key={product.id}
              className={`flex items-center justify-between gap-3 rounded-[12px] border p-3 text-sm transition-colors ${
                selectedIds.has(product.id) ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--color-primary)]" checked={selectedIds.has(product.id)} onChange={() => toggle(product.id)} />
                <span className="truncate font-semibold text-[var(--color-ink)]">{product.name}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-[var(--color-muted-text)]">{formatMoney(product.price)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[160px_1fr] sm:items-end">
        <label className="form-field">
          İndirim %
          <input
            className="form-control"
            type="number"
            min="0"
            max="90"
            step="1"
            value={discountPercent}
            onChange={(event) => setDiscountPercent(Math.min(90, Math.max(0, Number(event.target.value))))}
          />
        </label>
        <div className="rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted-text)]">Seçilen ürünlerin toplamı</span>
            <span className="font-bold tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-base">
            <span className="font-bold">Paket fiyatı</span>
            <span className="font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(finalPrice)}</span>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-[14px] bg-[var(--color-surface-strong)] p-4 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Paketi vitrinde aktif yayınla
      </label>

      {error && <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="button-primary">
          {busy ? "Kaydediliyor..." : isEdit ? "Değişiklikleri kaydet" : "Paketi oluştur"}
        </button>
        {onCancel && (
          <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>
            Vazgeç
          </button>
        )}
      </div>
    </form>
  );
}

function ExistingPackageCard({ pkg, activeProducts }: { pkg: ExistingPackage; activeProducts: ActiveProductOption[] }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(pkg.isActive);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyToggle, setBusyToggle] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleActive(next: boolean) {
    setIsActive(next);
    setBusyToggle(true);
    setMessage("");
    const response = await fetch(`/api/store/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const result = (await response.json()) as { error?: string };
    setBusyToggle(false);
    if (!response.ok) {
      setIsActive(!next);
      setMessage(result.error ?? "Güncellenemedi.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusyDelete(true);
    setMessage("");
    const response = await fetch(`/api/store/packages/${pkg.id}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    setBusyDelete(false);
    setConfirmDelete(false);
    if (!response.ok) {
      setMessage(result.error ?? "Paket silinemedi.");
      return;
    }
    router.refresh();
  }

  if (showEdit) {
    return <PackageForm activeProducts={activeProducts} editing={pkg} onDone={() => setShowEdit(false)} onCancel={() => setShowEdit(false)} />;
  }

  return (
    <article className="rounded-[22px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[var(--color-accent)]">{pkg.packageType || "Hazır paket"}</p>
          <h2 className="mt-1 text-lg font-bold">{pkg.name}</h2>
          {pkg.productNames.length > 0 && <p className="mt-1 text-xs text-[var(--color-muted-text)]">İçerik: {pkg.productNames.join(", ")}</p>}
        </div>
        <span className={isActive ? "badge-success" : "chip"}>{isActive ? "Vitrinde" : "Taslak"}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <span className="font-extrabold tabular-nums text-[var(--color-primary-dark)]">{formatMoney(pkg.price)}</span>
        {pkg.discountPercent > 0 && <span className="chip">%{pkg.discountPercent} indirim</span>}
        <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-muted-text)]">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={isActive} disabled={busyToggle} onChange={(event) => toggleActive(event.target.checked)} />
          Vitrinde aktif
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" className="button-secondary" onClick={() => setShowEdit(true)}>
            Düzenle
          </button>
          <button type="button" className="rounded-full border border-[#8a3324] px-4 text-sm font-bold text-[#8a3324] hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
            Sil
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-xs font-semibold text-[#8a3324]">{message}</p>}

      <ConfirmModal
        open={confirmDelete}
        title="Paketi sil"
        description={`"${pkg.name}" paketini silmek istediğine emin misin? Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        destructive
        pending={busyDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </article>
  );
}

export function PackageBuilder({
  existingPackages,
  activeProducts,
}: {
  existingPackages: ExistingPackage[];
  activeProducts: ActiveProductOption[];
}) {
  const [showForm, setShowForm] = useState(existingPackages.length === 0);

  return (
    <div className="space-y-8">
      <div>
        <button type="button" className="button-secondary" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Formu gizle" : "+ Yeni paket oluştur"}
        </button>
        {showForm && (
          <div className="mt-4">
            <PackageForm activeProducts={activeProducts} onDone={() => setShowForm(false)} />
          </div>
        )}
      </div>

      {existingPackages.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {existingPackages.map((pkg) => (
            <ExistingPackageCard key={pkg.id} pkg={pkg} activeProducts={activeProducts} />
          ))}
        </div>
      ) : (
        <p className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-7 text-[var(--color-muted-text)]">Henüz paket oluşturulmadı.</p>
      )}
    </div>
  );
}
