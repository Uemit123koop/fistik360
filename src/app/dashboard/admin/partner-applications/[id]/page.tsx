import { notFound } from "next/navigation";
import { PartnerReviewPanel as PartnerReviewActions } from "@/components/partner-review-panel";
import { requireRole } from "@/lib/auth";
import { partnerStatusLabels, type PartnerApplicationStatus } from "@/lib/partner";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export default async function PartnerApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) notFound();
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data: application } = await admin.from("partner_applications").select("*, partner_documents(id, document_type, file_path, status)").eq("id", id).maybeSingle();
  if (!application) notFound();
  const documents = await Promise.all((application.partner_documents ?? []).map(async (document: { id: string; document_type: string; file_path: string; status: string }) => {
    const { data } = await admin.storage.from("partner-documents").createSignedUrl(document.file_path, 300);
    return { ...document, signedUrl: data?.signedUrl ?? null };
  }));

  const facts = [["Firma", application.company_name], ["Yetkili", application.authorized_person], ["E-posta", application.email], ["Telefon", application.phone], ["Vergi", `${application.tax_office} · ${application.tax_number}`], ["Kapasite", `${application.monthly_order_capacity} sipariş/ay`]];
  return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">Başvuru detayı</p><h1 className="mt-2 text-3xl font-bold">{application.brand_name}</h1></div><span className="badge-success">{partnerStatusLabels[application.status as PartnerApplicationStatus] ?? application.status}</span></div><div className="mt-7 grid gap-3 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--color-surface)] p-4"><p className="data-label">{label}</p><p className="data-value">{value}</p></div>)}</div><section className="mt-6"><h2 className="text-lg font-bold">Marka anlatımı</h2><p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--color-muted-text)]">{application.brand_description}</p><div className="mt-4 flex flex-wrap gap-2">{application.categories.map((category: string) => <span key={category} className="chip">{category}</span>)}</div></section><section className="mt-6"><h2 className="text-lg font-bold">Belgeler</h2><div className="mt-3 flex flex-wrap gap-2">{documents.map((document) => document.signedUrl ? <a key={document.id} href={document.signedUrl} target="_blank" rel="noreferrer" className="button-secondary">{document.document_type}</a> : <span key={document.id} className="chip">{document.document_type}</span>)}</div></section><div className="mt-7"><PartnerReviewActions applicationId={id} brandName={application.brand_name} status={application.status} /></div></div>;
}
