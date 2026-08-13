import { redirect } from "next/navigation";

// Sepet artık tek arayüz: sağdan açılan SmartCartDrawer. Bu sayfa yalnızca
// eski/doğrudan bağlantıları drawer'ı otomatik açan ana sayfaya yönlendirir
// (AuthModalUrlTrigger'ın ?auth=login deseninin aynısı).
export default function CartPage() {
  redirect("/?cart=open");
}
