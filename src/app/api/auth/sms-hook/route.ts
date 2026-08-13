import { NextResponse } from "next/server";
import { sendOtpSms } from "@/lib/netgsm";
import { verifyStandardWebhook } from "@/lib/webhook-signature";

// Supabase Auth "Send SMS Hook" ucu: supabase.auth.signInWithOtp({phone}) her
// çağrıldığında Supabase kendi SMS gönderimi YERİNE burayı çağırır (native sağlayıcı
// listesinde NetGSM yok, bu yüzden custom HTTP hook kullanıyoruz). Beklenen payload:
// {"user":{"phone":"+90..."},"sms":{"otp":"123456"}}. İmza doğrulanmadan hiçbir SMS
// gönderilmez — aksi halde bu uç, secret'ı bilmeyen biri için de ücretsiz bir "istediğin
// numaraya istediğin an SMS gönder" servisi olurdu.
function hookError(httpCode: number, message: string) {
  return NextResponse.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}

export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    return hookError(500, "SMS hook henüz yapılandırılmadı.");
  }

  const rawBody = await request.text();
  const verified = verifyStandardWebhook(rawBody, {
    webhookId: request.headers.get("webhook-id"),
    webhookTimestamp: request.headers.get("webhook-timestamp"),
    webhookSignature: request.headers.get("webhook-signature"),
  }, secret);

  if (!verified) {
    return hookError(401, "Geçersiz imza.");
  }

  const body = JSON.parse(rawBody) as { user?: { phone?: string }; sms?: { otp?: string } };
  const phone = body.user?.phone;
  const otp = body.sms?.otp;
  if (!phone || !otp) {
    return hookError(400, "Eksik telefon veya OTP kodu.");
  }

  try {
    await sendOtpSms(phone, otp);
  } catch (error) {
    return hookError(500, error instanceof Error ? error.message : "SMS gönderilemedi.");
  }

  return NextResponse.json({});
}
