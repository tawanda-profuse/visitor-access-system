# Ultra-Guard Admin Backend

API backend for the Ultra-Guard Security & Fire **Visitor Access Management System**.
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

- Admin: `admin@ultraguard.co.za` / `ChangeMe123!`
- Resident: phone `+27820000000` (request an OTP to log in; with `OTP_DEV_MODE=true`
  the OTP is echoed back in the API response since no SMS provider is contracted yet)

## Using SQLite instead (lightweight local dev, no Postgres install)

Change `prisma/schema.prisma`'s datasource `provider` to `"sqlite"`, set
`DATABASE_URL="file:./dev.db"` in `.env`, and re-run `npx prisma migrate dev`. No model
changes are required in either direction — nothing Postgres-specific is used (status/type
fields are plain Strings rather than native enums for exactly this portability).

## Auth model

Two independent JWT subject types, both issued from `src/lib/auth.ts`:
- **Resident** — phone number + OTP (`/api/auth/resident/*`), used by the mobile app.
- **Admin** — email + password (`/api/auth/admin/login`), used by the (future) web
  management portal. Roles: `SUPER_ADMIN`, `OPERATOR`, `GUARD`.

Send `Authorization: Bearer <token>` on all authenticated routes.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/resident/request-otp` | none | Send login OTP to a resident's phone |
| POST | `/api/auth/resident/verify-otp` | none | Verify OTP, issue resident JWT |
| POST | `/api/auth/admin/login` | none | Admin portal login |
| GET | `/api/auth/me` | resident or admin | Resolve current session |
| GET/POST | `/api/residents` | admin | Resident directory management |
| GET/PATCH/DELETE | `/api/residents/:id` | admin | View/edit/remove a resident |
| GET/POST | `/api/properties` | admin | Managed properties/estates |
| GET/POST | `/api/properties/:id/units` | admin | Units within a property |
| GET/POST | `/api/gates` | admin | Gate/intercom device inventory (see hardware doc) |
| GET/POST | `/api/access-codes` | resident (own) / admin (all) | List / create visitor invites |
| GET/PATCH | `/api/access-codes/:id` | resident (own) / admin | View / revoke an invite |
| POST | `/api/gate/validate` | gate device (`x-gate-api-key`) | **Hardware placeholder** — validate a PIN/QR at the gate |
| POST | `/api/gate/heartbeat` | gate device | **Hardware placeholder** — device liveness/offline-buffer status |
| GET | `/api/entry-logs` | resident (own) / admin (all) | Audit trail / visitor history |
| GET/POST | `/api/panic` | resident (post) / resident+admin (get) | Emergency panic trigger & alert feed |
| PATCH | `/api/panic/:id` | admin | Acknowledge/resolve a panic alert |
| POST | `/api/notifications/register-device` | resident | Register Expo push token |
| GET | `/api/admin/dashboard/summary` | admin | Headline counts for admin dashboard |
| GET | `/api/health` | none | Liveness check |

All responses are `{ success: true, data: {...} }` or
`{ success: false, error: { message, details? } }`.

## What's a placeholder here (see `docs/HARDWARE_INTEGRATION_PROTOCOL.md`)

- **SMS/WhatsApp OTP delivery** (`src/lib/otp.ts`) — logs instead of sending; no
  provider (Twilio, WhatsApp Business API) has been selected.
- **Push notifications** (`src/lib/push.ts`) — logs instead of calling Expo's push
  service; token registration is fully wired, only the actual send is stubbed.
- **Gate/intercom hardware** (`/api/gate/*`, `/api/gates`) — the request/response
  contract is final and ready to integrate against, but no physical device has been
  chosen, so "Offline Buffer Mode" sync endpoints are documented but not built (that
  logic is device-side by nature — see the protocol doc).

## Database schema

See `prisma/schema.prisma`. Entities: `Property`, `Unit`, `ResidentUnit` (multi-property
support), `Resident`, `Admin`, `AccessCode`, `Gate`, `EntryLog`, `PanicAlert`.
