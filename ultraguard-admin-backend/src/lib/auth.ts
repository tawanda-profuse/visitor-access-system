import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { ApiError } from "./api-response";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export type AuthTokenPayload =
  | { subjectType: "resident"; residentId: string }
  | { subjectType: "admin"; adminId: string; role: string; propertyId: string | null; onboarded: boolean };

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    throw new ApiError("Invalid or expired token", 401);
  }
}

export function getBearerToken(req: NextRequest): string {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError("Missing bearer token", 401);
  }
  return token;
}

export function requireResident(req: NextRequest): { residentId: string } {
  const payload = verifyToken(getBearerToken(req));
  if (payload.subjectType !== "resident") {
    throw new ApiError("Resident authentication required", 403);
  }
  return { residentId: payload.residentId };
}

/**
 * Verifies the bearer JWT and, on top of that, re-checks the admin's live status in the
 * database on every call. This is deliberately a DB round-trip per request (not just a
 * JWT decode) so a Super Admin suspending a Property Admin takes effect immediately —
 * on their very next request — rather than waiting for their JWT to expire (up to
 * JWT_EXPIRES_IN, 7 days by default) or for them to reload the portal.
 */
export async function requireAdmin(
  req: NextRequest,
  allowedRoles?: string[],
): Promise<{ adminId: string; role: string; propertyId: string | null; onboarded: boolean }> {
  const payload = verifyToken(getBearerToken(req));
  if (payload.subjectType !== "admin") {
    throw new ApiError("Admin authentication required", 403);
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new ApiError("Insufficient permissions", 403);
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.adminId },
    select: { status: true },
  });
  if (!admin || admin.status === "SUSPENDED") {
    throw new ApiError("This account has been suspended. Contact your Ultra-Guard administrator.", 403);
  }

  return {
    adminId: payload.adminId,
    role: payload.role,
    propertyId: payload.propertyId,
    onboarded: payload.onboarded,
  };
}

/**
 * Wraps requireAdmin for routes whose data must be scoped to the caller's property
 * when they're a PROPERTY_ADMIN. Blocks a PROPERTY_ADMIN who hasn't finished the
 * onboarding wizard yet (they have no property to scope to). SUPER_ADMIN/OPERATOR
 * get back propertyId: null, meaning "unscoped — see everything".
 */
export async function requirePropertyScopedAdmin(
  req: NextRequest,
  allowedRoles: string[] = ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"],
): Promise<{ adminId: string; role: string; propertyId: string | null }> {
  const auth = await requireAdmin(req, allowedRoles);
  if (auth.role === "PROPERTY_ADMIN") {
    if (!auth.onboarded || !auth.propertyId) {
      throw new ApiError("Please complete onboarding before continuing", 409);
    }
    return { adminId: auth.adminId, role: auth.role, propertyId: auth.propertyId };
  }
  return { adminId: auth.adminId, role: auth.role, propertyId: null };
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
