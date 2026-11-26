# SecureGate Admin Backend

API backend for the SecureGate **Visitor Access Management System**.
This is the "Admin Dashboard & Cloud" component and the API surface the resident mobile
app talks to, per the SRS. **This package is API-only** — no admin dashboard UI is built
here (see the top-level project README for what's in/out of scope for this MVP).

Built with Next.js (App Router, route handlers only), Prisma, and Postgres.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The server starts on `http://localhost:3000`. Check `GET /api/health`.

Seeded accounts (see `.env.example` / `prisma/seed.ts`):

- Admin (Super Admin): `admin@securegate.example.com` / `ChangeMe123!`
- Resident: phone `+27820000000` / `ChangeMe123!`

## Email setup (Nodemailer + Brevo)

Invitations, password resets, and panic alerts are sent via Nodemailer through a Brevo
SMTP relay (free tier: 300 emails/day, no domain verification required to start):

1. Sign up for a free account at [brevo.com](https://www.brevo.com).
2. Go to **Settings -> SMTP & API -> SMTP tab** and generate a new SMTP key.
3. In `.env`, set `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_USER` to your Brevo account's
   login email, and `SMTP_PASS` to the generated key.
4. (Recommended) Verify a sender domain/address under **Senders, Domains & Dedicated
   IPs** for better deliverability, or emails may land in spam.

If `SMTP_HOST` is left empty, emails aren't sent at all — instead, the full rendered
email (recipient, subject, body) is logged to the console via `devLog()`, so local
development and testing never depend on having SMTP credentials configured. Set
`BASE_URL` to your real deployed URL in production — every link embedded in an email is
built from this single env var.

## Using SQLite instead (lightweight local dev, no Postgres install)

Change `prisma/schema.prisma`'s datasource `provider` to `"sqlite"`, set
`DATABASE_URL="file:./dev.db"` in `.env`, and re-run `npx prisma migrate dev`. No model
changes are required in either direction — nothing Postgres-specific is used (status/type
fields are plain Strings rather than native enums for exactly this portability).

## Auth model

Two independent JWT subject types, both issued from `src/lib/auth.ts`:
- **Resident** — phone or email + password (`/api/auth/resident/*`), used by the mobile
  app. No SMS/OTP involved anywhere in the system anymore.
- **Admin** — email + password (`/api/auth/admin/login`), used by the web management
  portal. Roles: `SUPER_ADMIN` (sees/manages everything), `PROPERTY_ADMIN` (scoped to
  exactly one property, set during a one-time onboarding wizard), `OPERATOR` (legacy,
  unscoped, currently only used by the seed script).

New accounts (residents and property admins alike) never get a password set directly —
they're created with `passwordHash: null` and receive an invite email with a
`{BASE_URL}/set-password?token=...&role=...` link. The same link/endpoint shape backs
"Forgot Password" on both the web portal and mobile app login screens.

Send `Authorization: Bearer <token>` on all authenticated routes.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/resident/login` | none | Resident sign-in via phone or email + password |
| POST | `/api/auth/resident/set-password` | none (token) | Complete a resident invite or reset |
| POST | `/api/auth/resident/forgot-password` | none | Request a resident password reset email |
| POST | `/api/auth/admin/login` | none | Admin portal login |
| POST | `/api/auth/admin/set-password` | none (token) | Complete an admin invite or reset |
| POST | `/api/auth/admin/forgot-password` | none | Request an admin password reset email |
| GET | `/api/auth/me` | resident or admin | Resolve current session |
| GET/POST | `/api/admins` | Super Admin | List / invite Property Admins |
| GET/PUT | `/api/admin/onboarding` | Property Admin | Resume / save the onboarding wizard draft |
| POST | `/api/admin/onboarding/complete` | Property Admin | Finalize onboarding, re-issue JWT |
| GET/POST | `/api/residents` | admin (scoped) | Resident directory management |
| GET/PATCH/DELETE | `/api/residents/:id` | admin (scoped) | View/edit/remove a resident |
| GET/POST | `/api/properties` | admin (scoped) | Managed properties/estates |
| PATCH | `/api/properties/:id` | admin (own for Property Admin) | Edit a property |
| GET/POST | `/api/properties/:id/units` | admin (scoped) | Units within a property |
| DELETE | `/api/properties/:id/residents/:residentId` | admin (scoped) | Unassign a resident from a property |
| GET/POST | `/api/gates` | admin (scoped) | Gate/intercom device inventory (see hardware doc) |
| PATCH | `/api/gates/:id` | admin (scoped) | Rename a gate |
| GET/POST | `/api/access-codes` | resident (own) / admin (scoped) | List / create visitor invites |
| GET/PATCH | `/api/access-codes/:id` | resident (own) / admin (scoped) | View / revoke an invite |
| POST | `/api/gate/validate` | gate device (`x-gate-api-key`) | **Hardware placeholder** — validate a PIN/QR at the gate |
| POST | `/api/gate/heartbeat` | gate device | **Hardware placeholder** — device liveness/offline-buffer status |
| GET | `/api/public/gates` | none | Gate/location picker for Security Guard mode |
| POST | `/api/security-guard/verify` | none (rate-limited) | Security Guard mode: verify a PIN/QR at a specific gate |
| GET | `/api/entry-logs` | resident (own) / admin (scoped) | Audit trail / visitor history |
| GET/POST | `/api/panic` | resident (post) / resident+admin (get, scoped) | Emergency panic trigger & alert feed |
| PATCH | `/api/panic/:id` | admin (scoped) | Acknowledge/resolve a panic alert |
| POST | `/api/notifications/register-device` | resident | Register Expo push token |
| GET | `/api/admin/dashboard/summary` | admin (scoped) | Headline counts for admin dashboard |
| GET | `/api/health` | none | Liveness check |

"admin (scoped)" means a `PROPERTY_ADMIN` only sees/affects data belonging to their own
property; `SUPER_ADMIN` is unscoped.

All responses are `{ success: true, data: {...} }` or
`{ success: false, error: { message, details? } }`.

## What's a placeholder here (see `docs/HARDWARE_INTEGRATION_PROTOCOL.md`)

- **Push notifications** (`src/lib/push.ts`) — logs instead of calling Expo's push
  service; token registration is fully wired, only the actual send is stubbed.
- **Gate/intercom hardware** (`/api/gate/*`, `/api/gates`) — the request/response
  contract is final and ready to integrate against, but no physical device has been
  chosen, so "Offline Buffer Mode" sync endpoints are documented but not built (that
  logic is device-side by nature — see the protocol doc). Security Guard mode
  (`/api/security-guard/verify`) is the software-only alternative to this hardware for
  locations without capable intercom equipment.

## Database schema

See `prisma/schema.prisma`. Entities: `Property`, `Unit`, `ResidentUnit` (multi-property
support), `Resident`, `Admin`, `AccessCode`, `Gate`, `EntryLog`, `PanicAlert`.
