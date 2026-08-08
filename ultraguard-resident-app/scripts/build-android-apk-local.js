#!/usr/bin/env node
// Builds a debug APK entirely on this machine (no Expo/EAS account, no network build
// queue) via `expo prebuild` + the generated Gradle wrapper. This needs real local
// Android tooling — a JDK (17+) and a full Android SDK (not just platform-tools) with
// at least one build-tools + platforms package installed and licenses accepted. Run
// `npm run android:apk` instead if you just want a working APK today without
// installing all of that.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const projectRoot = path.resolve(__dirname, "..");
const isWindows = os.platform() === "win32";

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// --- Preflight: JDK 17+ -----------------------------------------------------
// Resolve java via JAVA_HOME first rather than assuming it's on PATH — we deliberately
// don't mutate PATH when setting up a portable JDK (setx has a documented history of
// silently truncating long, pre-existing PATH values, which is a much worse outcome
// than requiring JAVA_HOME to be set).
const javaHome = process.env.JAVA_HOME;
const javaBin = javaHome
  ? path.join(javaHome, "bin", isWindows ? "java.exe" : "java")
  : "java";
const javaCommand = javaHome && fs.existsSync(javaBin) ? javaBin : "java";

const javaVersionCheck = spawnSync(javaCommand, ["-version"], { encoding: "utf8", shell: true });
const javaOutput = `${javaVersionCheck.stdout ?? ""}${javaVersionCheck.stderr ?? ""}`;
const versionMatch = javaOutput.match(/version "(\d+)(?:\.(\d+))?/);
const javaMajor = versionMatch
  ? versionMatch[1] === "1"
    ? Number(versionMatch[2]) // old "1.8.x" style versioning = Java 8
    : Number(versionMatch[1])
  : null;

const restartHint =
  "\nIf a JDK 17+ was already set up on this machine (e.g. under\n" +
  "%USERPROFILE%\\android-dev-tools\\jdk-17 with JAVA_HOME pointed at it), this terminal\n" +
  "was likely opened before that env var was set — close it and open a new one.";

if (javaVersionCheck.status !== 0 || !javaMajor) {
  fail(
    "Couldn't detect a Java installation (`java -version` failed).\n" +
      "Install a JDK 17 (e.g. https://adoptium.net/temurin/releases/?version=17), set\n" +
      "JAVA_HOME to it, and re-run this script." +
      restartHint,
  );
} else if (javaMajor < 17) {
  fail(
    `Found Java ${javaMajor}, but building this Android project needs JDK 17 or newer.\n` +
      "Install one (e.g. https://adoptium.net/temurin/releases/?version=17), point\n" +
      "JAVA_HOME at it, and re-run this script. (Multiple JDKs can coexist — you only\n" +
      "need JAVA_HOME to resolve to 17+ for this build.)" +
      restartHint,
  );
}

// --- Preflight: Android SDK --------------------------------------------------
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const hasBuildTools = sdkRoot && fs.existsSync(path.join(sdkRoot, "build-tools"));
const hasPlatforms = sdkRoot && fs.existsSync(path.join(sdkRoot, "platforms"));

if (!sdkRoot || !hasBuildTools || !hasPlatforms) {
  fail(
    "No full Android SDK detected (ANDROID_HOME/ANDROID_SDK_ROOT is unset, or only has\n" +
      "platform-tools rather than a complete SDK with build-tools/ and platforms/).\n\n" +
      "Easiest fix: install Android Studio (https://developer.android.com/studio), open\n" +
      "it once so it downloads the SDK, then set ANDROID_HOME to the SDK path it shows\n" +
      "you (Settings > Languages & Frameworks > Android SDK), e.g.:\n\n" +
      '  setx ANDROID_HOME "C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk"\n\n' +
      "Or, without Android Studio, install the command-line tools + at least one\n" +
      "build-tools/platforms package via `sdkmanager`, then accept licenses with\n" +
      "`sdkmanager --licenses`." +
      restartHint +
      "\n\nUntil then, use `npm run android:apk` (cloud build via EAS) instead — it needs\n" +
      "none of this local setup.",
  );
}

console.log(`Using Android SDK at ${sdkRoot}`);
console.log("Generating native android/ project (expo prebuild)...");
run("npx", ["expo", "prebuild", "--platform", "android"], { cwd: projectRoot });

console.log("Building debug APK (gradlew assembleDebug)...");
const androidDir = path.join(projectRoot, "android");
// Use the absolute path rather than a bare "gradlew.bat"/"./gradlew" — with shell:true,
// cmd.exe on Windows doesn't reliably resolve a bare relative filename against `cwd`.
// It's quoted because with shell:true, Node just joins command+args with spaces before
// handing the string to cmd.exe, and this repo's path contains spaces ("Source Code").
const gradlew = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
run(isWindows ? `"${gradlew}"` : gradlew, ["assembleDebug"], { cwd: androidDir });

const apkPath = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
if (!fs.existsSync(apkPath)) {
  fail(`Build finished but the expected APK wasn't found at:\n  ${apkPath}`);
}

const outDir = path.join(projectRoot, "builds");
fs.mkdirSync(outDir, { recursive: true });
const destPath = path.join(outDir, "ultraguard-resident-debug.apk");
fs.copyFileSync(apkPath, destPath);

console.log(`\nAPK ready: ${destPath}`);

// --- Optional: install straight to a connected device/emulator via adb -----
const adbCandidates = [
  process.env.ANDROID_ADB_PATH,
  sdkRoot && path.join(sdkRoot, "platform-tools", isWindows ? "adb.exe" : "adb"),
  isWindows ? "C:\\platform-tools-latest-windows\\platform-tools\\adb.exe" : null,
].filter(Boolean);

const adbPath = adbCandidates.find((candidate) => fs.existsSync(candidate));
if (adbPath) {
  const devices = spawnSync(adbPath, ["devices"], { encoding: "utf8", shell: true });
  const connected = (devices.stdout ?? "")
    .split("\n")
    .slice(1)
    .some((line) => line.trim().endsWith("device"));

  if (connected) {
    console.log("Connected device detected — installing APK via adb...");
    run(adbPath, ["install", "-r", destPath]);
  } else {
    console.log(
      "No device/emulator detected. Connect one (or start an emulator) and run:\n" +
        `  "${adbPath}" install -r "${destPath}"`,
    );
  }
} else {
  console.log("adb not found — install the APK manually via Android Studio or `adb install`.");
}
