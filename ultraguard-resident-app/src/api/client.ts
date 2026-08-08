import { API_BASE_URL } from "@/constants/config";

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new ApiClientError(
      json?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      json?.error?.details,
    );
  }

  return json.data as T;
}

/**
 * Turns a caught error into a user-facing message. ApiClientError messages come
 * straight from the backend and are already safe to show. For anything else (network
 * failures, CORS blocks, unexpected JS errors) we always log the real error to the
 * console, and in dev builds append it to the fallback text too — "Something went
 * wrong" alone gives no hint whether it's the API base URL being unreachable, a CORS
 * block, or an actual bug, and squinting at the Metro/browser console for every screen
 * is exactly the kind of friction this is meant to remove.
 */
export function describeError(error: unknown, fallback: string): string {
  console.error(error);
  if (error instanceof ApiClientError) return error.message;
  if (__DEV__) {
    const detail = error instanceof Error ? error.message : String(error);
    return `${fallback} (dev: ${detail})`;
  }
  return fallback;
}
