# Security Architecture

Threat model, token lifecycle, and defense plan for the OpenClaw Web Client signaling infrastructure.

**Last updated**: 2026-02-12
**Status**: Phase 0 (P0) implemented; Phase 1-3 planned

---

## Architecture Overview

```
┌─────────────┐        ┌──────────────────────────────────┐        ┌───────────────┐
│  Browser PWA │──WS──▶ │  CF Worker                        │ ◀──WS──│ Sidecar Proxy │
│  (untrusted) │        │  ├─ /create-room     (public)     │        │ (semi-trusted)│
│              │        │  ├─ /resolve          (public)     │        │               │
│              │        │  ├─ /reconnect        (public)     │        │               │
│              │        │  ├─ /register-device  (public)     │        │               │
│              │        │  ├─ /room-status      (public)     │        │               │
│              │        │  ├─ /ws               (token auth) │        │               │
│              │        │  └─ /turn-creds       (ROOM_SECRET)│        │               │
│              │        │                                    │        │               │
│              │        │  Durable Object: SignalingRoom     │        │               │
│              │        │  R2 Bucket: pairing/user/device    │        │               │
│              │        └──────────────────────────────────┘        │               │
│              │                                                     │               │
│              │ ══ WebRTC DataChannel (DTLS encrypted, P2P) ══════ │               │
│              │                                                     │  ── ws ──▶    │
└─────────────┘                                                     └──────┬────────┘
                                                                           │
                                                                  ws://127.0.0.1:18789
                                                                           │
                                                                  ┌────────▼────────┐
                                                                  │ OpenClaw Gateway │
                                                                  └─────────────────┘
```

### Trust Boundaries

1. **Browser ↔ CF Worker** — untrusted client, public internet
2. **CF Worker ↔ Sidecar** — semi-trusted, runs on user's machine
3. **Browser ↔ Sidecar** — P2P DataChannel, DTLS-encrypted. CF has **no visibility** after signaling completes
4. **Sidecar ↔ Gateway** — localhost plaintext WS, fully trusted

### Key Constraint

Once a WebRTC DataChannel is established, CF infrastructure is **completely out of the data path**. All enforcement must happen during the signaling phase or via sidecar cooperation.

---

## Threat Model

### Signaling Layer

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| S1 | **Unauthenticated WebSocket** — `/ws` accepts anyone with a roomId | Critical | P0: `?token=deviceToken` validation at Worker level |
| S2 | **Room enumeration** via `/room-status` | Medium | Move to auth-required endpoints |
| S3 | **SDP injection** — attacker joins room before legitimate peer | High | P0: Peer limit (max 2/room) + token auth |
| S4 | **Unbounded peers per room** — DoS via mass WS connections | Medium | P0: Max 2 WebSockets per DO |
| S5 | **CORS wildcard** — any website can interact with signaling API | Medium | P0: Configurable `ALLOWED_ORIGINS` |

### Token Layer

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| P1 | **Pairing code brute force** (30^8 keyspace, no rate limit) | High | P1: CF WAF rate limiting on `/resolve` |
| P2 | **Tokens never expire** — stolen token = permanent access | Critical | P1: `expiresAt` on all token types |
| P3 | **deviceToken in localStorage** (XSS-accessible) | High | P3: CSP headers, consider HttpOnly cookie |
| P4 | **device.json in plaintext** (no file permissions) | High | P1: `chmod 0600` |
| P5 | **register-device is fully public** — unlimited account creation | High | P1: Require valid pairingCode |

### Transport Layer

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| T1 | **Bridge is transparent proxy** — no auth at DataChannel level | Critical | P2: Session auth before bridge connects to gateway |
| T2 | **TURN credential abuse** (ROOM_SECRET defaults to open) | Medium | P1: Make ROOM_SECRET required in production |
| T3 | **Multiple DataChannels to same sidecar** | Medium | P2: Track active bridge, reject duplicates |

### Infrastructure Layer

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| I1 | **Unlimited room creation** — R2 storage DoS | High | P1: CF WAF rate limiting on `/create-room` |
| I2 | **No R2 garbage collection** — orphaned records accumulate | Medium | P2: Cron cleanup worker |
| I3 | **Error messages leak stack traces** | Low | P0: Generic error response |

---

## Token Lifecycle

### Token Hierarchy

```
userToken ─── 365d TTL ─── multi-device user identity
  └─ deviceToken ─── 90d TTL ─── single device identity
       └─ sessionToken ─── 4h TTL ─── single signaling session (future)
            └─ pairingCode ─── 30min ─── one-time room discovery
```

### TTL Enforcement Strategy

| Token | TTL | Enforcement | Mandatory? |
|-------|-----|-------------|:----------:|
| `pairingCode` | 30 min | Already enforced in `/resolve` | Yes |
| `sessionToken` | 4 hours | Worker validates on `/ws` upgrade | Yes (future, P1) |
| `deviceToken` | 90 days (configurable) | Checked on `/reconnect` | Configurable: `TOKEN_TTL=0` disables |
| `userToken` | 365 days | Checked on `/reconnect` | Configurable |
| TURN credentials | 24 hours | Cloudflare API enforces | Yes |

### Self-Hosted vs Hosted Mode

Token TTL is controlled by the `ADMIN_TOKEN` environment variable:

- **`ADMIN_TOKEN` not set** (self-hosted default): Open mode. `/ws` auth is skipped. Token TTL can be set via `TOKEN_TTL` env var or defaults to no expiry. Suitable for single-user homelab deployments.
- **`ADMIN_TOKEN` set** (hosted/production): Full security enforced. `/ws` requires valid token. Token TTL defaults to 90d/365d. Admin revocation API enabled.

### Revocation

Since DataChannel is P2P, revocation operates at multiple layers:

| Layer | Mechanism | Latency |
|-------|-----------|---------|
| **Prevent future connections** | Delete `device:{token}` from R2 | Immediate on next reconnect |
| **Kill active signaling** | DO broadcasts `{ type: 'revoked' }` → close all WS | Immediate (wakes hibernating DO) |
| **Kill active DataChannel** | Sidecar's hibernating WS receives `revoked` event → closes DC | Immediate (sidecar always has WS open) |
| **Fallback** | sessionToken expires naturally | Max 4 hours |

---

## Defense Plan — Priority Roadmap

### P0 — Immediate (implemented)

| Item | Location | Description |
|------|----------|-------------|
| `/ws` token auth | `index.ts` | Require `?token=deviceToken`, validate via R2 lookup |
| Peer limit | `signaling-room.ts` | Max 2 WebSockets per DO instance |
| CORS restriction | `index.ts` | Configurable `ALLOWED_ORIGINS`, defaults to `*` in dev |
| Error sanitization | `index.ts` | Generic 500 response, real error to `console.error` |

### P1 — This Sprint

| Item | Location | Description |
|------|----------|-------------|
| Token TTL fields | `types.ts`, `register-device.ts`, `reconnect.ts` | Add `expiresAt` to `UserData`, `DeviceData` |
| `sessionToken` endpoint | New `routes/create-session.ts` | Short-lived token for `/ws` auth |
| Rate limiting | CF WAF dashboard | 1 free rule covering `/create-room`, `/resolve`, `/register-device` |
| `register-device` auth | `register-device.ts` | Require valid, unexpired `pairingCode` |
| Sidecar health endpoint | `sidecar-proxy/src/health.ts` | `GET http://localhost:19780/health` — status + pairing code |
| File permissions | `sidecar-proxy/src/config.ts` | `chmod 0600` on `device.json` |

### P2 — Next Sprint

| Item | Location | Description |
|------|----------|-------------|
| Token rotation | New `routes/refresh-token.ts` | Issue new token, grace period for old |
| R2 blacklist | `storage.ts` | `revoked:{tokenHash}` keys, checked on reconnect/join |
| Bridge method allowlist | `sidecar-proxy/src/bridge.ts` | Only forward known JSON-RPC methods |
| R2 cleanup cron | `index.ts` scheduled handler | Delete expired pairings, stale rooms, revoked tokens |
| Connection deduplication | `sidecar-proxy/src/index.ts` | Track active DataChannel, reject duplicates |

### P3 — Backlog

| Item | Location | Description |
|------|----------|-------------|
| Admin revocation API | New `routes/admin/` | `POST /admin/revoke-device`, `POST /admin/revoke-user` |
| DO revocation broadcast | `signaling-room.ts` | Push `{ type: 'revoked' }` via hibernating WS |
| Sidecar heartbeat | `sidecar-proxy/src/index.ts` | Optional 60min `POST /heartbeat` (configurable, off by default) |
| LAN-direct signaling | New sidecar HTTP signaling server | Eliminate CF dependency for internal networks |

---

## Cost Impact

All P0-P2 security features add **$0 incremental cost** at any scale. The only cost-bearing feature is the optional heartbeat:

| Feature | 1K sidecars | 10K sidecars | 100K sidecars |
|---------|-------------|--------------|---------------|
| Token TTL + Refresh | $0 | $0 | $0 |
| WS Auth (R2 lookup) | $0 | $0 | $0 |
| R2 Blacklist | $0 | $0 | $0 |
| WAF Rate Limiting | $0 | $0 | $0 |
| Heartbeat (60min) | $0 | $0 | $41/mo |
| Heartbeat (5min) | $0 | $50/mo | **$564/mo** |

Baseline (no security) at 100K sidecars: ~$220/mo. Dominant cost is DO alarm requests (4,320/sidecar/month for standby WS connections).

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `ROOM_SECRET` | No | _(open)_ | Static Bearer token for `/turn-creds` |
| `ADMIN_TOKEN` | No | _(open mode)_ | Enables full security: WS auth, token TTL, admin API |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins |
| `TOKEN_TTL_DAYS` | No | `90` (if `ADMIN_TOKEN` set) / `0` (otherwise) | Device token TTL in days. `0` = never expires |

Design goal: **< 5 environment variables** for the security surface.

---

## References

- `docs/PAIRING_FLOWS.md` — 3 connection modes with sequence diagrams
- `docs/IMPLEMENTATION_PLAN.md` — Full architecture and code specs
- `packages/shared-types/src/webrtc-signaling.ts` — WS message type definitions
- `packages/cf-worker-signaling/src/signaling-room.ts` — Durable Object implementation
