import { ok, handleApiError } from "@/lib/api-response";
import { getApkBuildDate } from "@/lib/apk-info";

export const runtime = "nodejs";

// GET /api/public/mobile-app — no auth. Lets the resident web portal (and, in principle,
// any client) show a "Download Mobile App" affordance with the actual last-build date,
// without exposing anything beyond a public download URL that's already public on S3.
export async function GET() {
  try {
    const apkUrl = process.env.ANDROID_APK_URL || null;
    const buildDate = apkUrl ? await getApkBuildDate() : null;
    return ok({ apkUrl, buildDate });
  } catch (error) {
    return handleApiError(error);
  }
}
