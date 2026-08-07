import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/properties — Admin Portal: list managed properties.
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const properties = await prisma.property.findMany({
      include: { units: true, gates: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ properties });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
});

// POST /api/properties — Admin Portal: onboard a new managed property/estate.
export async function POST(req: NextRequest) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());
    const property = await prisma.property.create({ data: body });
    return ok({ property }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
