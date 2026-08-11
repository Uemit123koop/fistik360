import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function StoreDashboardPage() {
  const user = await requireRole(["NUT_STORE"]);
  if (!user) notFound();
  redirect("/seller");
}
