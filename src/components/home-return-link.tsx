"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HomeReturnLink() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-extrabold text-[var(--color-primary-dark)] transition-colors hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:px-3 sm:text-sm" aria-label="Ana sayfaya dön"><span aria-hidden="true">←</span><span className="ml-1">Ana sayfa</span></Link>;
}
