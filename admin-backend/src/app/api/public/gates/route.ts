import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/public/gates — no auth. Powers the Security Guard mode gate/location
// picker in the mobile app. Deliberately excludes apiKeyHash/status/lastSeenAt —
// a guard only needs enough to identify where they're standing.
export async function GET() {
  try {
    const gates = await prisma.gate.findMany({
      include: { property: true },
      orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
    });

    return ok({
      gates: gates.map((gate) => ({
        id: gate.id,
        name: gate.name,
        propertyId: gate.propertyId,
        propertyName: gate.property.name,
        propertyAddress: gate.property.address,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
