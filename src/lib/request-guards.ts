import "server-only";

// Çerez tabanlı oturumla çalışan yazma uçları için basit CSRF koruması.
// Tarayıcı `Origin` başlığını cross-site isteklerde göndermek zorundadır; sunucu
// tarafı istemcilerde başlık hiç bulunmaz. Bu yüzden yalnız *var olan ve
// eşleşmeyen* origin reddedilir.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // request.url her zaman mutlaktır; yine de sessiz geç.
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // Hatalı env değeri izinli listeyi bozmasın.
    }
  }

  return allowed.has(origin);
}
