import { NextRequest, NextResponse } from "next/server";

// Native apps (iOS/Android) never hit browser CORS at all — this only matters when
// testing via `expo start` web preview, or once a browser-based admin dashboard exists.
// Wide open for local dev; tighten Access-Control-Allow-Origin to the real admin
// dashboard/app origins before deploying anywhere non-local.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-gate-api-key",
};

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
