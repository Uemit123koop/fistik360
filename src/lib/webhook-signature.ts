import "server-only";

import crypto from "node:crypto";

// Standard Webhooks doğrulaması (Supabase Auth Hooks bu şemayı kullanır) —
// https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
// Resmi `standardwebhooks` paketi yerine bağımsız yazıldı: doğrulama tek bir
// HMAC-SHA256 hesabı, üçüncü taraf bağımlılık gerektirmiyor (iyzico istemcisiyle
// aynı gerekçe — minimal, denetlenebilir kod).

export interface StandardWebhookHeaders {
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

const TOLERANCE_SECONDS = 5 * 60;

function timingSafeEqualBase64(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "base64");
  const bufB = Buffer.from(b, "base64");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// secret formatı config.toml'daki gibi "v1,whsec_<base64>" ya da yalnız "whsec_<base64>" olabilir.
function decodeSecret(secret: string): Buffer {
  const whsec = secret.split(",").find((part) => part.startsWith("whsec_")) ?? secret;
  return Buffer.from(whsec.replace(/^whsec_/, ""), "base64");
}

export function verifyStandardWebhook(
  rawBody: string,
  headers: StandardWebhookHeaders,
  secret: string,
): boolean {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const key = decodeSecret(secret);
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  return webhookSignature
    .split(" ")
    .filter((entry) => entry.startsWith("v1,"))
    .some((entry) => timingSafeEqualBase64(entry.slice(3), expected));
}
