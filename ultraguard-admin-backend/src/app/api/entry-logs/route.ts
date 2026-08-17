import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";
import { verifyToken, getBearerToken, requirePropertyScopedAdmin } from "@/lib/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

export const runtime = "nodejs";

// GET /api/entry-logs
// Resident app: "Visitor History & Logs" (own entries only).
// Admin portal: "Live Gate Activity Monitor" / audit trail (all entries, filterable) —
// Property Admins only see entries at gates belonging to their own property.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const params = req.nextUrl.searchParams;

    let where: Record<string, unknown>;
    if (payload.subjectType === "resident") {
      where = { residentId: payload.residentId };
    } else {
      const { propertyId } = requirePropertyScopedAdmin(req);
      where = {
        ...(params.get("residentId") ? { residentId: params.get("residentId")! } : {}),
        ...(params.get("gateId") ? { gateId: params.get("gateId")! } : {}),
        ...(params.get("result") ? { result: params.get("result") as never } : {}),
        ...(propertyId ? { gate: { propertyId } } : {}),
      };
    }

    // Pagination only applies to the admin portal's audit trail — the resident app has no
    // pagination UI and keeps its existing `limit`-only behavior (own entries, capped at 200).
    if (payload.subjectType === "resident") {
      const limit = Math.min(Number(params.get("limit") ?? 50), 200);
      const entryLogs = await prisma.entryLog.findMany({
        where,
        include: { gate: true, accessCode: true, resident: true },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });
      return ok({ entryLogs });
    }

    const pagination = parsePagination(req) ?? { page: 1, pageSize: 20, skip: 0, take: 20 };
    const [entryLogs, total] = await Promise.all([
      prisma.entryLog.findMany({
        where,
        include: { gate: true, accessCode: true, resident: true },
        orderBy: { occurredAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.entryLog.count({ where }),
    ]);

    return ok({ entryLogs, pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total) });
  } catch (error) {
    return handleApiError(error);
  }
}
