import { notFound } from "next/navigation";
import {
  AdminCatalogImageManager,
  type AdminCatalogImageDraft,
  type AdminCatalogImageProduct,
} from "@/components/admin-catalog-image-manager";
import { requireRole } from "@/lib/auth";
import { CATALOG_IMAGE_DRAFT_BUCKET } from "@/lib/catalog-product-generation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function AdminProductsPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();

  const admin = createSupabaseAdminClient();
  const [{ data: catalog }, { data: draftRows }, { data: retailRows }] = await Promise.all([
    admin
      .from("catalog_products")
      .select("id, slug, name, category, image_url, is_active")
      .order("display_order", { ascending: true })
      .limit(500),
    admin
      .from("catalog_product_drafts")
      .select("id, proposed_name, proposed_slug, category, description, image_object_path, status, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("retail_products").select("catalog_product_id").eq("is_active", true),
  ]);

  const usageByProduct = new Map<string, number>();
  for (const row of retailRows ?? []) {
    if (row.catalog_product_id) usageByProduct.set(row.catalog_product_id, (usageByProduct.get(row.catalog_product_id) ?? 0) + 1);
  }
  const products = (catalog ?? []).map((product) => ({
    ...product,
    seller_usage_count: usageByProduct.get(product.id) ?? 0,
  })) satisfies AdminCatalogImageProduct[];
  const drafts = (await Promise.all((draftRows ?? []).map(async (draft) => {
    const { data } = await admin.storage
      .from(CATALOG_IMAGE_DRAFT_BUCKET)
      .createSignedUrl(draft.image_object_path, 3600);
    if (!data?.signedUrl) return null;
    return {
      id: draft.id,
      proposed_name: draft.proposed_name,
      proposed_slug: draft.proposed_slug,
      category: draft.category,
      description: draft.description,
      status: draft.status,
      created_at: draft.created_at,
      preview_url: data.signedUrl,
    } satisfies AdminCatalogImageDraft;
  }))).filter((draft): draft is AdminCatalogImageDraft => Boolean(draft));

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Admin · Merkezi katalog</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-ink)]">Ürün görselleri</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-text)]">
          Ürün fotoğraflarını tek merkezden yükle veya değiştir. Kaydettiğin görsel katalog bağlantısı sayesinde mağaza, toptan ve vitrin kayıtlarına otomatik uygulanır.
        </p>
      </header>
      <AdminCatalogImageManager
        initialProducts={products}
        initialDrafts={drafts}
        generationConfigured={Boolean(process.env.OPENAI_API_KEY)}
      />
    </div>
  );
}