#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "catalog-product-images";
const MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_DIRECTORY = resolve("supabase/catalog-product-images");
const SLUGS = [
  "antep-fistigi-kavrulmus", "antep-fistigi-cig", "antep-fistigi-ici", "badem-kavrulmus", "badem-cig",
  "findik-kavrulmus", "findik-cig", "kaju-kavrulmus", "kaju-cig", "ceviz-ici", "yer-fistigi-tuzlu",
  "yer-fistigi-tuzsuz", "sari-leblebi", "beyaz-leblebi", "soslu-misir", "kabak-cekirdegi",
  "ay-cekirdegi-tuzlu", "ay-cekirdegi-tuzsuz", "karisik-kuruyemis-klasik", "karisik-kuruyemis-luks",
  "kokteyl-kuruyemis", "kuru-kayisi", "gun-kurusu-kayisi", "kuru-incir", "cekirdeksiz-kuru-uzum",
  "hurma", "medine-hurmasi", "kuru-dut", "kuru-erik", "turna-yemisi", "kuru-mango", "kuru-ananas",
  "kuru-elma", "pestil", "cevizli-sucuk", "lokum-sade", "lokum-gullu", "lokum-antep-fistikli",
  "lokum-cifte-kavrulmus", "lokum-narli", "lokum-kadayifli", "draje-badem", "draje-findik",
  "kahve-cekirdegi", "turk-kahvesi",
];

async function loadEnvironment(path) {
  try {
    const source = await readFile(path, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function readPngMetadata(buffer, fileName) {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`${fileName}: invalid PNG signature`);
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20), colorType = buffer[25];
  if (width !== 4096 || height !== 4096) throw new Error(`${fileName}: expected 4096x4096, received ${width}x${height}`);
  if (![4, 6].includes(colorType)) throw new Error(`${fileName}: PNG has no alpha channel (color type ${colorType})`);
}

async function assertPubliclyReadable(url, slug) {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!response.ok) throw new Error(`${slug}: public URL returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/png")) throw new Error(`${slug}: public URL is not image/png (${contentType})`);
}

await loadEnvironment(resolve(".env.local"));
await loadEnvironment(resolve(".env"));
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseUrl = configuredSupabaseUrl && /^https?:\/\//i.test(configuredSupabaseUrl)
  ? configuredSupabaseUrl : configuredSupabaseUrl ? `https://${configuredSupabaseUrl}` : null;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.");

const files = (await readdir(IMAGE_DIRECTORY)).filter((name) => name.endsWith(".png")).sort();
const expectedFiles = SLUGS.map((slug) => `${slug}.png`).sort();
if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) throw new Error("The image directory must contain exactly the 45 canonical PNG files.");

const images = new Map();
for (const slug of SLUGS) {
  const fileName = `${slug}.png`, buffer = await readFile(resolve(IMAGE_DIRECTORY, fileName));
  if (buffer.byteLength > MAX_BYTES) throw new Error(`${fileName}: ${buffer.byteLength} bytes exceeds the 20 MiB bucket limit`);
  readPngMetadata(buffer, fileName);
  images.set(slug, buffer);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: bucket, error: bucketReadError } = await admin.storage.getBucket(BUCKET);
if (bucketReadError || !bucket) throw new Error(`Bucket "${BUCKET}" is missing. Apply the storage migration before uploading.`);
if (!bucket.public) throw new Error(`Bucket "${BUCKET}" must be public.`);

const { data: catalogRows, error: catalogError } = await admin.from("catalog_products").select("id, slug, image_url").in("slug", SLUGS);
if (catalogError) throw catalogError;
if (catalogRows.length !== SLUGS.length) {
  const found = new Set(catalogRows.map((row) => row.slug));
  throw new Error(`Missing catalog rows: ${SLUGS.filter((slug) => !found.has(slug)).join(", ")}`);
}

const rowBySlug = new Map(catalogRows.map((row) => [row.slug, row])), uploaded = [];
for (const slug of SLUGS) {
  const objectPath = `${slug}.png`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, images.get(slug), { contentType: "image/png", cacheControl: "3600", upsert: true });
  if (uploadError) throw new Error(`${slug}: upload failed: ${uploadError.message}`);
  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  await assertPubliclyReadable(publicUrlData.publicUrl, slug);
  uploaded.push({ slug, url: publicUrlData.publicUrl });
  console.log(`UPLOADED ${slug}`);
}

for (const { slug, url } of uploaded) {
  const { error } = await admin.from("catalog_products").update({ image_url: url }).eq("id", rowBySlug.get(slug).id);
  if (error) throw new Error(`${slug}: database update failed: ${error.message}`);
}

const { data: verifiedRows, error: verifyError } = await admin.from("catalog_products").select("slug, image_url").in("slug", SLUGS);
if (verifyError) throw verifyError;
if (verifiedRows.length !== SLUGS.length || verifiedRows.some((row) => !row.image_url)) throw new Error("Final database verification failed.");
await Promise.all(verifiedRows.map((row) => assertPubliclyReadable(row.image_url, row.slug)));
console.log(`DONE: ${verifiedRows.length} catalog images are uploaded, public, and linked.`);
