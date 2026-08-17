import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireResident, verifyToken, getBearerToken, requirePropertyScopedAdmin } from "@/lib/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";
import { publishEvent } from "@/lib/event-bus";
import { sendEmail } from "@/lib/email";
import { panicAlertEmail } from "@/lib/email-templates";
import { getSupportEmail } from "@/lib/settings";
import { devLog } from "@/lib/dev-log";

export const runtime = "nodejs";

// GET /api/panic — Admin portal: monitoring desk view of panic alerts (open first).
// Resident app: a resident's own alert history. Property Admins only see alerts raised
// by residents of their own property.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    let where: Record<string, unknown> = {};
    if (payload.subjectType === "resident") {
      where = { residentId: payload.residentId };
    } else {
      const { propertyId } = requirePropertyScopedAdmin(req);
      where = propertyId ? { propertyId } : {};
    }

    // Pagination only applies to the admin portal — the resident app has no pagination UI
    // and expects its own (naturally small) alert history back in full.
    const pagination = payload.subjectType !== "resident" ? parsePagination(req) : null;

    const [panicAlerts, total] = await Promise.all([
      prisma.panicAlert.findMany({
        where,
        include: { resident: true, property: true, resolvedBy: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      prisma.panicAlert.count({ where }),
    ]);

    return ok({
      panicAlerts,
      ...(pagination ? { pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  message: z.string().max(500).optional(),
});

// POST /api/panic — Resident app: Emergency / Panic Trigger.
// Immediately emails the property's Property Admin(s) if the resident belongs to a
// property, otherwise the Super Admin(s) (falling back to the support email if neither
// exists). propertyId is always derived server-side from the resident's own unit
// assignment — never trusted from the client — to prevent spoofed alert routing.
export async function POST(req: NextRequest) {
  try {
    const { residentId } = requireResident(req);
    const body = createSchema.parse(await req.json());

    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      include: { units: { include: { unit: { include: { property: true } } } } },
    });
    if (!resident) throw new ApiError("Resident not found", 404);

    const primaryUnit = resident.units.find((ru) => ru.isPrimary) ?? resident.units[0];
    const propertyId = primaryUnit?.unit.propertyId ?? null;

    const panicAlert = await prisma.panicAlert.create({
      data: { residentId, propertyId, message: body.message },
      include: { resident: true, property: true },
    });
    publishEvent("panic-alert", "created", panicAlert);

    try {
      const recipients = propertyId
        ? await prisma.admin.findMany({ where: { role: "PROPERTY_ADMIN", propertyId } })
        : await prisma.admin.findMany({ where: { role: "SUPER_ADMIN" } });
      const to = recipients.length > 0 ? recipients.map((a) => a.email) : [await getSupportEmail()];

      const location = panicAlert.property
        ? `${panicAlert.property.name} — ${panicAlert.property.address}`
        : resident.address ?? "Unknown location";

      await sendEmail({
        to,
        ...(await panicAlertEmail({
          residentName: resident.name,
          location,
          message: panicAlert.message ?? "No additional details provided.",
        })),
      });
    } catch (emailError) {
      devLog("Failed to send panic alert email", emailError);
    }

    return ok({ panicAlert }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
