import Constants from "expo-constants";
import { Platform } from "react-native";

// Explicit override always wins. Set this to your backend's absolute URL when testing
// on a physical device or any non-web target — see EXPO_PUBLIC_API_BASE_URL / eas.json
// `env` blocks, or `expo.extra.apiBaseUrl` in app.json.
const explicitBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);

// "localhost" on a native device resolves to the device itself, not the dev machine, so
// it can never reach a backend running on the dev machine the way a browser tab can. In
// dev, fall back to the LAN IP Metro is already using to reach this device
// (`Constants.expoConfig.hostUri`, e.g. "192.168.1.23:8081") so a phone/tablet on the
// same Wi-Fi network can reach the backend with no manual config. This does NOT help
// over a USB-only connection with no shared Wi-Fi — in that case set
// EXPO_PUBLIC_API_BASE_URL explicitly (or `adb reverse tcp:3000 tcp:3000`).
function getDevLanHost(): string | undefined {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host && host !== "localhost" && host !== "127.0.0.1" ? host : undefined;
}

function resolveApiBaseUrl(): string {
  if (explicitBaseUrl) return explicitBaseUrl;

  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  if (__DEV__) {
    const lanHost = getDevLanHost();
    if (lanHost) return `http://${lanHost}:3000`;
  }

  console.warn(
    "[config] No API_BASE_URL could be resolved for a native build. Set " +
      "EXPO_PUBLIC_API_BASE_URL to your backend's absolute URL (e.g. https://your-app.fly.dev).",
  );
  return "";
}

export const API_BASE_URL: string = resolveApiBaseUrl();
