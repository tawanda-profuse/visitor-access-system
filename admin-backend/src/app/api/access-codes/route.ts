import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { verifyToken, getBearerToken, requirePropertyScopedAdmin } from "@/lib/auth";
import { generateUniqueAccessCredentials } from "@/lib/access-codes";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";
import { publishEvent } from "@/lib/event-bus";

export const runtime = "nodejs";

// GET /api/access-codes
// Resident app: "Visitor History & Logs" / active invite list (own codes only).
// Admin portal: all codes, optionally filtered by ?residentId= — Property Admins only
// ever see codes belonging to residents linked to a unit in their own property.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    let where: Record<string, unknown>;
    if (payload.subjectType === "resident") {
      where = { residentId: payload.residentId, ...(status ? { status: status as never } : {}) };
    } else {
      const { propertyId } = await requirePropertyScopedAdmin(req);
      where = {
        ...(req.nextUrl.searchParams.get("residentId")
          ? { residentId: req.nextUrl.searchParams.get("residentId")! }
          : {}),
        ...(status ? { status: status as never } : {}),
        ...(propertyId ? { resident: { units: { some: { unit: { propertyId } } } } } : {}),
      };
    }

    // Pagination only applies to the admin portal — the resident app has no pagination UI
    // and expects its own (naturally small) invite list back in full.
    const pagination = payload.subjectType !== "resident" ? parsePagination(req) : null;

    const [accessCodes, total] = await Promise.all([
      prisma.accessCode.findMany({
        where,
        include: { resident: true },
        orderBy: { createdAt: "desc" },
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      prisma.accessCode.count({ where }),
    ]);

    return ok({
      accessCodes,
      ...(pagination ? { pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z
  .object({
    type: z.enum(["ONE_TIME", "TIME_BOUND", "RECURRING"]),
    visitorName: z.string().min(1),
    visitorPhone: z.string().optional(),
    visitorIdNumber: z
      .string()
      .regex(/^[a-zA-Z0-9]+$/, "ID must be alphanumeric")
      .optional(),
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
        visitorIdNumber: body.visitorIdNumber,
        validFrom,
        validUntil: body.validUntil,
        maxUses: body.type === "ONE_TIME" ? 1 : body.maxUses ?? (body.type === "RECURRING" ? 1000 : 1),
        recurrenceRule: body.recurrenceRule ? JSON.stringify(body.recurrenceRule) : null,
      },
      include: { resident: true },
    });
    publishEvent("access-code", "created", accessCode);

    return ok({ accessCode }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
