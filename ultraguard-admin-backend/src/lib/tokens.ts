import crypto from "crypto";
import { nanoid } from "nanoid";
import { prisma } from "./prisma";
import { ApiError } from "./api-response";

export type SubjectType = "ADMIN" | "RESIDENT";
export type TokenPurpose = "INVITE" | "RESET";

const EXPIRY_MS: Record<TokenPurpose, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
};

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Creates a one-time-use token backing the invite/reset flows for both Admins and
 * Residents. Any prior outstanding (unused) token for the same subject+purpose is
 * invalidated first, so re-sending an invite/reset email can't leave multiple live
 * links. Returns the raw token — only ever available here, never stored or logged.
 */
export async function createPasswordSetupToken(
  subjectType: SubjectType,
  subjectId: string,
  purpose: TokenPurpose,
): Promise<string> {
  await prisma.passwordSetupToken.deleteMany({
    where: { subjectType, subjectId, purpose, usedAt: null },
  });

  const raw = nanoid(32);
  await prisma.passwordSetupToken.create({
    data: {
      subjectType,
      subjectId,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + EXPIRY_MS[purpose]),
    },
  });

  return raw;
}

/**
 * Validates and consumes a raw token, marking it used in the same call so it can't
 * be replayed. Throws distinct messages for "not found/already used" vs "expired".
 */
export async function consumePasswordSetupToken(
  raw: string,
  expectedPurpose?: TokenPurpose,
): Promise<{ subjectType: SubjectType; subjectId: string; purpose: TokenPurpose }> {
  const record = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });

  if (!record || record.usedAt || (expectedPurpose && record.purpose !== expectedPurpose)) {
    throw new ApiError("This link is invalid or has already been used", 400);
  }
  if (record.expiresAt < new Date()) {
    throw new ApiError("This link has expired — please request a new one", 400);
  }

  await prisma.passwordSetupToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return {
    subjectType: record.subjectType as SubjectType,
    subjectId: record.subjectId,
    purpose: record.purpose as TokenPurpose,
  };
}
