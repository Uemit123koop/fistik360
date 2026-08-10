import { SiteShell } from "@/components/site-shell";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fıstık360 | Mahallenin kuruyemiş pazarı",
  description: "Toptan pazaryeri ve mahalle kuruyemişçileri için modern bir platform.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f7f1e6] text-[#2b231b]"> 
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
