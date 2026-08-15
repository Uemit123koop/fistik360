import "server-only";

import crypto from "node:crypto";

// İyzico REST istemcisi — resmi `iyzipay` npm paketi yerine bağımlılıksız yazıldı: paket,
// artık bakımı yapılmayan `postman-request`/`qs`/`uuid` zincirinden çözülmemiş orta
// seviye DoS açıkları taşıyor (npm audit), ödeme kritik bir bağımlılık için kabul
// edilemez. Checkout Form (hosted/redirect) ürünü kullanılır — ham kart verisi hiç bize
// gelmez. Kimlik doğrulama şeması: docs.iyzico.com/en/getting-started/preliminaries/
// authentication/hmacsha256-auth — HMACSHA256(randomKey + uriPath + requestBody, secretKey).

export interface IyzicoBuyer {
  id: string;
  name: string;
  surname: string;
  identityNumber: string;
  email: string;
  gsmNumber: string;
  registrationAddress: string;
  city: string;
  country: string;
  zipCode: string;
  ip: string;
}

export interface IyzicoAddress {
  address: string;
  zipCode: string;
  contactName: string;
  city: string;
  country: string;
}

export interface IyzicoBasketItem {
  id: string;
  price: string;
  name: string;
  category1: string;
  itemType: "VIRTUAL";
}

export interface CheckoutFormInitializeInput {
  conversationId: string;
  price: string;
  paidPrice: string;
  basketId: string;
  callbackUrl: string;
  buyer: IyzicoBuyer;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
}

export interface CheckoutFormInitializeResult {
  ok: true;
  token: string;
  paymentPageUrl: string;
}

export interface CheckoutFormRetrieveResult {
  ok: boolean;
  paymentStatus: string;
  paymentId: string | null;
  errorMessage: string | null;
  // Çağıranın kendi beklediği tutar/para birimi ve conversationId/token ile
  // karşılaştırıp doğrulaması için — retrieve sonucunun kendisi asla tek başına
  // yeterli kanıt sayılmamalı.
  paidPrice: number | null;
  currency: string | null;
  conversationId: string | null;
  token: string | null;
}

interface IyzicoCredentials {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export class IyzicoNotConfiguredError extends Error {
  constructor() {
    super("İyzico ödeme sağlayıcısı henüz yapılandırılmadı.");
    this.name = "IyzicoNotConfiguredError";
  }
}

export function getIyzicoCredentials(): IyzicoCredentials | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL;
  if (!apiKey || !secretKey || !baseUrl) return null;
  return { apiKey, secretKey, baseUrl };
}

function randomKey(): string {
  return `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
}

function buildAuthorizationHeader(
  credentials: IyzicoCredentials,
  uriPath: string,
  requestBody: string,
  rnd: string,
): string {
  const payload = `${rnd}${uriPath}${requestBody}`;
  const signature = crypto.createHmac("sha256", credentials.secretKey).update(payload).digest("hex");
  const authorizationParams = `apiKey:${credentials.apiKey}&randomKey:${rnd}&signature:${signature}`;
  const base64 = Buffer.from(authorizationParams, "utf8").toString("base64");
  return `IYZWSv2 ${base64}`;
}

async function iyzicoRequest<T>(credentials: IyzicoCredentials, uriPath: string, body: unknown): Promise<T> {
  const requestBody = JSON.stringify(body);
  const rnd = randomKey();
  const response = await fetch(`${credentials.baseUrl}${uriPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuthorizationHeader(credentials, uriPath, requestBody, rnd),
      "x-iyzi-rnd": rnd,
    },
    body: requestBody,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`İyzico isteği başarısız (HTTP ${response.status}): ${bodyText.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

export async function initializeCheckoutForm(
  input: CheckoutFormInitializeInput,
): Promise<CheckoutFormInitializeResult> {
  const credentials = getIyzicoCredentials();
  if (!credentials) throw new IyzicoNotConfiguredError();

  const uriPath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const raw = await iyzicoRequest<{
    status: string;
    token?: string;
    paymentPageUrl?: string;
    errorMessage?: string;
  }>(credentials, uriPath, {
    locale: "tr",
    conversationId: input.conversationId,
    price: input.price,
    paidPrice: input.paidPrice,
    currency: "TRY",
    basketId: input.basketId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    buyer: input.buyer,
    shippingAddress: input.billingAddress,
    billingAddress: input.billingAddress,
    basketItems: input.basketItems,
  });

  if (raw.status !== "success" || !raw.token || !raw.paymentPageUrl) {
    throw new Error(raw.errorMessage ?? "İyzico ödeme sayfası başlatılamadı.");
  }

  return { ok: true, token: raw.token, paymentPageUrl: raw.paymentPageUrl };
}

export async function retrieveCheckoutFormResult(
  conversationId: string,
  token: string,
): Promise<CheckoutFormRetrieveResult> {
  const credentials = getIyzicoCredentials();
  if (!credentials) throw new IyzicoNotConfiguredError();

  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const raw = await iyzicoRequest<{
    status: string;
    paymentStatus?: string;
    paymentId?: string;
    errorMessage?: string;
    paidPrice?: string | number;
    currency?: string;
    conversationId?: string;
    token?: string;
  }>(credentials, uriPath, { locale: "tr", conversationId, token });

  const paymentStatus = raw.paymentStatus ?? raw.status;
  const paidPrice = raw.paidPrice === undefined || raw.paidPrice === null ? null : Number(raw.paidPrice);
  return {
    ok: raw.status === "success" && paymentStatus === "SUCCESS",
    paymentStatus,
    paymentId: raw.paymentId ?? null,
    errorMessage: raw.errorMessage ?? null,
    paidPrice: paidPrice !== null && Number.isFinite(paidPrice) ? paidPrice : null,
    currency: raw.currency ?? null,
    conversationId: raw.conversationId ?? null,
    token: raw.token ?? null,
  };
}
