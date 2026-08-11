import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { roleToDashboardPath } from "@/lib/roles";

export default async function DashboardRootPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/giris");
  }

  redirect(roleToDashboardPath(user.role));
}
