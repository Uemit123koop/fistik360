import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { PARTNER_CATEGORIES } from "@/lib/partner";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const documentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function textValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fileValue(data: FormData, key: string) {
  const value = data.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromName || (file.type === "application/pdf" ? "pdf" : "bin");
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Önce e-posta doğrulaması yapın." }, { status: 401 });
  if (user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Bu hesap yeni partner başvurusu için uygun değil." }, { status: 403 });
  }

  const data = await request.formData();
  const email = textValue(data, "email").toLowerCase();
  const categories = data.getAll("categories").filter((item): item is string =>
    typeof item === "string" && PARTNER_CATEGORIES.includes(item as (typeof PARTNER_CATEGORIES)[number]),
  );
  const logo = fileValue(data, "logo");
  const cover = fileValue(data, "cover");
  const taxDocument = fileValue(data, "taxDocument");
  const foodDocument = fileValue(data, "foodDocument");
  const trademarkDocument = fileValue(data, "trademarkDocument");

  const required = ["companyName", "brandName", "authorizedPerson", "phone", "taxNumber", "taxOffice", "brandDescription"];
  if (required.some((key) => !textValue(data, key)) || email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Zorunlu alanları ve doğrulanan e-postayı kontrol edin." }, { status: 400 });
  }
  if (!/^\d{10,11}$/.test(textValue(data, "taxNumber")) || categories.length === 0) {
    return NextResponse.json({ error: "Vergi numarası ve ürün kategorileri geçerli olmalı." }, { status: 400 });
  }
  if (textValue(data, "brandDescription").length < 40 || data.get("termsAccepted") !== "true") {
    return NextResponse.json({ error: "Marka anlatımı en az 40 karakter olmalı ve koşullar kabul edilmeli." }, { status: 400 });
  }
  if (!logo || !taxDocument || !foodDocument) {
    return NextResponse.json({ error: "Logo ve zorunlu belgeleri yükleyin." }, { status: 400 });
  }
  if (!imageTypes.has(logo.type) || logo.size > 8 * 1024 * 1024 || (cover && (!imageTypes.has(cover.type) || cover.size > 8 * 1024 * 1024))) {
    return NextResponse.json({ error: "Görseller JPG, PNG, WEBP veya AVIF ve en fazla 8 MB olmalı." }, { status: 400 });
  }
  for (const file of [taxDocument, foodDocument, trademarkDocument].filter(Boolean) as File[]) {
    if (!documentTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Belgeler PDF, JPG veya PNG ve en fazla 10 MB olmalı." }, { status: 400 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin.from("partner_applications").select("id, status").eq("user_id", user.id).in("status", ["PENDING", "UNDER_REVIEW", "APPROVED", "SUSPENDED"]).maybeSingle();
  if (existing) return NextResponse.json({ error: "Bu hesaba ait açık bir partner başvurusu zaten var." }, { status: 409 });

  const applicationId = crypto.randomUUID();
  const prefix = `applications/${user.id}/${applicationId}`;
  const uploaded: { bucket: string; path: string }[] = [];
  const upload = async (bucket: string, name: string, file: File) => {
    const path = `${prefix}/${name}.${safeExtension(file)}`;
    const { error } = await admin.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("Dosya yükleme tamamlanamadı.");
    uploaded.push({ bucket, path });
    return path;
  };

  try {
    const logoPath = await upload("partner-assets", "logo", logo);
    const coverPath = cover ? await upload("partner-assets", "cover", cover) : null;
    const taxPath = await upload("partner-documents", "tax-company", taxDocument);
    const foodPath = await upload("partner-documents", "food-business", foodDocument);
    const trademarkPath = trademarkDocument ? await upload("partner-documents", "trademark", trademarkDocument) : null;

    const { error: applicationError } = await admin.from("partner_applications").insert({
      id: applicationId,
      user_id: user.id,
      company_name: textValue(data, "companyName"),
      brand_name: textValue(data, "brandName"),
      authorized_person: textValue(data, "authorizedPerson"),
      phone: textValue(data, "phone"),
      email,
      tax_number: textValue(data, "taxNumber"),
      tax_office: textValue(data, "taxOffice"),
      website: textValue(data, "website") || null,
      instagram: textValue(data, "instagram") || null,
      founded_year: Number(textValue(data, "foundedYear")) || null,
      brand_description: textValue(data, "brandDescription"),
      logo_path: logoPath,
      cover_path: coverPath,
      categories,
      approximate_product_count: Number(textValue(data, "productCount")) || 0,
      monthly_order_capacity: Number(textValue(data, "monthlyCapacity")) || 0,
      ships_nationwide: data.get("shipsNationwide") === "true",
      has_own_warehouse: data.get("hasOwnWarehouse") === "true",
      has_branded_packaging: data.get("hasBrandedPackaging") === "true",
      has_barcoded_products: data.get("hasBarcodedProducts") === "true",
      terms_version: "partner-mvp-2026-08",
      terms_accepted_at: new Date().toISOString(),
    });
    if (applicationError) throw new Error("Başvuru kaydedilemedi.");

    const documents = [
      { application_id: applicationId, document_type: "TAX_COMPANY", file_path: taxPath },
      { application_id: applicationId, document_type: "FOOD_BUSINESS", file_path: foodPath },
      ...(trademarkPath ? [{ application_id: applicationId, document_type: "TRADEMARK", file_path: trademarkPath }] : []),
    ];
    const { error: documentError } = await admin.from("partner_documents").insert(documents);
    if (documentError) {
      await admin.from("partner_applications").delete().eq("id", applicationId);
      throw new Error("Belgeler kaydedilemedi.");
    }

    return NextResponse.json({ ok: true, applicationId }, { status: 201 });
  } catch (error) {
    await Promise.all(uploaded.map(({ bucket, path }) => admin.storage.from(bucket).remove([path])));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Başvuru tamamlanamadı." }, { status: 400 });
  }
}
