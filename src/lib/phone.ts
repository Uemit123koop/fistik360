// Türk cep telefonu numaralarını Supabase Auth'un beklediği "90XXXXXXXXXX"
// biçimine (ülke kodu + boşluksuz 10 hane, başında 0/+ yok) normalize eder.
export function normalizeTurkishPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length > 10
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^5\d{9}$/.test(local)) return null;
  return `90${local}`;
}

export function formatTurkishPhoneDisplay(normalized: string): string {
  const local = normalized.startsWith("90") ? normalized.slice(2) : normalized;
  if (local.length !== 10) return normalized;
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}
