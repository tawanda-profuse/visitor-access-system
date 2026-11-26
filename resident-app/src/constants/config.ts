import Constants from "expo-constants";
import { Platform } from "react-native";

// Explicit override always wins, in dev or production — set EXPO_PUBLIC_API_BASE_URL
// when you need to point at something other than the automatic choice below (e.g. a
// staging backend, or a physical device over USB with `adb reverse` instead of LAN).
const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

// "localhost" on a native device resolves to the device itself, not the dev machine, so
// it can never reach a backend running on the dev machine the way a browser tab can. In
// dev, fall back to the LAN IP Metro is already using to reach this device
// (`Constants.expoConfig.hostUri`, e.g. "192.168.1.23:8081") so a phone/tablet on the
// same Wi-Fi network can reach the backend with no manual config. This does NOT help
// over a USB-only connection with no shared Wi-Fi — in that case set
// EXPO_PUBLIC_API_BASE_URL explicitly, or run `npm run reverse` (adb reverse tcp:3000).
function getDevLanHost(): string | undefined {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host && host !== "localhost" && host !== "127.0.0.1" ? host : undefined;
}

function resolveApiBaseUrl(): string {
  if (explicitBaseUrl) return explicitBaseUrl;

  // Dev (Expo Go, dev client, or `expo start --web`) always targets your local backend —
  // never the deployed production URL, even if `expo.extra.apiBaseUrl` is set below.
  if (__DEV__) {
    if (Platform.OS === "web") return "http://localhost:3000";

    const lanHost = getDevLanHost();
    if (lanHost) return `http://${lanHost}:3000`;

    // No LAN host detected (e.g. a simulator, or hostUri unavailable) — localhost still
    // works for iOS/Android simulators/emulators on the same machine as the backend.
    return "http://localhost:3000";
  }

  // Production build (not __DEV__) — use the deployed backend baked in at build time via
  // `expo.extra.apiBaseUrl` in app.json.
  const prodUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  if (prodUrl) return prodUrl;

  console.warn(
    "[config] No API_BASE_URL could be resolved for this production build. Set " +
      "expo.extra.apiBaseUrl in app.json to your backend's absolute URL.",
  );
  return "";
}

export const API_BASE_URL: string = resolveApiBaseUrl();

if (__DEV__) {
  // Printed once at startup so a stale/cached bundle using the wrong URL is immediately
  // obvious in the Metro terminal, instead of only surfacing as a confusing fetch error.
  console.log(`[config] API_BASE_URL resolved to: ${API_BASE_URL}`);
}
