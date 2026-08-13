"use client";

import { useState } from "react";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction } from "@/app/address-actions";
import { TurkeyLocationFields } from "@/components/turkey-location-fields";
import type { LocationSelection } from "@/lib/location-types";

export interface CustomerAddressRow {
  id: string;
  province: string;
  district: string;
  neighborhood: string;
  street: string;
  building_no: string;
  apartment_no: string | null;
  label: string | null;
  is_default: boolean;
}

export function CustomerAddressManager({ initialAddresses }: { initialAddresses: CustomerAddressRow[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(addresses.length === 0);
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [street, setStreet] = useState("");
  const [buildingNo, setBuildingNo] = useState("");
  const [apartmentNo, setApartmentNo] = useState("");
  const [label, setLabel] = useState("");
  const [makeDefault, setMakeDefault] = useState(addresses.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    const json = (await res.json()) as { addresses?: CustomerAddressRow[] };
    setAddresses(json.addresses ?? []);
  }

  async function makeDefaultAddress(id: string) {
    setBusyId(id);
    await setDefaultAddressAction(id);
    await refresh();
    setBusyId(null);
  }

  async function removeAddress(id: string) {
    setBusyId(id);
    await deleteAddressAction(id);
    await refresh();
    setBusyId(null);
  }

  async function saveNewAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!location) {
      setError("Mahalle seç.");
      return;
    }
    const trimmedStreet = street.trim();
    const trimmedBuildingNo = buildingNo.trim();
    if (!trimmedStreet || !trimmedBuildingNo) {
      setError("Sokak ve bina no zorunludur.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await addAddressAction({
        location,
        street: trimmedStreet,
        buildingNo: trimmedBuildingNo,
        apartmentNo: apartmentNo.trim() || undefined,
        label: label.trim() || undefined,
        makeDefault,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLocation(null);
      setStreet("");
      setBuildingNo("");
      setApartmentNo("");
      setLabel("");
      setMakeDefault(false);
      setShowAddForm(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-[18px] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {address.label && <span className="font-bold text-[var(--color-ink)]">{address.label}</span>}
                    {address.is_default && (
                      <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-extrabold text-white">Varsayılan</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink)]">
                    {address.street} No:{address.building_no}{address.apartment_no ? `/${address.apartment_no}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-text)]">{address.neighborhood} Mah. · {address.district}/{address.province}</p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs font-bold">
                  {!address.is_default && (
                    <button type="button" disabled={busyId === address.id} onClick={() => makeDefaultAddress(address.id)} className="text-[var(--color-primary)] hover:underline disabled:opacity-50">
                      Varsayılan yap
                    </button>
                  )}
                  <button type="button" disabled={busyId === address.id} onClick={() => removeAddress(address.id)} className="text-[#8a3324] hover:underline disabled:opacity-50">
                    Sil
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAddForm ? (
        <form onSubmit={saveNewAddress} className="space-y-4 rounded-[18px] border border-dashed border-[var(--color-border)] bg-white p-4 sm:p-5">
          <TurkeyLocationFields value={location} onChange={setLocation} compact />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-field">Sokak
              <input className="form-control" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={150} required />
            </label>
            <label className="form-field">Bina no
              <input className="form-control" value={buildingNo} onChange={(e) => setBuildingNo(e.target.value)} maxLength={20} required />
            </label>
            <label className="form-field">Ek adres <span className="font-normal opacity-60">(isteğe bağlı)</span>
              <input className="form-control" value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} maxLength={20} placeholder="Daire no, kat vb." />
            </label>
            <label className="form-field">Etiket <span className="font-normal opacity-60">(Ev, İş vb.)</span>
              <input className="form-control" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
            Varsayılan adresim olsun
          </label>
          {error && <p className="text-xs font-semibold text-[#8a3324]" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="button-primary flex-1">{saving ? "Kaydediliyor..." : "Adresi kaydet"}</button>
            {addresses.length > 0 && (
              <button type="button" className="button-secondary" disabled={saving} onClick={() => setShowAddForm(false)}>Vazgeç</button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" className="button-secondary w-full" onClick={() => setShowAddForm(true)}>+ Yeni adres ekle</button>
      )}
    </div>
  );
}
