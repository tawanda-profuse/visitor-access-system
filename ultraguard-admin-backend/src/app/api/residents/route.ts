import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";
import { buildAddress } from "@/lib/address";
import { normalizePhone } from "@/lib/phone";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";
import { createPasswordSetupToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { residentInviteEmail } from "@/lib/email-templates";
import { devLog } from "@/lib/dev-log";

export const runtime = "nodejs";

// GET /api/residents — Admin Portal: Resident Directory Management (list/search).
// Property Admins only see residents assigned to a unit in their own property.
//
// `?unassigned=true` switches to a different pool: every resident with NO unit
// assignment at all (standalone) — used to source candidates for "add an existing
// resident to my property" (see POST /api/properties/:id/residents). A Super Admin sees
// every unassigned resident system-wide; a Property Admin only sees ones whose
// `lastPropertyId` matches their own property — i.e. residents that were previously
// created for or assigned to their property (then removed), never residents that were
// never associated with them (e.g. another property's leftovers, or Super-Admin-created
// standalone/private residents).
export async function GET(req: NextRequest) {
  try {
    const { propertyId } = requirePropertyScopedAdmin(req);
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const unassignedOnly = req.nextUrl.searchParams.get("unassigned") === "true";

    const where = {
      ...(unassignedOnly
        ? { units: { none: {} }, ...(propertyId ? { lastPropertyId: propertyId } : {}) }
        : propertyId
          ? { units: { some: { unit: { propertyId } } } }
          : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const pagination = parsePagination(req);
    const [residents, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        include: {
          units: {
            where: propertyId ? { unit: { propertyId } } : undefined,
            include: { unit: { include: { property: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      prisma.resident.count({ where }),
    ]);

    return ok({
      residents,
      ...(pagination ? { pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email(), // required — the invite email is the only onboarding channel
  unitId: z.string().optional(),
  houseNumber: z.string().min(1).optional(),
  streetName: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
});

// POST /api/residents — Admin creates/onboards a resident and assigns them to a unit,
// then emails them an invite to set their mobile app password. A Property Admin's
// resident is always assigned to a unit in their own property; a Super Admin creating a
// resident with no unitId creates a standalone resident (not linked to any property).
export async function POST(req: NextRequest) {
  try {
    const { propertyId } = requirePropertyScopedAdmin(req, ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"]);
    const body = createSchema.parse(await req.json());

    if (propertyId && !body.unitId) {
      throw new ApiError("unitId is required", 422);
    }

    let unitPropertyId: string | undefined;
    if (body.unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: body.unitId } });
      if (!unit) throw new ApiError("Unit not found", 404);
      if (propertyId && unit.propertyId !== propertyId) {
        throw new ApiError("Unit does not belong to your property", 403);
      }
      unitPropertyId = unit.propertyId;
    }

    const phone = body.phone ? normalizePhone(body.phone) : undefined;

    const resident = await prisma.resident.create({
      data: {
        name: body.name,
        phone,
        email: body.email,
        houseNumber: body.houseNumber,
        streetName: body.streetName,
        city: body.city,
        country: body.country,
        address: buildAddress(body),
        lastPropertyId: unitPropertyId,
        units: body.unitId ? { create: { unitId: body.unitId, isPrimary: true } } : undefined,
      },
      include: { units: { include: { unit: { include: { property: true } } } } },
    });

    const rawToken = await createPasswordSetupToken("RESIDENT", resident.id, "INVITE");
    const link = `${process.env.BASE_URL}/set-password?token=${rawToken}&role=resident`;
    try {
      await sendEmail({ to: resident.email!, ...(await residentInviteEmail(link)) });
    } catch (emailError) {
      devLog("Failed to send resident invite email", emailError);
    }

    return ok({ resident }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
