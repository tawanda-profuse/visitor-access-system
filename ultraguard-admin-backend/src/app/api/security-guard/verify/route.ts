import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { verifyAccessAtGate } from "@/lib/gate-verification";
import { checkRateLimit } from "@/lib/rate-limit";
import { devLog } from "@/lib/dev-log";

export const runtime = "nodejs";

const schema = z.object({
  gateId: z.string().min(1),
  input: z.string().min(4),
  method: z.enum(["PIN", "QR"]),
});

/**
 * POST /api/security-guard/verify — no auth (by design: Security Guard mode must be
 * usable without an account, see the mobile app's `/guard` flow). A guard physically
 * standing at a specific gate scans a Gate Pass QR or types its PIN; this checks
 * existence, the wrong-location case, revocation/use, and expiry, in that order, and
 * returns a stable result code (not free text) so the UI can render a deterministic
 * "ACCESS GRANTED"/"ACCESS DENIED" state with a tailored reason.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`${ip}:${body.gateId}`, 10, 60_000)) {
      throw new ApiError("Too many attempts — please wait a moment and try again", 429);
    }

    const gate = await prisma.gate.findUnique({ where: { id: body.gateId }, include: { property: true } });
    if (!gate) throw new ApiError("Gate not found", 404);

    const result = await verifyAccessAtGate({
      gate,
      input: body.input,
      method: body.method,
      verifiedVia: "SECURITY_GUARD",
    });

    devLog(`Security guard verify @ ${gate.name}: ${result.resultCode} (${result.message})`);

    return ok({
      resultCode: result.resultCode,
      message: result.message,
      visit: result.visit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
