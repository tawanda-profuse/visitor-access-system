#!/usr/bin/env node
// Thin wrapper around `eas build` that checks login state first and prints a clear,
// actionable message instead of a confusing CLI error when the one-time setup steps
// (free Expo account + `eas login`) haven't been done yet.
const { spawnSync } = require("child_process");

const platform = process.argv[2]; // "android" | "ios"
if (platform !== "android" && platform !== "ios") {
  console.error('Usage: node scripts/eas-build.js <android|ios>');
  process.exit(1);
}

function run(command, args) {
  return spawnSync(command, args, { stdio: "inherit", shell: true });
}

console.log(`Checking Expo/EAS login status...`);
const whoami = spawnSync("npx", ["eas-cli", "whoami"], { encoding: "utf8", shell: true });
const loggedIn = whoami.status === 0 && !/Not logged in/i.test(whoami.stdout ?? "");

if (!loggedIn) {
  console.log(`
You're not logged in to Expo/EAS yet. This is a one-time step:

  1. Create a free account at https://expo.dev/signup (if you don't have one)
  2. Run:  npx eas-cli login
  3. Re-run this script.
`);
  if (platform === "ios") {
    console.log(
      `Note: an installable iOS build additionally requires a paid Apple Developer\n` +
        `Program account (USD 99/year). EAS will walk you through linking it and\n` +
        `registering your iPhone the first time you run an iOS build.\n`,
    );
  }
  process.exit(1);
}

console.log(`Logged in. Starting ${platform} build via EAS (cloud)...`);

const args = ["eas-cli", "build", "--platform", platform, "--profile", "preview"];
// iOS credentials (Apple ID / Developer Program login, device registration) are
// interactive on first run, so don't force --non-interactive there.
if (platform === "android") args.push("--non-interactive");

const result = run("npx", args);
process.exit(result.status ?? 1);
