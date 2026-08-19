export const RESIDENT_TOKEN_STORAGE_KEY = "ug_resident_token";

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(RESIDENT_TOKEN_STORAGE_KEY);
}

// Separate from src/lib/api-client.ts's apiFetch, which hard-codes the admin's storage
// key — a resident's token would never be attached if this reused that helper. Keeping
// distinct storage keys also lets an admin and a resident be signed in simultaneously in
// the same browser without clobbering each other's session.
export async function residentApiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string | undefined> } = {},
): Promise<T> {
  const token = getToken();
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const message = json?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(message, res.status, json?.error?.details);
  }

  return json.data as T;
}
