import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { verifyToken, getBearerToken } from "@/lib/auth";
import { generateUniqueAccessCredentials } from "@/lib/access-codes";

export const runtime = "nodejs";

// GET /api/access-codes
// Resident app: "Visitor History & Logs" / active invite list (own codes only).
// Admin portal: all codes, optionally filtered by ?residentId=.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const where =
      payload.subjectType === "resident"
        ? { residentId: payload.residentId, ...(status ? { status: status as never } : {}) }
        : {
            ...(req.nextUrl.searchParams.get("residentId")
              ? { residentId: req.nextUrl.searchParams.get("residentId")! }
              : {}),
            ...(status ? { status: status as never } : {}),
          };

    const accessCodes = await prisma.accessCode.findMany({
      where,
      include: { resident: true },
      orderBy: { createdAt: "desc" },
    });

    return ok({ accessCodes });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z
  .object({
    type: z.enum(["ONE_TIME", "TIME_BOUND", "RECURRING"]),
    visitorName: z.string().min(1),
    visitorPhone: z.string().optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date(),
    maxUses: z.number().int().positive().optional(),
    recurrenceRule: z
      .object({
        daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .optional(),
  })
  .refine((data) => data.type !== "RECURRING" || data.recurrenceRule, {
    message: "recurrenceRule is required for RECURRING passes",
    path: ["recurrenceRule"],
  });

// POST /api/access-codes
// Resident app: "Invite Visitor" — generates the 6-digit PIN + dynamic QR token that the
// resident then shares via WhatsApp/SMS/Email (one-click sharing happens client-side).
export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    if (payload.subjectType !== "resident") {
      throw new ApiError("Only residents can create visitor invites", 403);
    }
    const body = createSchema.parse(await req.json());

    const validFrom = body.validFrom ?? new Date();
    if (body.validUntil <= validFrom) {
      throw new ApiError("validUntil must be after validFrom", 422);
    }

    const { code, qrToken } = await generateUniqueAccessCredentials();

    const accessCode = await prisma.accessCode.create({
      data: {
        code,
        qrToken,
        type: body.type,
        residentId: payload.residentId,
        visitorName: body.visitorName,
        visitorPhone: body.visitorPhone,
        validFrom,
        validUntil: body.validUntil,
        maxUses: body.type === "ONE_TIME" ? 1 : body.maxUses ?? (body.type === "RECURRING" ? 1000 : 1),
        recurrenceRule: body.recurrenceRule ? JSON.stringify(body.recurrenceRule) : null,
      },
    });

    return ok({ accessCode }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
