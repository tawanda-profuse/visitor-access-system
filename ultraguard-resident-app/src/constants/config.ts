import Constants from "expo-constants";

// Points at the ultraguard-admin-backend Next.js API. Override at build time by setting
// `expo.extra.apiBaseUrl` in app.json (or an EXPO_PUBLIC_API_BASE_URL env var).
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:3000";
