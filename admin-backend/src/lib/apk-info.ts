// The APK's "build date" is derived from the HTTP Last-Modified header of whatever
// object ANDROID_APK_URL points at — the CI workflow overwrites that object on every
// successful build+upload (see .github/workflows/build-android-apk.yml), so this always
// reflects the real timestamp of the last successful deploy, regardless of whether it's
// hosted on S3, DigitalOcean Spaces, or anything else that speaks plain HTTP.
let cached: { buildDateIso: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getApkBuildDate(): Promise<string | null> {
  const apkUrl = process.env.ANDROID_APK_URL;
  if (!apkUrl) return null;

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.buildDateIso;
  }

  try {
    const res = await fetch(apkUrl, { method: "HEAD", cache: "no-store" });
    const lastModified = res.headers.get("last-modified");
    const buildDateIso = lastModified ? new Date(lastModified).toISOString() : null;
    cached = { buildDateIso, fetchedAt: Date.now() };
    return buildDateIso;
  } catch {
    cached = { buildDateIso: null, fetchedAt: Date.now() };
    return null;
  }
}

export function formatApkBuildDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
