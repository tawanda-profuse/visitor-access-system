# Ultra-Guard Visitor Access Management System — MVP

Implementation of `SRS_Visitor_Access_System.pdf`, scoped to **Phase 1 (Design & API
Protocols)** and **Phase 2 (Mobile App & Backend Development)** per the SRS's 5
implementation phases. Phases 3 (physical intercom hardware integration/pilot) and 4
(app store deployment/staff training) are out of scope until real gate/intercom
hardware is selected — see "Hardware integration" below.

## Projects

| Folder | What it is |
|---|---|
| [`ultraguard-admin-backend/`](ultraguard-admin-backend/README.md) | Next.js **API-only** backend — the "Admin Dashboard & Cloud" component's data layer, Postgres via Prisma, JWT auth for both residents and admins. |
| [`ultraguard-resident-app/`](ultraguard-resident-app/README.md) | React Native (Expo, TypeScript) **Resident Mobile App** — invite visitors, share access codes, view logs, panic button, theme settings. |

Run the backend first (`ultraguard-admin-backend`), then the mobile app
(`ultraguard-resident-app`) pointed at it — see each project's README for setup.

## Running everything

From this root folder (after each project's own one-time `npm install` / `npx prisma
migrate dev` — see their READMEs):

```bash
npm install          # installs concurrently, used by start:all
npm run start:all    # runs the backend (Next.js) and the mobile app (Expo) together
```

`start:all` is just `concurrently` running `dev:backend` and `dev:mobile` side by side
with labeled, colored output — you can also run either alone (`npm run dev:backend`,
`npm run dev:mobile`).

## Testing the mobile app

1. `npm run start:all`, then open the app in Expo Go / a simulator (see the mobile
   README for connecting a physical device or emulator to the right API URL).
2. **No phone number needs to be pre-registered.** `POST /api/auth/resident/request-otp`
   auto-creates a resident record on first sign-in (`prisma.resident.upsert` in
   `ultraguard-admin-backend/src/app/api/auth/resident/request-otp/route.ts`) — enter
   any phone number on the login screen and it just works. The seeded resident
   (`+27820000000`, see the backend README) is only useful if you want a resident that
   already has a name/unit assigned; everyone else starts as "New Resident" with no
   unit until an admin assigns one via the API.
3. Since no SMS provider is connected yet, the login screen itself displays the OTP
   (labeled "No SMS Gateway Connected Yet") instead of texting it — just tap Continue.
   This only happens while the backend's `OTP_DEV_MODE=true`; flip it to `false` once a
   real provider is wired up and this UI naturally stops appearing (the API stops
   returning `devOtp`).
4. From there: invite a visitor, view the generated PIN/QR, and simulate a gate
   scan by POSTing to `/api/gate/validate` yourself (see the backend README's curl
   examples) — there's no real intercom to walk up to yet.

## Building an installable app

All scripts below run from this root folder.

| Script | What it does | Requirements |
|---|---|---|
| `npm run android:apk` | Builds an Android APK **in the cloud** via Expo's EAS Build | Free Expo account, one-time `npx eas-cli login` (the script tells you if you're not logged in) |
| `npm run android:apk:local` | Builds an Android **debug** APK entirely on this machine, installs it via `adb` if a device is connected | JDK 17+ and a full Android SDK (not just `platform-tools`) — the script checks and tells you exactly what's missing rather than failing obscurely |
| `npm run ios:build` | Builds an installable (ad-hoc) iOS app **in the cloud** via EAS Build | Free Expo account + a **paid Apple Developer Program account (US$99/yr)** — installing on a real iPhone without going through the App Store is an Apple platform requirement, not something any tooling can route around. First run is interactive (Apple ID login, device registration). |

There is no path to a local (non-cloud) iOS build on Windows — Apple only allows
building iOS apps with Xcode on macOS. `android:apk` (cloud) works today on this
machine without installing anything else, since a full local Android SDK + JDK 17
isn't currently set up here (only `platform-tools`/`adb` is present, and the system
Java is version 8). `android:apk:local` is there for whenever that changes.

## What's done vs. not done, per the SRS

### 3.1 Resident Mobile Application Features

| Requirement | Status |
|---|---|
| Access code management (One-Time / Time-Bound / Recurring) | ✅ Built |
| One-click sharing (WhatsApp/SMS/Email) | ✅ Built via native share sheet |
| Real-time notifications | ⚠️ Registration plumbing built; actual push **send** is a placeholder (no provider chosen) |
| Visitor history & logs | ✅ Built |
| Emergency / panic trigger | ✅ Built (alert is logged server-side; guard-desk notification channel is a placeholder) |
| Phone OTP authentication | ✅ Built (OTP delivery is a placeholder — logged/echoed in dev, no SMS provider chosen) |
| Fingerprint/Face ID quick login | ❌ Not built |
| Multi-property management | ⚠️ Data model supports it (`ResidentUnit`); no UI picker built |

### 3.2 Gate Intercom & Hardware Integration Interface

| Requirement | Status |
|---|---|
| Keypad/scanner input validation contract | ✅ `/api/gate/validate` — see `docs/HARDWARE_INTEGRATION_PROTOCOL.md` |
| Sub-1.5s response time | ✅ Design supports it (single DB round-trip); unverified against real hardware/network since none exists yet |
| Offline Buffer Mode | ❌ Not built — inherently device-side; documented as a future sync endpoint in the protocol doc |
| Audio/visual feedback | N/A — device-side concern once hardware exists |

**No specific intercom/gate hardware has been selected.** `ultraguard-admin-backend`
exposes a hardware-agnostic HTTP contract (`/api/gate/validate`, `/api/gate/heartbeat`,
`/api/gates` for provisioning) that any future device or bridge integrates against — see
[`ultraguard-admin-backend/docs/HARDWARE_INTEGRATION_PROTOCOL.md`](ultraguard-admin-backend/docs/HARDWARE_INTEGRATION_PROTOCOL.md).
`TO_LEARN.md` in this folder has the vendor questions to ask before Phase 3 starts.

### 3.3 Security Company Management Portal (Web-Based)

| Requirement | Status |
|---|---|
| Resident directory management (API) | ✅ Built (`/api/residents`) |
| Live gate activity monitor (API) | ✅ Built (`/api/entry-logs`, `/api/admin/dashboard/summary`) |
| Audit trail & reporting (API) | ✅ Built (entry logs are queryable/filterable) |
| **Web dashboard UI** | ❌ Not built — per your instructions this MVP delivers **API endpoints only** for the admin portal, no frontend. The API is ready for a dashboard to be built against it whenever that's prioritized. |

### 4 Non-Functional & Security Requirements

| Requirement | Status |
|---|---|
| TLS 1.3 in transit | ⚠️ Enforced by deployment (HTTPS termination), not by this codebase directly — dev server runs plain HTTP locally as normal |
| Passwords/tokens hashed (bcrypt) | ✅ Admin passwords + OTP codes + gate API keys all bcrypt-hashed |
| Failsafe defaults or gate hardware | ❌ N/A until hardware exists; documented as a guard-call-button fallback in the protocol doc |
| Configurable data retention / auto-purge | ❌ Not built — no scheduled purge job exists yet |

## Architecture decisions worth knowing about

- **Database**: Postgres (a local instance was available in this dev environment and
  the schema was migrated against it). The Prisma schema deliberately avoids native
  enums (uses `String` fields + zod validation at the API layer) so it stays portable
  to SQLite for contributors without a local Postgres — see the backend README's
  "Using SQLite instead" section.
- **Auth**: two independent JWT subject types (resident via phone+OTP, admin via
  email+password) rather than a single unified user table, matching the SRS's clear
  separation between resident and security-company actors.
- **OTP/SMS and push notifications are stubbed, not faked silently** — every stub logs
  clearly (`[OTP:PLACEHOLDER]`, `[PUSH:PLACEHOLDER]`) and dev-mode OTP responses echo
  the code back in the API response so the mobile app is fully testable end-to-end
  without a real SMS account.

## Suggested next steps

1. Answer the hardware vendor questions in `TO_LEARN.md`, then flesh out the offline-
   sync endpoints in the protocol doc once a device is chosen (Phase 3).
2. Pick an SMS/WhatsApp provider (Twilio, WhatsApp Business API) and a push provider
   (Expo push service is already half-wired; just needs the actual send call).
3. Build the admin web dashboard UI against the already-complete API.
4. Add biometric quick-login and a multi-property/unit switcher to the mobile app.
5. Commission real app icon/splash assets before any app store submission (Phase 4).
