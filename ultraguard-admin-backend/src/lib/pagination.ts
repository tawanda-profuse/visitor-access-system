import { NextRequest } from "next/server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Parses ?page=/&pageSize= for admin-facing list endpoints. Returns null when neither
// param is present so callers (namely the resident mobile app, which has no pagination UI
// and expects a full result set) keep their existing unpaginated behavior untouched.
export function parsePagination(req: NextRequest): { page: number; pageSize: number; skip: number; take: number } | null {
  const params = req.nextUrl.searchParams;
  if (!params.has("page") && !params.has("pageSize")) return null;

  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("pageSize")) || DEFAULT_PAGE_SIZE));

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
