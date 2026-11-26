# SecureGate Visitor Access Management System — MVP

Implementation of `SRS_Visitor_Access_System.pdf`, scoped to **Phase 1 (Design & API
Protocols)** and **Phase 2 (Mobile App & Backend Development)** per the SRS's 5
implementation phases. Phases 3 (physical intercom hardware integration/pilot) and 4
(app store deployment/staff training) are out of scope until real gate/intercom
hardware is selected — see "Hardware integration" below.

## Projects

| Folder | What it is |
|---|---|
| [`admin-backend/`](admin-backend/README.md) | Next.js **API-only** backend — the "Admin Dashboard & Cloud" component's data layer, Postgres via Prisma, JWT auth for both residents and admins. |
| [`resident-app/`](resident-app/README.md) | React Native (Expo, TypeScript) **Resident Mobile App** — invite visitors, share access codes, view logs, panic button, theme settings. |

Run the backend first (`admin-backend`), then the mobile app
(`resident-app`) pointed at it — see each project's README for setup.

## Documentation

Deeper guides live under [`admin-backend/docs/`](admin-backend/docs/):

| Doc | What it covers |
|---|---|
| [Deployment Guide — AWS](admin-backend/docs/DEPLOYMENT_GUIDE_AWS.md) | From-scratch production deploy on AWS: ECR + ECS Fargate, GitHub Actions CI/CD, and S3-hosted APK distribution. |
| [Deployment Guide — DigitalOcean](admin-backend/docs/DEPLOYMENT_GUIDE_DIGITALOCEAN.md) | The same, on DigitalOcean (App Platform / Droplet + Spaces). |
| [Hardware Integration Protocol](admin-backend/docs/HARDWARE_INTEGRATION_PROTOCOL.md) | The hardware-agnostic HTTP contract any gate/intercom device integrates against (`/api/gate/validate`, `/api/gate/heartbeat`, provisioning). Draft until real hardware is chosen. |
| [Research notes](admin-backend/docs/RESEARCH.md) | The hardware/operations questions to resolve with a vendor before Phase 3 (intercom models, relays, networking, offline behaviour). |

Each deployment guide is self-contained and written for standing up a brand-new environment.

## Running everything

From this root folder (after each project's own one-time `npm install` / `npx prisma
migrate dev` — see their READMEs):

```bash
npm install          # installs dependencies used by start:all
npm run start:all    # runs the backend (Next.js) and the mobile app (Expo) together
```

On Windows, `start:all` opens **two separate terminal windows** ("SecureGate Backend"
and "SecureGate Mobile") rather than interleaving output in one. This is deliberate:
Expo's interactive CLI (the QR code, the `a`/`w`/`r`/etc. keyboard shortcuts menu) needs
a real terminal to do keypress capture and screen redraws. Running it through an
output-multiplexer like `concurrently` — which pipes the child's stdout through itself
to prefix/color it — makes Expo see a non-interactive terminal and it silently drops
that UI (Metro still runs fine, you just don't get the QR code). Two independent
windows sidesteps that entirely. You can also run either half alone (`npm run
dev:backend`, `npm run dev:mobile`), or `cd` into `resident-app` and run
`npm start` directly if you prefer.

## Testing the mobile app

1. `npm run start:all`, then open the app in Expo Go / a simulator (see the mobile
   README for connecting a physical device or emulator to the right API URL).
2. Sign in with the seeded resident: phone `+27820000000` / password `ChangeMe123!`
   (see the backend README / `.env.example` for `SEED_RESIDENT_PASSWORD`). A resident
   created by an admin (via the portal) receives an invite email with a link to set
   their own password before they can log in — with no SMTP configured locally, that
   email is logged to the console instead of sent (see "Email setup" in the backend
   README), so you can copy the link straight out of the terminal.
3. From there: invite a visitor, view the generated PIN/QR, and simulate a gate
   scan by POSTing to `/api/gate/validate` yourself (see the backend README's curl
   examples), or use **Security Guard mode** from the mobile app's login screen to
   scan/enter the code without any account — there's no real intercom to walk up to
   yet, so both are stand-ins for it.

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
| Emergency / panic trigger | ✅ Built, with an optional message — immediately emails the resident's Property Admin (or Super Admin if standalone) |
| Phone/email + password authentication | ✅ Built — SMS/OTP has been removed entirely; login accepts either identifier |
| Fingerprint/Face ID quick login | ❌ Not built |
| Multi-property management | ⚠️ Data model supports it (`ResidentUnit`); no UI picker built |
| Security Guard mode (no-account gate verification) | ✅ Built — scan QR or enter PIN against a chosen gate, no login required |

### 3.2 Gate Intercom & Hardware Integration Interface

| Requirement | Status |
|---|---|
| Keypad/scanner input validation contract | ✅ `/api/gate/validate` — see `docs/HARDWARE_INTEGRATION_PROTOCOL.md` |
| Sub-1.5s response time | ✅ Design supports it (single DB round-trip); unverified against real hardware/network since none exists yet |
| Offline Buffer Mode | ❌ Not built — inherently device-side; documented as a future sync endpoint in the protocol doc |
| Audio/visual feedback | N/A — device-side concern once hardware exists |

**No specific intercom/gate hardware has been selected.** `admin-backend`
exposes a hardware-agnostic HTTP contract (`/api/gate/validate`, `/api/gate/heartbeat`,
`/api/gates` for provisioning) that any future device or bridge integrates against — see
[`admin-backend/docs/HARDWARE_INTEGRATION_PROTOCOL.md`](admin-backend/docs/HARDWARE_INTEGRATION_PROTOCOL.md).
`TO_LEARN.md` in this folder has the vendor questions to ask before Phase 3 starts.

### 3.3 Security Company Management Portal (Web-Based)

| Requirement | Status |
|---|---|
| Resident directory management | ✅ Built (`/api/residents` + portal UI) |
| Live gate activity monitor | ✅ Built (`/api/entry-logs`, `/api/admin/dashboard/summary` + portal UI, live via SSE) |
| Audit trail & reporting | ✅ Built (entry logs are queryable/filterable) |
| Web dashboard UI | ✅ Built (`admin-backend/src/app/(portal)/**`) |
| Property Admin role (scoped to one property, invited by Super Admin, one-time onboarding wizard) | ✅ Built |
| Super Admin vs. Property Admin data scoping across all portal pages | ✅ Built |
| Admin/resident "Forgot Password" | ✅ Built, both via emailed reset links |

### 4 Non-Functional & Security Requirements

| Requirement | Status |
|---|---|
| TLS 1.3 in transit | ⚠️ Enforced by deployment (HTTPS termination), not by this codebase directly — dev server runs plain HTTP locally as normal |
| Passwords/tokens hashed (bcrypt) | ✅ Admin + resident passwords and gate API keys all bcrypt-hashed; invite/reset tokens are SHA-256-hashed at rest |
| Failsafe defaults or gate hardware | ❌ N/A until hardware exists; documented as a guard-call-button fallback in the protocol doc |
| Configurable data retention / auto-purge | ❌ Not built — no scheduled purge job exists yet |

## Architecture decisions worth knowing about

- **Database**: Postgres (a local instance was available in this dev environment and
  the schema was migrated against it). The Prisma schema deliberately avoids native
  enums (uses `String` fields + zod validation at the API layer) so it stays portable
  to SQLite for contributors without a local Postgres — see the backend README's
  "Using SQLite instead" section.
- **Auth**: two independent JWT subject types (resident via phone-or-email + password,
  admin via email+password) rather than a single unified user table, matching the SRS's
  clear separation between resident and security-company actors. SMS/OTP has been
  removed entirely — see `admin-backend/README.md`'s "Auth model" section.
- **Push notifications are stubbed, not faked silently** — the stub logs clearly
  (`[PUSH:PLACEHOLDER]`) so the gap is obvious rather than silently no-op'd.
- **Email is real, not stubbed** — Nodemailer via a Brevo SMTP relay (free tier) sends
  invites, password resets, and panic alerts. With no SMTP credentials configured
  locally, emails are logged to the console instead of sent, so everything is testable
  end-to-end without a real email account — see the backend README's "Email setup".

## Suggested next steps

1. Answer the hardware vendor questions in `TO_LEARN.md`, then flesh out the offline-
   sync endpoints in the protocol doc once a device is chosen (Phase 3).
2. Wire up a real push provider (Expo push service is already half-wired; just needs
   the actual send call).
3. Add biometric quick-login and a multi-property/unit switcher to the mobile app.
4. Commission real app icon/splash assets before any app store submission (Phase 4).
5. Verify a sender domain in Brevo for production email deliverability (see the backend
   README's "Email setup").
