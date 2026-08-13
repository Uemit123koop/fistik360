import "server-only";

// NetGSM OTP SMS istemcisi — https://www.netgsm.com.tr/dokuman/#otp-sms üzerinden
// doğrulanmış API şeması. Yalnız Supabase'in "Send SMS Hook"undan (src/app/api/auth/
// sms-hook/route.ts) çağrılır; Supabase'in yerleşik SMS sağlayıcı listesinde (Twilio,
// MessageBird, Vonage, TextLocal) NetGSM yok, bu yüzden bu hook devrede.
//
// Kısıtlar (NetGSM dokümanından): Türkçe karakter gönderilemez, yurt dışı/sabit hat
// numarasına gönderim yapılamaz, tek seferde tek numara, 3 dakika içinde iletilir.

const OTP_ENDPOINT = "https://api.netgsm.com.tr/sms/rest/v2/otp";

interface NetgsmSuccessResponse {
  jobid: string;
  code: string;
  description: string;
}

interface NetgsmErrorResponse {
  code: string;
  description: string;
}

// "90XXXXXXXXXX" (lib/phone.ts formatı) veya "+90XXXXXXXXXX" (Supabase hook payload'ı)
// girdisini NetGSM'in beklediği "5XXXXXXXXX" (10 haneli, ülke kodu yok) biçimine çevirir.
export function toNetgsmPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length > 10 ? digits.slice(2) : digits;
  return /^5\d{9}$/.test(local) ? local : null;
}

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const usercode = process.env.NETGSM_USERCODE;
  const password = process.env.NETGSM_PASSWORD;
  const msgheader = process.env.NETGSM_MSGHEADER;
  if (!usercode || !password || !msgheader) {
    throw new Error("NetGSM ortam değişkenleri (NETGSM_USERCODE/PASSWORD/MSGHEADER) tanımlı değil.");
  }

  const netgsmPhone = toNetgsmPhone(phone);
  if (!netgsmPhone) {
    throw new Error(`Geçersiz telefon numarası: ${phone}`);
  }

  const auth = Buffer.from(`${usercode}:${password}`, "utf8").toString("base64");
  const response = await fetch(OTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    // NetGSM'de Türkçe karakter yasak; mesaj ASCII tutulur.
    body: JSON.stringify({
      msgheader,
      msg: `Fistik360 dogrulama kodun: ${otp}`,
      no: netgsmPhone,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | NetgsmSuccessResponse
    | NetgsmErrorResponse
    | null;

  if (!response.ok || !payload || payload.code !== "00") {
    const description = payload?.description ?? `HTTP ${response.status}`;
    throw new Error(`NetGSM SMS gönderilemedi (${payload?.code ?? "?"}): ${description}`);
  }
}
