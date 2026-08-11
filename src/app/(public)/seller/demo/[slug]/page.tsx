import { notFound } from "next/navigation";
import { DemoSellerPanel } from "@/components/demo-seller-panel";
import { DEMO_SELLERS, getDemoSeller } from "@/lib/demo-sellers";

export function generateStaticParams() {
  return DEMO_SELLERS.map((seller) => ({ slug: seller.slug }));
}

export default async function DemoSellerPage({ params }: PageProps<"/seller/demo/[slug]">) {
  const { slug } = await params;
  const seller = getDemoSeller(slug);
  if (!seller) notFound();
  return <DemoSellerPanel seller={seller} />;
}

