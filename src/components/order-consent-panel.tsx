"use client";

import Link from "next/link";
import { useState } from "react";

interface OrderConsentPanelProps {
  blocked?: boolean;
  demo?: boolean;
}

export function OrderConsentPanel({ blocked = false, demo = false }: OrderConsentPanelProps) {
  const [contractAccepted, setContractAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const canContinue = contractAccepted && privacyAcknowledged && !blocked;

  return (
    <div className="mt-5 border-t border-current/15 pt-5">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-extrabold">Sipariş onayları</legend>
        <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-current/15 bg-white/8 p-3 text-xs leading-5">
          <input
            type="checkbox"
            required
            checked={contractAccepted}
            onChange={(event) => setContractAccepted(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <Link href="/sayfalar/mesafeli-satis-sozlesmesi" className="font-extrabold underline underline-offset-2">Mesafeli Satış Sözleşmesi</Link>
            {" "}ve sipariş ön bilgilerini okudum; sipariş onayının ödeme yükümlülüğü doğurduğunu kabul ediyorum. <strong>(Zorunlu)</strong>
          </span>
        </label>
        <label className="flex min-h-12 items-start gap-3 rounded-[12px] border border-current/15 bg-white/8 p-3 text-xs leading-5">
          <input
            type="checkbox"
            required
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <Link href="/sayfalar/kvkk-aydinlatma-metni" className="font-extrabold underline underline-offset-2">KVKK Aydınlatma Metni</Link>
            {" "}ve <Link href="/sayfalar/gizlilik-politikasi" className="font-extrabold underline underline-offset-2">Gizlilik Politikası</Link> hakkında bilgilendirildim. <strong>(Zorunlu)</strong>
          </span>
        </label>
      </fieldset>

      <button
        type="button"
        disabled={!canContinue || confirmed}
        onClick={() => demo && setConfirmed(true)}
        className="mt-4 min-h-12 w-full rounded-full bg-[#d7ec9c] px-5 font-extrabold text-[#173f31] transition-colors hover:bg-[#e5f4bc] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {confirmed ? "Demo sipariş onayı alındı" : demo ? "Demo siparişi onayla" : "Sipariş adımına geç"}
      </button>
      {blocked && <p className="mt-3 text-center text-xs leading-5 opacity-70">Gerçek sipariş oluşturma henüz aktif değil; onaylar checkout açıldığında sunucu tarafında da doğrulanacak.</p>}
      {confirmed && <p className="mt-3 rounded-[10px] bg-white/10 p-3 text-xs font-bold leading-5" role="status">Demo tamamlandı; ödeme alınmadı ve gerçek sipariş oluşturulmadı.</p>}
    </div>
  );
}
