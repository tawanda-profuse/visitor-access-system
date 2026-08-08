# Gate / Intercom Hardware Integration Protocol (Placeholder Spec)

**Status: draft, unimplemented against real hardware.** The SRS (2, 3.2) requires the
system to accept visitor PIN/QR input at a gate intercom and trigger a physical relay, but
no specific intercom brand, model, or firmware has been selected yet (Phase 1 deliverable:
"hardware integration protocol definition"). This document defines the contract so that
whichever device is chosen later (Hikvision/Dahua/Akuvox/2N, or a custom ESP32/Raspberry Pi
bridge) can be integrated by implementing an HTTP client against the endpoints below —
no backend changes should be required.

## Actors

- **Gate device / bridge** — the physical keypad+relay unit, or an intermediary
  "gateway" microcontroller/PC sitting between the intercom and the internet if the
  intercom itself can't speak HTTPS directly.
- **Backend** — this Next.js API.

## Provisioning

1. An admin creates a Gate via `POST /api/gates` (admin JWT required), specifying the
   property it belongs to. The response includes a **one-time-shown** `apiKey` — store
   it securely on the device/bridge; the backend only ever stores its bcrypt hash.
2. The device authenticates every request below with header:
   `x-gate-api-key: <apiKey>`

## Endpoints the device/bridge must call

### `POST /api/gate/validate`

Called every time a visitor enters a PIN or a QR code is scanned.

```json
// Request
{ "gateId": "clx...", "input": "483920", "method": "PIN" }
```

```json
// Response (200 always — check `result`/`gateAction`, not HTTP status)
{
  "success": true,
  "data": {
    "result": "SUCCESS", // SUCCESS | EXPIRED | DENIED | INVALID
    "gateAction": "OPEN", // OPEN | DENY — what the relay should do
    "message": "Access granted"
  }
}
```

Target latency per SRS 3.2: **under 1.5 seconds** end-to-end under normal network
conditions. The device should have its own timeout (recommend 2–3s) and fall back to
`DENY` + a "try again / call guard" message on timeout, never fail open.

### `POST /api/gate/heartbeat`

Recommended every 30–60s so the admin portal's live connectivity monitor is accurate.

```json
{ "gateId": "clx...", "bufferedCodesCount": 0 }
```

## Offline Buffer Mode (SRS 3.2 — hardware-dependent, not yet implemented)

The SRS requires gate hardware to cache valid codes locally during an internet outage.
This is inherently a **device-side** feature since the backend is unreachable during the
outage by definition. The contract this backend exposes to support it:

- A future `GET /api/gate/:id/code-cache` endpoint (not yet built) would let a device
  periodically pull down a signed snapshot of currently-valid codes for its property, to
  cache locally.
- When back online, the device should replay any offline validations it performed via a
  batched call (e.g. `POST /api/gate/offline-sync`, not yet built) so entry logs stay
  complete, marking them with a `wasOfflineValidation: true` flag.
- Until a device with confirmed local-storage capability is chosen, the documented
  failsafe per SRS 4 is a **fallback guard call button** — no code changes needed for
  that path since it doesn't touch this API.

## Audio/Visual feedback (SRS 3.2)

Device-local concern: on `gateAction: "OPEN"` show green/beep, on `"DENY"` show
red/audio message using `message` from the response. No backend work required.

## Open questions for the hardware vendor (tracked, not yet answered)

See `TO_LEARN.md` in the repo root for the full list of questions to ask the security
company's hardware team (brand/model, transport protocol, relay mechanism, network
connectivity, bench test unit availability). This protocol document should be revisited
once those answers come back — the shape of `/api/gate/validate` is intentionally
transport-agnostic (plain JSON over HTTPS) so it should require little to no change, but
the offline-sync endpoints above are speculative until a device is confirmed.
