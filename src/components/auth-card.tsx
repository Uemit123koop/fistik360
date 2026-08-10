"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@fistik360.com");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("CUSTOMER");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "İşlem başarısız");
      return;
    }

    router.push(`/dashboard/${roleToRoute(role)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-[#4f6b3c] text-white" : "bg-[#f4e8cc] text-[#7a5b2d]"}`}>
          Giriş
        </button>
        <button type="button" onClick={() => setMode("register")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-[#4f6b3c] text-white" : "bg-[#f4e8cc] text-[#7a5b2d]"}`}>
          Kayıt
        </button>
      </div>

      {mode === "register" && (
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-[#d9c8a1] bg-[#fffaf2] px-4 py-3 text-sm">
          <option value="CUSTOMER">Müşteri</option>
          <option value="NUT_STORE">Kuruyemişçi</option>
          <option value="WHOLESALE_SELLER">Toptancı</option>
          <option value="ADMIN">Admin</option>
        </select>
      )}

      <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-[#d9c8a1] bg-[#fffaf2] px-4 py-3 text-sm" placeholder="E-posta" type="email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-[#d9c8a1] bg-[#fffaf2] px-4 py-3 text-sm" placeholder="Şifre" type="password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="w-full rounded-full bg-[#4f6b3c] px-4 py-3 font-semibold text-white">
        {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      </button>
    </form>
  );
}

function roleToRoute(role: string) {
  if (role === "ADMIN") return "admin";
  if (role === "WHOLESALE_SELLER") return "wholesale";
  if (role === "NUT_STORE") return "store";
  return "customer";
}
