import { SiteShell } from "@/components/site-shell";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
