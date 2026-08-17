const DEV = process.env.DEV_LOGS === "true" || process.env.NODE_ENV !== "production";

/** Diagnostic logging for local running/testing — silenced in production unless DEV_LOGS=true. */
export function devLog(...args: unknown[]) {
  if (DEV) console.log("[DEV]", ...args);
}
