#!/usr/bin/env node
// `concurrently` (used previously here) pipes each child process's stdout through
// itself to prefix/color it, which makes Expo's CLI see a non-TTY stdout/stdin and
// silently drop its interactive dev-tools UI (QR code, the a/w/r/etc. keyboard
// shortcuts menu) — Metro still runs fine, you just lose that screen. Giving each
// process its own real terminal window fixes it, since each one gets a genuine TTY.
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const rootDir = path.resolve(__dirname, "..");

if (os.platform() === "win32") {
  console.log("Opening two terminal windows: Ultra-Guard Backend, Ultra-Guard Mobile...");
  spawn('start "Ultra-Guard Backend" cmd /k "npm run dev:backend"', {
    cwd: rootDir,
    shell: true,
    detached: true,
    stdio: "ignore",
  }).unref();
  spawn('start "Ultra-Guard Mobile" cmd /k "npm run dev:mobile"', {
    cwd: rootDir,
    shell: true,
    detached: true,
    stdio: "ignore",
  }).unref();
} else {
  // Non-Windows dev machines don't hit the same "npm run" + separate-console-window
  // convention, so fall back to the single-terminal concurrently view there. You lose
  // Expo's interactive UI the same way described above; run `npm run dev:mobile`
  // yourself in its own terminal if you need it.
  const child = spawn(
    "npx",
    ["concurrently", "-n", "backend,mobile", "-c", "blue,magenta", "npm:dev:backend", "npm:dev:mobile"],
    { cwd: rootDir, stdio: "inherit", shell: true },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}
