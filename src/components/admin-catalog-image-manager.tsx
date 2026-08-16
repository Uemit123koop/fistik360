/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminCatalogImageProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_url: string | null;
  is_active: boolean;
  seller_usage_count: number;
}

export interface AdminCatalogImageDraft {
  id: string;
  proposed_name: string;
  proposed_slug: string;
  category: string;
  description: string | null;
  status: string;
  created_at: string;
  preview_url: string;
}

interface AdminCatalogImageManagerProps {
  initialProducts: AdminCatalogImageProduct[];
  initialDrafts: AdminCatalogImageDraft[];
  generationConfigured: boolean;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/webp"]);

function PhotoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m5 18 4.5-4.5 3 3 2.5-2.5 4 4" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
      <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="m5.5 14 .6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function ImageStage({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-[radial-gradient(circle_at_50%_42%,#fff_0%,var(--color-surface)_72%)]">
      {src ? (
        <img src={src} alt={name} loading="lazy" decoding="async" className="h-full w-full object-contain p-4" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-[var(--color-muted-text)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm"><PhotoIcon /></span>
          <span className="text-xs font-bold">Henüz görsel yok</span>
        </div>
      )}
    </div>
  );
}

export function AdminCatalogImageManager({
  initialProducts,
  initialDrafts,
  generationConfigured,
}: AdminCatalogImageManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [newProductName, setNewProductName] = useState("");
  const [activateOnApproval, setActivateOnApproval] = useState<Record<string, boolean>>(
    Object.fromEntries(initialDrafts.map((draft) => [draft.id, true])),
  );
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previews, setPreviews] = useState<Record<string, string | undefined>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))], [products]);
  const completed = products.filter((product) => product.image_url).length;
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return products.filter((product) => {
      const queryMatch = !normalized || `${product.name} ${product.slug}`.toLocaleLowerCase("tr-TR").includes(normalized);
      const categoryMatch = category === "all" || product.category === category;
      const statusMatch = status === "all" || (status === "ready" ? Boolean(product.image_url) : !product.image_url);
      return queryMatch && categoryMatch && statusMatch;
    });
  }, [category, products, query, status]);

  function chooseFile(productId: string, file: File | undefined) {
    setMessage(null);
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage({ tone: "error", text: "Yalnız şeffaflığı destekleyen PNG veya WEBP dosyası seçin." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage({ tone: "error", text: "Dosya 20 MiB sınırını aşıyor." });
      return;
    }
    const previousPreview = previews[productId];
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    setFiles((current) => ({ ...current, [productId]: file }));
    setPreviews((current) => ({ ...current, [productId]: URL.createObjectURL(file) }));
  }

  async function upload(product: AdminCatalogImageProduct) {
    const file = files[product.id];
    if (!file) {
      setMessage({ tone: "error", text: `${product.name} için önce bir dosya seçin.` });
      return;
    }
    setBusyId(product.id);
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch(`/api/admin/catalog-products/${product.id}/image`, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Görsel yüklenemedi." });
        return;
      }
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, image_url: payload.imageUrl } : item));
      const preview = previews[product.id];
      if (preview) URL.revokeObjectURL(preview);
      setFiles((current) => ({ ...current, [product.id]: undefined }));
      setPreviews((current) => ({ ...current, [product.id]: undefined }));
      setMessage({ tone: "success", text: `${product.name} görseli güncellendi ve satıcı ürünlerine yansıtıldı.` });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Sunucuya bağlanılamadı." });
    } finally {
      setBusyId(null);
    }
  }

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProductName.trim();
    if (name.length < 2) {
      setMessage({ tone: "error", text: "Lütfen en az 2 karakterlik bir ürün adı girin." });
      return;
    }

    setGenerating(true);
    setMessage({ tone: "info", text: `${name} için 4K şeffaf katalog görseli hazırlanıyor. Bu işlem bir miktar sürebilir.` });
    try {
      const response = await fetch("/api/admin/catalog-products/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Ürün taslağı üretilemedi." });
        return;
      }
      const draft = payload.draft as AdminCatalogImageDraft;
      setDrafts((current) => [draft, ...current]);
      setActivateOnApproval((current) => ({ ...current, [draft.id]: true }));
      setNewProductName("");
      setMessage({ tone: "success", text: `${draft.proposed_name} taslağı hazır. Görseli kontrol edip onaylayın.` });
    } catch {
      setMessage({ tone: "error", text: "Görsel üretim servisine bağlanılamadı." });
    } finally {
      setGenerating(false);
    }
  }

  async function approveDraft(draft: AdminCatalogImageDraft) {
    const activateNow = activateOnApproval[draft.id] !== false;
    setBusyId(draft.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/catalog-product-drafts/${draft.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activateNow }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Ürün onaylanamadı." });
        return;
      }
      if (payload.product) setProducts((current) => [...current, { ...payload.product, seller_usage_count: 0 } as AdminCatalogImageProduct]);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setMessage({
        tone: "success",
        text: activateNow
          ? `${draft.proposed_name} kataloğa eklendi ve mağazaların ürün seçiminde satışa açık hale geldi.`
          : `${draft.proposed_name} kataloğa eklendi; satışa açılana kadar satıcılardan gizli kalacak.`,
      });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Onay işlemi sırasında sunucuya bağlanılamadı." });
    } finally {
      setBusyId(null);
    }
  }

  async function rejectDraft(draft: AdminCatalogImageDraft) {
    if (!window.confirm(`${draft.proposed_name} taslağı kalıcı olarak reddedilecek ve özel taslak görseli silinecek. Devam edilsin mi?`)) return;
    setBusyId(draft.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/catalog-product-drafts/${draft.id}/reject`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Taslak reddedilemedi." });
        return;
      }
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setMessage({ tone: "info", text: `${draft.proposed_name} taslağı reddedildi; katalogda ürün oluşturulmadı.` });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Reddetme işlemi sırasında sunucuya bağlanılamadı." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-[var(--color-primary-light)] bg-[var(--color-primary-dark)] p-5 text-white shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-white/65">Katalog görsel durumu</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{completed} / {products.length}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/75">Tek merkezden yönetilen görseller mağaza, toptan ve vitrin ürünlerine otomatik yansır.</p>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">{products.length - completed === 0 ? "Katalog tamamlandı" : `${products.length - completed} görsel bekliyor`}</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15" aria-label={`Görsel tamamlama oranı yüzde ${Math.round((completed / Math.max(products.length, 1)) * 100)}`}>
          <div className="h-full rounded-full bg-[#d8bd71] transition-[width] duration-500" style={{ width: `${(completed / Math.max(products.length, 1)) * 100}%` }} />
        </div>
      </section>

      <section className="grid gap-3 rounded-[20px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] md:grid-cols-[minmax(0,1fr)_220px_190px]">
        <label className="form-field text-xs">Ürün ara<input type="search" className="form-control" placeholder="Ad veya slug" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="form-field text-xs">Kategori<select className="form-control" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Tüm kategoriler</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="form-field text-xs">Görsel durumu<select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tüm ürünler</option><option value="ready">Görseli hazır</option><option value="missing">Görsel bekliyor</option></select></label>
      </section>

      <section className="relative overflow-hidden rounded-[24px] border border-[#d9c481] bg-[linear-gradient(135deg,#fffdf5_0%,#f6f1df_55%,#eef5ec_100%)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#d8bd71]/15 blur-3xl" />
        <div className="relative grid items-end gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9c481] bg-white/75 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-[var(--color-primary-dark)]">
              <SparklesIcon /> Superadmin · Yapay zekâ stüdyosu
            </span>
            <h2 className="mt-4 text-2xl font-bold text-[var(--color-ink)]">Sadece ürün adını yaz</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
              Sistem kategoriyi ve slug’ı önerir; aynı ışık, kamera ve kadraj dilinde 4096×4096 şeffaf PNG üretir. Önizlemeyi onaylamadan katalog ürünü oluşturulmaz.
            </p>
          </div>
          <form onSubmit={generateDraft} className="rounded-[18px] border border-white/80 bg-white/85 p-3 shadow-sm backdrop-blur">
            <label htmlFor="new-catalog-product" className="text-xs font-extrabold text-[var(--color-ink)]">Yeni ürün ekle</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="new-catalog-product"
                className="form-control min-h-12 flex-1"
                placeholder="Örn. Kavrulmuş Pekan Cevizi"
                value={newProductName}
                maxLength={140}
                autoComplete="off"
                onChange={(event) => setNewProductName(event.target.value)}
              />
              <button
                type="submit"
                disabled={!generationConfigured || generating || newProductName.trim().length < 2}
                className="button-primary min-h-12 shrink-0 justify-center gap-2 px-5"
              >
                <SparklesIcon /> {generating ? "Üretiliyor..." : "Görseli üret"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted-text)]">
              {generationConfigured
                ? "İsimdeki çiğ, kavrulmuş, tuzlu, içi gibi ayrımlar görsel üretiminde birebir uygulanır."
                : "Üretimi açmak için sunucu ortamına OPENAI_API_KEY eklenmelidir."}
            </p>
          </form>
        </div>
      </section>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-[14px] border p-4 text-sm font-semibold ${
            message.tone === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : message.tone === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          {message.text}
        </p>
      )}

      {drafts.length > 0 && (
        <section aria-labelledby="pending-drafts-title" className="space-y-4 rounded-[24px] border border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Onay kapısı</p>
              <h2 id="pending-drafts-title" className="mt-1 text-xl font-bold text-[var(--color-ink)]">Onay bekleyen ürünler</h2>
            </div>
            <span className="chip">{drafts.length} taslak</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {drafts.map((draft) => {
              const active = activateOnApproval[draft.id] !== false;
              const busy = busyId === draft.id;
              return (
                <article key={draft.id} className="grid gap-4 rounded-[22px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:grid-cols-[190px_minmax(0,1fr)]">
                  <ImageStage src={draft.preview_url} name={`${draft.proposed_name} taslak görseli`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--color-accent)]">{draft.category}</p>
                        <h3 className="mt-1 text-lg font-bold text-[var(--color-ink)]">{draft.proposed_name}</h3>
                        <p className="mt-1 text-[11px] text-[var(--color-muted-text)]">{draft.proposed_slug}.png</p>
                      </div>
                      <span className="badge-success">4K · PNG · Alfa</span>
                    </div>

                    <div className="mt-4 rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
                      <p className="text-xs font-extrabold text-[var(--color-ink)]">Bu ürün hemen satışa açılsın mı?</p>
                      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[var(--color-muted-text)]">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(event) => setActivateOnApproval((current) => ({ ...current, [draft.id]: event.target.checked }))}
                          className="h-5 w-5 accent-[var(--color-primary)]"
                        />
                        {active
                          ? "Evet — mağazaların katalog ürün seçiminde hemen göster"
                          : "Hayır — ürünü kataloğa ekle ama satıcılardan gizle"}
                      </label>
                      <p className="mt-2 text-[10px] leading-4 text-[var(--color-muted-text)]">
                        Paket ve mix listesinde, mağaza ürünü seçip fiyat/stok tanımladıktan sonra görünür.
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <button type="button" onClick={() => approveDraft(draft)} disabled={busy} className="button-primary min-h-11 justify-center gap-2">
                        <CheckIcon /> {busy ? "İşleniyor..." : "Onayla ve kataloğa ekle"}
                      </button>
                      <button type="button" onClick={() => rejectDraft(draft)} disabled={busy} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <TrashIcon /> Reddet
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-sm font-semibold text-[var(--color-muted-text)]" aria-live="polite">{visible.length} ürün gösteriliyor</p>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {visible.map((product) => {
          const preview = previews[product.id] ?? product.image_url;
          const file = files[product.id];
          return (
            <article key={product.id} className="rounded-[22px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <ImageStage src={preview ?? null} name={product.name} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--color-accent)]">{product.category}</p>
                  <h2 className="mt-1 font-bold leading-5 text-[var(--color-ink)]">{product.name}</h2>
                  <p className="mt-1 truncate text-[11px] text-[var(--color-muted-text)]">{product.slug}.png · {product.seller_usage_count} aktif mağaza</p>
                </div>
                <div className="flex flex-col items-end gap-1"><span className={product.image_url ? "badge-success" : "chip"}>{product.image_url ? "Görsel hazır" : "Görsel eksik"}</span><span className={product.is_active ? "chip" : "rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-800"}>{product.is_active ? "Aktif" : "Pasif"}</span></div>
              </div>

              <div
                className="mt-4 rounded-[16px] border border-dashed border-[var(--color-primary-light)] bg-[var(--color-primary-soft)] p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  chooseFile(product.id, event.dataTransfer.files[0]);
                }}
              >
                <label htmlFor={`catalog-image-${product.id}`} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-3 text-center text-xs font-extrabold text-[var(--color-primary-dark)] shadow-sm transition hover:bg-[var(--color-surface)]">
                  {file ? "Dosyayı değiştir" : product.image_url ? "Yeni görsel seç" : "PNG / WEBP seç"}
                </label>
                <input id={`catalog-image-${product.id}`} type="file" accept="image/png,image/webp" className="sr-only" onChange={(event) => chooseFile(product.id, event.target.files?.[0])} />
                <p className="mt-2 truncate text-center text-[10px] text-[var(--color-muted-text)]">{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MiB` : "Sürükleyip bırakabilirsin · En fazla 20 MiB"}</p>
              </div>

              <button type="button" onClick={() => upload(product)} disabled={!file || busyId === product.id} className="button-primary mt-3 w-full justify-center">
                {busyId === product.id ? "Yükleniyor..." : product.image_url ? "Görseli değiştir" : "Görseli yükle"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}