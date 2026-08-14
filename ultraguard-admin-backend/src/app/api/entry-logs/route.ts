import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";
import { verifyToken, getBearerToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/entry-logs
// Resident app: "Visitor History & Logs" (own entries only).
// Admin portal: "Live Gate Activity Monitor" / audit trail (all entries, filterable).
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const params = req.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") ?? 50), 200);

    const where =
      payload.subjectType === "resident"
        ? { residentId: payload.residentId }
        : {
            ...(params.get("residentId") ? { residentId: params.get("residentId")! } : {}),
            ...(params.get("gateId") ? { gateId: params.get("gateId")! } : {}),
            ...(params.get("result") ? { result: params.get("result") as never } : {}),
          };

    const entryLogs = await prisma.entryLog.findMany({
      where,
      include: { gate: true, accessCode: true, resident: true },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });

    return ok({ entryLogs });
  } catch (error) {
    return handleApiError(error);
  }
}
