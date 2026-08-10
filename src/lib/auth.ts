import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type UserRole = "ADMIN" | "WHOLESALE_SELLER" | "NUT_STORE" | "CUSTOMER";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
}

export async function getServerUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore in server components
          }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) return null;

  const role = ((await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role ?? "CUSTOMER") as UserRole;

  return {
    id: user.id,
    email: user.email,
    role,
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getServerUser();
  if (!user) return null;
  if (!allowedRoles.includes(user.role)) return null;
  return user;
}
