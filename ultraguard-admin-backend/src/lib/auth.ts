import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { ApiError } from "./api-response";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export type AuthTokenPayload =
  | { subjectType: "resident"; residentId: string }
  | { subjectType: "admin"; adminId: string; role: string };

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
): { adminId: string; role: string } {
  const payload = verifyToken(getBearerToken(req));
  if (payload.subjectType !== "admin") {
    throw new ApiError("Admin authentication required", 403);
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new ApiError("Insufficient permissions", 403);
  }
  return { adminId: payload.adminId, role: payload.role };
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
