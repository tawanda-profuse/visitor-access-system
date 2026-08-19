import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { signToken, verifyPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const schema = z.object({
  identifier: z.string().min(1), // phone or email
  password: z.string().min(1),
});

// POST /api/auth/resident/login — mobile app sign-in via phone or email + password.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const identifier = body.identifier.trim();

    // Includes `units` (matching /api/auth/me's shape exactly) so a freshly-logged-in
    // session has complete data immediately — without this, screens that read
    // resident.units (e.g. Guard mode's "which gates are at my property" filter) would
    // incorrectly see an empty list until the next /api/auth/me refresh repopulated it.
    const include = { units: { include: { unit: { include: { property: true as const } } } } };
    const resident = identifier.includes("@")
      ? await prisma.resident.findUnique({ where: { email: identifier.toLowerCase() }, include })
      : await (async () => {
          try {
            return await prisma.resident.findUnique({ where: { phone: normalizePhone(identifier) }, include });
          } catch {
            return null;
          }
        })();

    if (!resident || resident.status !== "ACTIVE") {
      throw new ApiError("Invalid credentials", 401);
    }
    if (!resident.passwordHash) {
      throw new ApiError("Please check your email to set your password before signing in", 403);
    }
    if (!(await verifyPassword(body.password, resident.passwordHash))) {
      throw new ApiError("Invalid credentials", 401);
    }

    const token = signToken({ subjectType: "resident", residentId: resident.id });
    const { passwordHash: _passwordHash, ...residentSafe } = resident;

    return ok({ token, resident: residentSafe });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
