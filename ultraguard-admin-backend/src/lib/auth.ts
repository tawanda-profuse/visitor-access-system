import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { ApiError } from "./api-response";

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

export function requireAdmin(
  req: NextRequest,
  allowedRoles?: string[],
): { adminId: string; role: string; propertyId: string | null; onboarded: boolean } {
  const payload = verifyToken(getBearerToken(req));
  if (payload.subjectType !== "admin") {
    throw new ApiError("Admin authentication required", 403);
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new ApiError("Insufficient permissions", 403);
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
export function requirePropertyScopedAdmin(
  req: NextRequest,
  allowedRoles: string[] = ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"],
): { adminId: string; role: string; propertyId: string | null } {
  const auth = requireAdmin(req, allowedRoles);
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
