import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { buildAddress } from "@/lib/address";
import { normalizePhone } from "@/lib/phone";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

export const runtime = "nodejs";

// GET /api/residents — Admin Portal: Resident Directory Management (list/search).
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const search = req.nextUrl.searchParams.get("search") ?? undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const pagination = parsePagination(req);
    const [residents, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        include: { units: { include: { unit: { include: { property: true } } } } },
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
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  unitId: z.string().optional(),
  houseNumber: z.string().min(1).optional(),
  streetName: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
});

// POST /api/residents — Admin creates/onboards a resident and assigns them to a unit.
export async function POST(req: NextRequest) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());
    const phone = normalizePhone(body.phone);

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
        units: body.unitId
          ? { create: { unitId: body.unitId, isPrimary: true } }
          : undefined,
      },
      include: { units: { include: { unit: { include: { property: true } } } } },
    });

    return ok({ resident }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
