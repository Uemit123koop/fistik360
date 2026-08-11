import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isUserRole, type UserRole } from "@/lib/roles";

export type { UserRole } from "@/lib/roles";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
}

export const getServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || !isUserRole(profile.role)) return null;

  return {
    id: userId,
    email: profile.email,
    role: profile.role,
  } satisfies AppUser;
});

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const user = await getServerUser();
  if (!user || !allowedRoles.includes(user.role)) return null;
  return user;
}
