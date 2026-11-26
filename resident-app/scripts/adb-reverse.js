#!/usr/bin/env node

/**
 * Forwards the ports Expo Go needs over USB (adb reverse) so a physical
 * device can reach Metro (8081) and the local Next.js API (3000) via
 * "localhost", regardless of which WiFi/hotspot network is active.
 * Re-run this after reconnecting USB or rebooting, since adb reverse
 * tunnels don't persist across those events.
 */

const { execFileSync } = require("child_process");
const fs = require("fs");

const PORTS = [8081, 3000];

const CANDIDATE_ADB_PATHS = [
  "adb",
  `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`,
  `${process.env.ANDROID_HOME}\\platform-tools\\adb.exe`,
  `${process.env.ANDROID_SDK_ROOT}\\platform-tools\\adb.exe`,
  `${process.env.USERPROFILE}\\android-dev-tools\\android-sdk\\platform-tools\\adb.exe`,
];

function resolveAdbPath() {
  for (const candidate of CANDIDATE_ADB_PATHS) {
    if (!candidate) continue;
    if (candidate === "adb") {
      try {
        execFileSync(candidate, ["version"], { stdio: "ignore" });
        return candidate;
      } catch {
        continue;
      }
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const adb = resolveAdbPath();

if (!adb) {
  console.error(
    "Could not find adb. Set ANDROID_HOME or add platform-tools to your PATH.",
  );
  process.exit(1);
}

try {
  const devices = execFileSync(adb, ["devices"], { encoding: "utf8" });
  const connected = devices
    .split("\n")
    .slice(1)
    .some((line) => line.trim().endsWith("device"));

  if (!connected) {
    console.error("No device found. Connect your phone via USB debugging first.");
    process.exit(1);
  }

  for (const port of PORTS) {
    execFileSync(adb, ["reverse", `tcp:${port}`, `tcp:${port}`], {
      stdio: "inherit",
    });
    console.log(`adb reverse tcp:${port} tcp:${port} OK`);
  }
  console.log(
    "\nIf the app still can't reach the backend, uncomment EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 " +
      "in .env (it's commented out by default so scanning the Expo Go QR code over Wi-Fi auto-detects your " +
      "LAN IP instead) — then restart `expo start`. Re-comment it out when you go back to Wi-Fi/QR.",
  );
} catch (error) {
  console.error("Failed to set up adb reverse:", error.message);
  process.exit(1);
}
