import { NextRequest } from "next/server";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

type NominatimResult = { lat: string; lon: string; display_name: string };

// GET /api/geocode?query=... — Admin Portal: forward-geocodes a resident's address for the
// home-location map. Proxies OpenStreetMap's free Nominatim service so the browser never
// calls a third party directly — Nominatim requires a real, identifying User-Agent
// (see https://operations.osmfoundation.org/policies/nominatim/), which only a server can
// reliably set.
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const query = req.nextUrl.searchParams.get("query")?.trim();
    if (!query) throw new ApiError("Missing query", 400);

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: { "User-Agent": "UltraGuard-Admin-Portal/1.0 (contact: xrthemc@gmail.com)" },
    });
    if (!res.ok) throw new ApiError("Geocoding service unavailable", 502);

    const results = (await res.json()) as NominatimResult[];
    if (results.length === 0) throw new ApiError("No location found for that address", 404);

    const [{ lat, lon, display_name }] = results;
    return ok({ latitude: Number(lat), longitude: Number(lon), displayName: display_name });
  } catch (error) {
    return handleApiError(error);
  }
}
