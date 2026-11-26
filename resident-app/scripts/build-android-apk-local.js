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

// --- Windows only: stage a short-path mirror of the project ------------------
// The native C++ codegen build (react-native-svg, safe-area-context, screens, etc.)
// mirrors each source file's full path into nested .cxx/CMakeFiles object-file
// directories. With this repo's path depth, that mirrored path exceeds Windows'
// 260-character MAX_PATH, and ninja fails with "Filename longer than 260 characters".
// A drive-substitution/junction trick doesn't fix this: Gradle's Java-based codegen
// tasks canonicalize such paths back to the real long path (while other tools in the
// same build don't), producing a "this and base files have different roots" failure
// instead. The only reliable fix is a genuinely short real path — so on Windows, mirror
// the whole project to one via robocopy (incremental after the first run) and build
// there, then copy the resulting APK back to this repo's builds/ folder.
// Finds node_modules/<pkg-or-@scope/pkg>/android/{build,.cxx} and .../ios/build —
// per-package native build output that Gradle/CMake regenerate from scratch on every
// build anyway. Mirroring them wastes disk (they can run into gigabytes across
// packages) and risks copying artifacts that embed the old long path.
function findStaleBuildArtifactDirs(nodeModulesDir) {
  const found = [];
  if (!fs.existsSync(nodeModulesDir)) return found;
  const packageDirs = [];
  for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("@")) {
      const scopeDir = path.join(nodeModulesDir, entry.name);
      for (const scoped of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (scoped.isDirectory()) packageDirs.push(path.join(scopeDir, scoped.name));
      }
    } else {
      packageDirs.push(path.join(nodeModulesDir, entry.name));
    }
  }
  for (const pkgDir of packageDirs) {
    for (const rel of [["android", "build"], ["android", ".cxx"], ["ios", "build"]]) {
      const candidate = path.join(pkgDir, ...rel);
      if (fs.existsSync(candidate)) found.push(candidate);
    }
  }
  return found;
}

let buildRoot = projectRoot;
if (isWindows) {
  const stagingRoot = "C:\\uga-android-build";
  console.log(`Windows: mirroring project to ${stagingRoot} to avoid a MAX_PATH failure in the native build...`);
  fs.mkdirSync(stagingRoot, { recursive: true });
  // Full paths, not bare names — /XD matches by name anywhere in the tree, and several
  // node_modules packages have their own (needed) "android"/"ios" subfolders.
  const staleBuildDirs = findStaleBuildArtifactDirs(path.join(projectRoot, "node_modules"));
  const roboArgs = [
    projectRoot,
    stagingRoot,
    "/MIR",
    "/XD",
    path.join(projectRoot, "android"),
    path.join(projectRoot, "ios"),
    path.join(projectRoot, ".expo"),
    path.join(projectRoot, "builds"),
    ...staleBuildDirs,
    "/NFL",
    "/NDL",
    "/NJH",
    "/R:1",
    "/W:1",
  ];
  const roboResult = spawnSync("robocopy", roboArgs, { stdio: "inherit", shell: true });
  // Robocopy's exit code is a bitmask where 0-7 mean success (files copied/matched/etc.);
  // only >=8 is a real failure. It is not a normal 0-means-success exit code.
  if ((roboResult.status ?? 0) >= 8) {
    fail(`robocopy failed while staging the project to ${stagingRoot} (exit code ${roboResult.status}).`);
  }
  buildRoot = stagingRoot;
}

console.log(`Using Android SDK at ${sdkRoot}`);
console.log("Generating native android/ project (expo prebuild)...");
run("npx", ["expo", "prebuild", "--platform", "android"], { cwd: buildRoot });

console.log("Building debug APK (gradlew assembleDebug)...");
const androidDir = path.join(buildRoot, "android");
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
const destPath = path.join(outDir, "resident-debug.apk");
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
