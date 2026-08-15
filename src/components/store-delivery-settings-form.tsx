"use client";

import { useMemo, useState } from "react";

interface DeliverySettings {
  minimumOrderAmount: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number | null;
}

interface PaymentSettings {
  cashOnDelivery: boolean;
  cardOnDelivery: boolean;
  bankTransfer: boolean;
}

interface BankAccount {
  id: string;
  accountHolderName: string;
  iban: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initial: {
    delivery: DeliverySettings;
    payment: PaymentSettings;
    bankAccounts: BankAccount[];
  };
}

interface ApiPayload {
  error?: string;
  warning?: string | null;
  bankAccounts?: BankAccount[];
}

type Feedback = { error?: string; success?: string };
type DeliveryErrors = Partial<Record<"minimum" | "fee" | "threshold", string>>;

const IBAN_PATTERN = /^TR\d{24}$/;
const IBAN_DIGIT_COUNT = 24;

// Yalnız rakamları tutar (yapıştırırken "TR" gelse bile \D onu da eler),
// TR öneki ayrı bir sabit etiket olarak input'un üstünde gösterildiği için
// kullanıcı hiçbir zaman TR'yi silemez/değiştiremez.
function extractIbanDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, IBAN_DIGIT_COUNT);
}

// Girilmemiş haneleri alt çizgiyle gösterip 4'erli gruplar hâlinde biçimlendirir.
function maskIbanDigits(digits: string) {
  const padded = digits.padEnd(IBAN_DIGIT_COUNT, "_");
  return padded.replace(/(.{4})/g, "$1 ").trim();
}

function moneyInput(value: number | null) {
  return value === null ? "" : String(value);
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function formatIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

async function apiRequest(method: "GET" | "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>) {
  const response = await fetch("/api/store/delivery", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as ApiPayload;
  if (!response.ok) throw new Error(result.error ?? "İşlem tamamlanamadı.");
  return result;
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (feedback.error) {
    return <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{feedback.error}</p>;
  }
  if (feedback.success) {
    return <p className="rounded-[12px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{feedback.success}</p>;
  }
  return null;
}

export function StoreDeliverySettingsForm({ initial }: Props) {
  const [delivery, setDelivery] = useState({
    minimumOrderAmount: moneyInput(initial.delivery.minimumOrderAmount),
    standardDeliveryFee: moneyInput(initial.delivery.standardDeliveryFee),
    freeDeliveryThreshold: moneyInput(initial.delivery.freeDeliveryThreshold),
  });
  const [payment, setPayment] = useState(initial.payment);
  const [accounts, setAccounts] = useState(initial.bankAccounts.filter((account) => account.isActive));
  const [accountHolderName, setAccountHolderName] = useState("");
  const [ibanDigits, setIbanDigits] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryErrors>({});
  const [deliveryFeedback, setDeliveryFeedback] = useState<Feedback>({});
  const [paymentFeedback, setPaymentFeedback] = useState<Feedback>({});
  const [bankFeedback, setBankFeedback] = useState<Feedback>({});

  const defaultAccount = useMemo(
    () => accounts.find((account) => account.isActive && account.isDefault) ?? null,
    [accounts],
  );
  const bankTransferNeedsAccount = payment.bankTransfer && !defaultAccount;

  async function refreshAccounts() {
    const result = await apiRequest("GET");
    if (result.bankAccounts) setAccounts(result.bankAccounts.filter((account) => account.isActive));
  }

  async function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minimum = parseMoney(delivery.minimumOrderAmount);
    const fee = parseMoney(delivery.standardDeliveryFee);
    const threshold = delivery.freeDeliveryThreshold.trim() === "" ? null : parseMoney(delivery.freeDeliveryThreshold);
    const errors: DeliveryErrors = {};
    if (minimum === null) errors.minimum = "Sıfır veya daha büyük, en fazla iki ondalıklı bir tutar girin.";
    if (fee === null) errors.fee = "Sıfır veya daha büyük, en fazla iki ondalıklı bir tutar girin.";
    if (delivery.freeDeliveryThreshold.trim() !== "" && threshold === null) {
      errors.threshold = "Geçerli bir tutar girin veya ücretsiz teslimat kullanmıyorsanız boş bırakın.";
    } else if (minimum !== null && threshold !== null && threshold < minimum) {
      errors.threshold = "Ücretsiz teslimat eşiği minimum sepet tutarından düşük olamaz.";
    }
    setDeliveryErrors(errors);
    setDeliveryFeedback({});
    if (Object.keys(errors).length > 0) return;

    setBusy("delivery");
    try {
      await apiRequest("PATCH", {
        section: "delivery",
        minimumOrderAmount: minimum,
        standardDeliveryFee: fee,
        freeDeliveryThreshold: threshold,
      });
      setDeliveryFeedback({ success: "Teslimat kuralları kaydedildi." });
    } catch (error) {
      setDeliveryFeedback({ error: error instanceof Error ? error.message : "Teslimat ayarları kaydedilemedi." });
    } finally {
      setBusy(null);
    }
  }

  function togglePayment(key: keyof PaymentSettings) {
    const next = { ...payment, [key]: !payment[key] };
    if (!next.cashOnDelivery && !next.cardOnDelivery && !next.bankTransfer) {
      setPaymentFeedback({ error: "En az bir ödeme yöntemi açık kalmalıdır." });
      return;
    }
    setPayment(next);
    setPaymentFeedback({});
  }

  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment.cashOnDelivery && !payment.cardOnDelivery && !payment.bankTransfer) {
      setPaymentFeedback({ error: "En az bir ödeme yöntemi açık kalmalıdır." });
      return;
    }
    setBusy("payment");
    setPaymentFeedback({});
    try {
      await apiRequest("PATCH", { section: "payment", ...payment });
      setPaymentFeedback({ success: "Ödeme yöntemleri kaydedildi." });
    } catch (error) {
      setPaymentFeedback({ error: error instanceof Error ? error.message : "Ödeme yöntemleri kaydedilemedi." });
    } finally {
      setBusy(null);
    }
  }

  async function addBankAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedIban = `TR${ibanDigits}`;
    if (accountHolderName.trim().length < 2) {
      setBankFeedback({ error: "Hesap sahibinin adını girin." });
      return;
    }
    if (!IBAN_PATTERN.test(normalizedIban)) {
      setBankFeedback({ error: `IBAN eksik: ${IBAN_DIGIT_COUNT} haneden ${ibanDigits.length} tanesini girdin.` });
      return;
    }

    setBusy("bank");
    setBankFeedback({});
    try {
      await apiRequest("POST", { accountHolderName, iban: normalizedIban, makeDefault: true });
      await refreshAccounts();
      setAccountHolderName("");
      setIbanDigits("");
      setBankFeedback({ success: "Banka hesabı eklendi." });
    } catch (error) {
      setBankFeedback({ error: error instanceof Error ? error.message : "Banka hesabı eklenemedi." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(account: BankAccount) {
    if (!window.confirm(`${account.accountHolderName} adına kayıtlı banka hesabı silinsin mi?`)) return;
    setBusy(`delete:${account.id}`);
    setBankFeedback({});
    try {
      await apiRequest("DELETE", { accountId: account.id });
      await refreshAccounts();
      setBankFeedback({ success: "Banka hesabı silindi." });
    } catch (error) {
      setBankFeedback({ error: error instanceof Error ? error.message : "Banka hesabı silinemedi." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6" aria-labelledby="delivery-settings-title">
        <div>
          <p className="eyebrow">1 · Teslimat</p>
          <h2 id="delivery-settings-title" className="mt-2 text-2xl font-bold">Teslimat kuralları</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Tutarlar checkout sırasında sunucuda yeniden hesaplanır.</p>
        </div>
        <form onSubmit={saveDelivery} noValidate className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <MoneyField id="minimum-order-amount" label="Minimum sepet tutarı" value={delivery.minimumOrderAmount} onChange={(value) => setDelivery({ ...delivery, minimumOrderAmount: value })} help="Müşterinin sipariş verebilmesi için gereken alt limit." error={deliveryErrors.minimum} />
            <MoneyField id="standard-delivery-fee" label="Standart teslimat ücreti" value={delivery.standardDeliveryFee} onChange={(value) => setDelivery({ ...delivery, standardDeliveryFee: value })} help="Mahalleye özel ücret yoksa bu tutar kullanılır." error={deliveryErrors.fee} />
            <MoneyField id="free-delivery-threshold" label="Ücretsiz teslimat eşiği" value={delivery.freeDeliveryThreshold} onChange={(value) => setDelivery({ ...delivery, freeDeliveryThreshold: value })} help="Boş bırakırsanız ücretsiz teslimat uygulanmaz." error={deliveryErrors.threshold} optional />
          </div>
          <FeedbackMessage feedback={deliveryFeedback} />
          <button type="submit" disabled={busy !== null} className="button-primary w-full sm:w-auto">{busy === "delivery" ? "Kaydediliyor..." : "Teslimat kurallarını kaydet"}</button>
        </form>
      </section>

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="payment-settings-title">
        <div>
          <p className="eyebrow">2 · Ödeme</p>
          <h2 id="payment-settings-title" className="mt-2 text-2xl font-bold">Kabul ettiğiniz yöntemler</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-text)]">Müşteri ödeme ekranında yalnız açık olan yöntemleri görür.</p>
        </div>
        <form onSubmit={savePayment} className="mt-6 space-y-5">
          <fieldset>
            <legend className="sr-only">Ödeme yöntemleri</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["cashOnDelivery", "Kapıda nakit", "Sipariş tesliminde nakit ödeme"],
                ["cardOnDelivery", "Kapıda kart", "Kendi POS cihazınızla ödeme"],
                ["bankTransfer", "IBAN / havale", "Varsayılan hesabınıza transfer"],
              ] as const).map(([key, title, description]) => (
                <label key={key} className="flex min-h-24 cursor-pointer items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary-light)]">
                  <input type="checkbox" checked={payment[key]} onChange={() => togglePayment(key)} disabled={busy !== null} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]" />
                  <span><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs font-medium leading-5 text-[var(--color-muted-text)]">{description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {bankTransferNeedsAccount && <BankTransferWarning />}
          <FeedbackMessage feedback={paymentFeedback} />
          <button type="submit" disabled={busy !== null} className="button-primary w-full sm:w-auto">{busy === "payment" ? "Kaydediliyor..." : "Ödeme yöntemlerini kaydet"}</button>
        </form>
      </section>

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6" aria-labelledby="bank-settings-title">
        <div>
          <p className="eyebrow">3 · Banka hesabı</p>
          <h2 id="bank-settings-title" className="mt-2 text-2xl font-bold">Havale hesabı</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-text)]">
            IBAN yalnız mağaza sahibi tarafından yönetilir; müşteriye sadece kontrollü sipariş akışında gösterilir. Mağaza başına tek hesap tutulur — değiştirmek için önce mevcut hesabı sil.
          </p>
        </div>
        {bankTransferNeedsAccount && <div className="mt-5"><BankTransferWarning urgent /></div>}

        {accounts.length === 0 ? (
          <form onSubmit={addBankAccount} noValidate className="mt-6 rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 sm:p-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="form-field" htmlFor="account-holder-name">Hesap sahibi adı
                <input id="account-holder-name" className="form-control" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} maxLength={120} autoComplete="name" required />
              </label>
              <label className="form-field" htmlFor="store-iban">IBAN
                <span className="relative block">
                  <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono font-extrabold tracking-wide text-[var(--color-ink)]">TR</span>
                  <input
                    id="store-iban"
                    className="form-control pl-11 font-mono uppercase tracking-[0.15em]"
                    value={maskIbanDigits(ibanDigits)}
                    onChange={(event) => setIbanDigits(extractIbanDigits(event.target.value))}
                    onPaste={(event) => {
                      event.preventDefault();
                      setIbanDigits(extractIbanDigits(event.clipboardData.getData("text")));
                    }}
                    inputMode="numeric"
                    maxLength={IBAN_DIGIT_COUNT + 6}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="store-iban-help"
                    required
                  />
                </span>
                <span id="store-iban-help" className="text-xs font-medium leading-5 text-[var(--color-muted-text)]">
                  TR sabit — ardından {IBAN_DIGIT_COUNT} rakam gir ({ibanDigits.length}/{IBAN_DIGIT_COUNT}).
                </span>
              </label>
            </div>
            <button type="submit" disabled={busy !== null} className="button-secondary mt-4 w-full sm:w-auto">{busy === "bank" ? "Ekleniyor..." : "Banka hesabı ekle"}</button>
          </form>
        ) : (
          <ul className="mt-6 space-y-3">
            {accounts.map((account) => (
              <li key={account.id} className="flex flex-col gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-extrabold">{account.accountHolderName}</p>
                  <p className="mt-2 break-all font-mono text-sm text-[var(--color-muted-text)]">{formatIban(account.iban)}</p>
                </div>
                <button type="button" onClick={() => void deleteAccount(account)} disabled={busy !== null} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-red-200 px-4 text-sm font-extrabold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto" aria-label={`${account.accountHolderName} banka hesabını sil`}>{busy === `delete:${account.id}` ? "Siliniyor..." : "Sil"}</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4" aria-live="polite"><FeedbackMessage feedback={bankFeedback} /></div>
      </section>
    </div>
  );
}

function MoneyField({ id, label, value, onChange, help, error, optional = false }: { id: string; label: string; value: string; onChange: (value: string) => void; help: string; error?: string; optional?: boolean }) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return <label className="form-field" htmlFor={id}>{label}<span className="relative"><input id={id} className="form-control pr-12 tabular-nums" value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" autoComplete="off" placeholder={optional ? "İsteğe bağlı" : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${helpId} ${errorId}` : helpId} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-[var(--color-muted-text)]">TL</span></span><span id={helpId} className="text-xs font-medium leading-5 text-[var(--color-muted-text)]">{help}</span>{error && <span id={errorId} className="text-xs font-semibold text-red-700">{error}</span>}</label>;
}

function BankTransferWarning({ urgent = false }: { urgent?: boolean }) {
  return <p className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900" role={urgent ? "alert" : "status"}>{urgent ? "İşlem gerekli: Havale ile sipariş alabilmek için aktif bir varsayılan hesap ekleyin." : "Havale açık ancak aktif bir varsayılan banka hesabınız yok. Aşağıdan hesap ekleyip varsayılan olarak belirleyin; aksi halde havale siparişi oluşturulamaz."}</p>;
}
