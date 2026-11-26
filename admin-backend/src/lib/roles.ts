import type { AdminUser } from "./auth-context";

// Pure role-check helpers shared across the portal. Kept dependency-free (no React) so
// they can be called from anywhere — page guards, nav visibility, form logic, etc.

export function isSuperAdmin(admin: AdminUser | null): boolean {
  return admin?.role === "SUPER_ADMIN";
}

export function isPropertyAdmin(admin: AdminUser | null): boolean {
  return admin?.role === "PROPERTY_ADMIN";
}

// Only the Super Admin may edit the org-wide Support Contact email (Settings API is
// restricted to SUPER_ADMIN server-side).
export function canManageSettings(admin: AdminUser | null): boolean {
  return admin?.role === "SUPER_ADMIN";
}

// A Property Admin who hasn't finished the onboarding wizard yet must be routed there
// before they can use any other portal page.
export function needsOnboarding(admin: AdminUser | null): boolean {
  return admin?.role === "PROPERTY_ADMIN" && !admin.onboardingCompletedAt;
}
