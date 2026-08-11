"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/orders";

const METHOD_NOTES: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Teslimatta nakit ödersin.",
  CARD_ON_DELIVERY: "Kurye POS cihazıyla gelir.",
  BANK_TRANSFER: "Sipariş sonrası IBAN bilgisi gösterilir.",
};

interface Props {
  availableMethods: PaymentMethod[];
  defaultName: string;
  blocked?: string | null;
}

export function CheckoutForm({ availableMethods, defaultName, blocked = null }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    customerName: defaultName,
    customerPhone: "",
    deliveryAddress: "",
    customerNote: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(availableMethods[0] ?? "");
  const [contractAccepted, setContractAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentsGiven = contractAccepted && privacyAcknowledged;
  const canSubmit = !blocked && consentsGiven && paymentMethod !== "" && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, paymentMethod, contractAccepted, privacyAcknowledged }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Sipariş oluşturulamadı.");
        return;
      }
      router.push(`/dashboard/customer/orders?placed=${result.orderId}`);
      router.refresh();
    } catch {
      setError("Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="form-field">
          Ad soyad
          <input
            className="form-control"
            value={form.customerName}
            onChange={(event) => setForm({ ...form, customerName: event.target.value })}
            maxLength={120}
            required
          />
        </label>
        <label className="form-field">
          Telefon
          <input
            className="form-control"
            value={form.customerPhone}
            onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
            type="tel"
            inputMode="tel"
            maxLength={20}
            required
          />
        </label>
      </div>

      <label className="form-field">
        Teslimat adresi
        <textarea
          className="form-control min-h-24 resize-y"
          value={form.deliveryAddress}
          onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })}
          maxLength={500}
          required
          placeholder="Mahalle, sokak, bina ve daire numarası"
        />
      </label>

      <label className="form-field">
        Sipariş notu <span className="font-normal opacity-60">(isteğe bağlı)</span>
        <textarea
          className="form-control min-h-20 resize-y"
          value={form.customerNote}
          onChange={(event) => setForm({ ...form, customerNote: event.target.value })}
          maxLength={500}
          placeholder="Kapı zili çalışmıyor, arayın gibi..."
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold">Ödeme yöntemi</legend>
        {availableMethods.length === 0 && (
          <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
            Bu mağaza henüz ödeme yöntemi tanımlamamış.
          </p>
        )}
        {availableMethods.map((method) => (
          <label
            key={method}
            className="flex min-h-12 cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--color-border)] bg-white p-4 text-sm has-checked:border-[var(--color-primary)] has-checked:bg-[var(--color-primary-soft)]"
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method}
              checked={paymentMethod === method}
              onChange={() => setPaymentMethod(method)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block font-bold">{PAYMENT_METHOD_LABELS[method]}</span>
              <span className="mt-0.5 block text-xs leading-5 text-[var(--color-muted-text)]">{METHOD_NOTES[method]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-3 border-t border-[var(--color-border-soft)] pt-5">
        <legend className="text-sm font-extrabold">Sipariş onayları</legend>
        <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-xs leading-5">
          <input
            type="checkbox"
            required
            checked={contractAccepted}
            onChange={(event) => setContractAccepted(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <Link href="/sayfalar/mesafeli-satis-sozlesmesi" className="font-extrabold underline underline-offset-2">
              Mesafeli Satış Sözleşmesi
            </Link>{" "}
            ve sipariş ön bilgilerini okudum; sipariş onayının ödeme yükümlülüğü doğurduğunu kabul ediyorum.{" "}
            <strong>(Zorunlu)</strong>
          </span>
        </label>
        <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-[var(--color-border)] p-3 text-xs leading-5">
          <input
            type="checkbox"
            required
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-extrabold underline underline-offset-2">
              KVKK Aydınlatma Metni
            </Link>{" "}
            ve{" "}
            <Link href="/sayfalar/gizlilik-politikasi" className="font-extrabold underline underline-offset-2">
              Gizlilik Politikası
            </Link>{" "}
            hakkında bilgilendirildim. <strong>(Zorunlu)</strong>
          </span>
        </label>
      </fieldset>

      {blocked && (
        <p className="rounded-[12px] bg-[#fff5df] p-4 text-sm font-semibold text-[#6d4b17]" role="status">
          {blocked}
        </p>
      )}
      {error && (
        <p className="rounded-[12px] bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={!canSubmit} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-45">
        {busy ? "Sipariş oluşturuluyor..." : "Siparişi onayla"}
      </button>
      <p className="text-center text-xs leading-5 text-[var(--color-muted-text)]">
        Tutar sunucuda yeniden hesaplanır; bu ekranda gösterilen toplam bağlayıcıdır.
      </p>
    </form>
  );
}
