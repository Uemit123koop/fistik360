import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { brandLogoPath } from "@/components/brand-logo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const title = "Fıstık360 | Kuruyemiş Pazaryeri";
const description = "Mahallendeki kuruyemişçileri keşfet, kuruyemiş sektörünün toptan pazarına eriş.";
const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  applicationName: "Fıstık360",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Fıstık360",
    title,
    description,
    images: [{ url: brandLogoPath, width: 1772, height: 1181, alt: "Fıstık360 kuruyemiş pazaryeri" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [brandLogoPath],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
