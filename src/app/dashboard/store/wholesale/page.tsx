import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function StoreWholesalePage() { const user = await requireRole(["NUT_STORE"]); if (!user) notFound(); redirect("/toptan"); }

