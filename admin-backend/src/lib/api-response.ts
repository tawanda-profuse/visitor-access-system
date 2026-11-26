import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status },
  );
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.message, error.status, error.details);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const field = (error.meta?.target as string[] | undefined)?.join(", ") ?? "value";
      return fail(`That ${field} is already in use`, 409);
    }
    if (error.code === "P2025") {
      return fail("Record not found", 404);
    }
  }
  console.error(error);
  return fail("Internal server error", 500);
}
