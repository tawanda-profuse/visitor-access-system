# Ultra-Guard Resident App

React Native (Expo SDK 57, expo-router, TypeScript) mobile app for residents — the
"Resident Mobile App" component of the Visitor Access Management System. Talks to
`ultraguard-admin-backend` over HTTP.

## Setup

```bash
npm install
npm start
```

Then press `i`/`a` for iOS/Android simulator, scan the QR with Expo Go, or `w` for a
quick web preview (web isn't a target platform per the SRS, but the whole app renders
there too and it's the fastest way to sanity-check UI changes without a device).

### Pointing at the backend

By default the app calls `http://localhost:3000` (see `app.json`'s `expo.extra.apiBaseUrl`
and `src/constants/config.ts`). That works for the iOS Simulator and web. For:

- **Android emulator**: change it to `http://10.0.2.2:3000`.
- **A physical device**: change it to your computer's LAN IP, e.g. `http://192.168.1.50:3000`
  (the device and your dev machine must be on the same network).

You can also override without editing app.json via an env var:
`EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000 npm start`.

## What's implemented (Phase 2 scope)

- **Auth**: phone number + OTP sign-in (`app/login.tsx`, `app/verify.tsx`), session
  persisted in `expo-secure-store`. No phone number needs to be pre-registered — the
  backend auto-creates a resident on first OTP request. Since no SMS provider is
  connected yet, the login screen itself displays the OTP in a "No SMS Gateway
  Connected Yet" card (rather than texting it) so the app is fully testable without a
  real SMS account; this disappears automatically once the backend's `OTP_DEV_MODE` is
  turned off. (Biometric/Face ID quick-login and multi-property switching are not
  implemented — see top-level README for what's deferred.)
- **Invite Visitor** (`app/(tabs)/invite.tsx`): generate One-Time, Time-Bound, or
  Recurring passes with a visitor name/phone, date/time window, and (for recurring)
  day-of-week + daily time window.
- **Visitor Pass detail** (`app/code/[id].tsx`): shows the 6-digit PIN and a scannable
  QR code, one-tap **Share** (opens the native share sheet — WhatsApp/SMS/Email are
  whatever the user has installed, satisfying "one-click sharing" without a
  provider-specific SDK), and pass revocation.
- **Home dashboard** (`app/(tabs)/index.tsx`): active passes, recent gate activity, and
  a prominent **Emergency / Panic Trigger** button.
- **History** (`app/(tabs)/history.tsx`): full visitor pass list + entry log audit
  trail, each with status badges (Success/Expired/Denied/Invalid).
- **Settings** (`app/(tabs)/settings.tsx`): **theme picker — Light / Dark / System
  Default**, defaulting to Dark, persisted across launches (`src/theme/ThemeContext.tsx`).
- **Push notification registration** (`src/hooks/usePushRegistration.ts`): requests
  permission and registers the device's Expo push token with the backend. The
  backend's *send* side is a placeholder (see the backend README) — no provider send
  flow is wired end-to-end yet. Also note: real remote push requires an Expo
  **development build**, not Expo Go, as of SDK 53+; local dev in Expo Go will skip
  registration gracefully on simulators/if permission is denied.

## Building an installable app

See the top-level README's "Building an installable app" section for the full picture
(requirements, costs, what runs today vs. needs more setup). Scripts, runnable from
either this folder or the repo root:

- `npm run build:android:apk` (root: `npm run android:apk`) — Android APK via EAS cloud
  build. Needs a free Expo account and `npx eas-cli login` once.
- `npm run build:android:apk:local` (root: `npm run android:apk:local`) — Android debug
  APK built entirely locally via Gradle. Needs JDK 17+ and a full Android SDK; the
  script (`scripts/build-android-apk-local.js`) checks both and tells you what's
  missing rather than failing with a raw Gradle error.
- `npm run build:ios` (root: `npm run ios:build`) — installable (ad-hoc) iOS build via
  EAS cloud. Needs a free Expo account **and** a paid Apple Developer Program account;
  there is no local-build option on Windows since Apple requires Xcode on macOS.

Build profiles live in `eas.json` (`preview` outputs an installable `.apk`/ad-hoc
`.ipa`; `development` is for Expo dev-client builds).

## Design system

Brand palette (red `#E2231C` + black) in `src/theme/colors.ts`. Dark theme (black
background) is the default; users can switch to Light or System Default from Settings.
All screens pull colors from `useAppTheme()` rather than hardcoding — add new screens
the same way to stay consistent.

## Known placeholders / not yet implemented

- App icon / splash / adaptive-icon assets are still Expo's defaults (`assets/icon.png`
  etc.) — the real Ultra-Guard mark (`assets/ultraguard-logo.png`) is used inline on the
  login screen, but a proper square icon crop should be commissioned before any app
  store submission.
- Biometric/Face ID quick login and multi-property/unit switching UI (SRS §3.1) are not
  built — the backend data model already supports multiple units per resident
  (`ResidentUnit`), but there's no picker in the app yet.
- No offline handling beyond what `fetch` gives you for free — see the top-level README
  for full MVP scope notes.
