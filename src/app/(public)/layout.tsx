import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Fıstık360 | Kuruyemiş Pazaryeri",
  description: "Mahallendeki kuruyemişçileri keşfet, kuruyemiş sektörünün toptan pazarına eriş.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
