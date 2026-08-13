import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const user = await getServerUser();
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ authRequired: true, addresses: [] });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("id, neighborhood_id, province, district, neighborhood, street, building_no, apartment_no, label, is_default")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ authRequired: false, addresses: [], error: "Adresler okunamadı." }, { status: 500 });
  }

  return NextResponse.json({ authRequired: false, addresses: data ?? [] });
}
