export const USER_ROLES = [
  "ADMIN",
  "WHOLESALE_SELLER",
  "NUT_STORE",
  "CUSTOMER",
  'BRAND_PARTNER',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const dashboardPaths: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  WHOLESALE_SELLER: "/dashboard/wholesale",
  NUT_STORE: "/seller",
  CUSTOMER: "/dashboard/customer",
  BRAND_PARTNER: '/dashboard/partner',
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function roleToDashboardPath(role: UserRole) {
  return dashboardPaths[role];
}
