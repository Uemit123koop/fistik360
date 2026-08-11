import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { WHOLESALE_CATEGORIES } from "@/lib/seller-registration";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function safeUrl(value: unknown) { const result = text(value, 1000); if (!result) return null; try { const url = new URL(result); return url.protocol === "https:" ? result : null; } catch { return null; } }

export async function PATCH(request: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce giriş yapın." }, { status: 401 });
  if (user.role !== "WHOLESALE_SELLER") return NextResponse.json({ error: "Bu işlem yalnız toptancı hesabına açıktır." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const businessName = text(body?.businessName, 120);
  const description = text(body?.description, 1500);
  const phone = text(body?.phone, 20);
  const categories = Array.isArray(body?.categories) ? [...new Set(body.categories.filter((item): item is string => typeof item === "string" && WHOLESALE_CATEGORIES.includes(item as (typeof WHOLESALE_CATEGORIES)[number])))] : [];
  const isActive = body?.isActive === true;
  if (!businessName || categories.length === 0 || (isActive && description.length < 30)) return NextResponse.json({ error: "İşletme adı, kategori ve yayın için en az 30 karakterlik hakkında metni gereklidir." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("wholesale_seller_profiles").update({ business_name: businessName, description: description || null, phone: phone || null, logo_url: safeUrl(body?.logoUrl), cover_url: safeUrl(body?.coverUrl), product_categories: categories, is_active: isActive, published_at: isActive ? new Date().toISOString() : null }).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Toptancı profili güncellenemedi." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

