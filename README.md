# Ultra-Guard Visitor Access Management System — MVP

Implementation of `SRS_Visitor_Access_System.pdf`, scoped to **Phase 1 (Design & API
Protocols)** and **Phase 2 (Mobile App & Backend Development)** per the SRS's §5
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

## What's done vs. not done, per the SRS

### §3.1 Resident Mobile Application Features

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

### §3.2 Gate Intercom & Hardware Integration Interface

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

### §3.3 Security Company Management Portal (Web-Based)

| Requirement | Status |
|---|---|
| Resident directory management (API) | ✅ Built (`/api/residents`) |
| Live gate activity monitor (API) | ✅ Built (`/api/entry-logs`, `/api/admin/dashboard/summary`) |
| Audit trail & reporting (API) | ✅ Built (entry logs are queryable/filterable) |
| **Web dashboard UI** | ❌ Not built — per your instructions this MVP delivers **API endpoints only** for the admin portal, no frontend. The API is ready for a dashboard to be built against it whenever that's prioritized. |

### §4 Non-Functional & Security Requirements

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
