import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { getLegalDocument, legalDocumentSlugs } from "@/lib/legal-content";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return legalDocumentSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) return {};
  return { title: document.title + " | Fıstık360", description: document.description };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();
  return <LegalDocumentPage document={document} />;
}
