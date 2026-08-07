import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/residents — Admin Portal: Resident Directory Management (list/search).
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const search = req.nextUrl.searchParams.get("search") ?? undefined;

    const residents = await prisma.resident.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      include: { units: { include: { unit: { include: { property: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    return ok({ residents });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  unitId: z.string().optional(),
});

// POST /api/residents — Admin creates/onboards a resident and assigns them to a unit.
export async function POST(req: NextRequest) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());

    const resident = await prisma.resident.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
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
