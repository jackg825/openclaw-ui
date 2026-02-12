# OpenClaw Pairing & Connection Flows

**Version**: 0.1.0
**Date**: 2026-02-12

---

## Overview

OpenClaw uses three connection modes to pair a browser PWA with a sidecar proxy. All signaling goes through a **Cloudflare Durable Object** (`SignalingRoom`) using **WebSocket Hibernation API** for instant push and zero idle cost.

| Mode | Name | Trigger | User Action |
|------|------|---------|-------------|
| **C** | Sidecar URL Sign-in | Sidecar starts with no `--room-id`, no device.json | Enter pairing code in browser |
| **B** | Browser Pair Code | Sidecar starts with `--room-id XXXX-XXXX` | Enter pairing code in CLI |
| **A** | Quick Reconnect | Sidecar starts with existing device.json | None (fully automatic) |

**Lifecycle**: First use → Mode B or C → `device.json` written → all subsequent starts → Mode A → if token expired → auto-fallback to Mode C.

### Key Concepts

- **Pairing Code**: Human-readable `XXXX-XXXX` format (alphabet: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, excludes I/L/O/0/1). Expires after 30 minutes.
- **`roomId`**: Temporary UUID created per pairing session. Used only during initial connection.
- **`stableRoomId`**: Permanent UUID created at device registration. Reused across all future reconnections.
- **`deviceToken`**: Stored in `~/.openclaw-sidecar/device.json` on sidecar, identifies this machine permanently.
- **`userToken`**: Stored in browser `localStorage`, identifies the user account across devices.
- **Device Registration**: Happens over DataChannel (not HTTP) after WebRTC is established. Sidecar saves the token locally and acks.

### Signaling Architecture

```
Browser / Sidecar  ──WS──→  CF Worker (/ws?room=X)  ──→  DO SignalingRoom (per roomId)
                                                            │
                                                            ├─ ctx.acceptWebSocket() — hibernation-aware
                                                            ├─ serializeAttachment() — peer metadata on WS
                                                            ├─ setWebSocketAutoResponse('ping','pong')
                                                            └─ alarm(10min) — cleanup when all peers leave
```

R2 is used only for **pairing data** (create-room, resolve, register-device, reconnect), not for signaling.

---

## Mode C: Sidecar URL Sign-in

**Scenario**: User starts the sidecar on a server, then opens the browser PWA and enters the displayed pairing code.

**Entry condition**: `--room-id` not provided AND `~/.openclaw-sidecar/device.json` does not exist.

### Sequence

```
User Terminal               Sidecar                  CF Worker              R2                  DO (SignalingRoom)          Browser PWA
     │                         │                         │                   │                        │                        │
     │  openclaw-sidecar       │                         │                   │                        │                        │
     │  (no --room-id)         │                         │                   │                        │                        │
     │────────────────────→    │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │               loadDeviceConfig()                  │                   │                        │                        │
     │               → null (file not found)             │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 1: Create pairing session ──               │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    POST /create-room ─────────────→                   │                        │                        │
     │                         │                         │  generateCode()   │                        │                        │
     │                         │                         │  → "A3K7-MN2P"    │                        │                        │
     │                         │                         │  roomId = uuid()  │                        │                        │
     │                         │                         │── put pairing ───→│                        │                        │
     │                         │                         │── put room ──────→│                        │                        │
     │                         │  ← { roomId,            │                   │                        │                        │
     │                         │    pairingCode }        │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │  ┌──────────────────────────────────────────┐     │                   │                        │                        │
     │  │  Pairing code:  A3K7-MN2P                │     │                   │                        │                        │
     │  │  Open the OpenClaw PWA and enter this     │     │                   │                        │                        │
     │  │  code to connect.                         │     │                   │                        │                        │
     │  └──────────────────────────────────────────┘     │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │               needsRegistrationListener = true    │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 2: Sidecar joins signaling room ──         │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    WS upgrade /ws?room={roomId} ──────────────────────────────→                │                        │
     │                         │                         │                   │     acceptWebSocket()   │                        │
     │                         │  ← WS connected         │                   │     setAlarm(10min)     │                        │
     │                         │                         │                   │                        │                        │
     │                    WS { type:'join',              │                   │                        │                        │
     │                         role:'sidecar',           │                   │                        │                        │
     │                         peerId } ─────────────────────────────────────────→                    │                        │
     │                         │                         │                   │     serializeAttachment │                        │
     │                         │                         │                   │     (no other peers)    │                        │
     │                         │                         │                   │                        │                        │
     │                    [sidecar] Waiting for browser connection...        │                        │                        │
     │                         │                         │                   │     ── hibernates ──    │                        │
     │                         │                         │                   │     (zero cost idle,    │                        │
     │                         │                         │                   │      auto ping/pong)    │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 3: User opens browser, enters code ──      │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │   User opens PWA        │
     │                         │                         │                   │                        │   enters "A3K7-MN2P"    │
     │                         │                         │                   │                        │                        │
     │                         │             GET /resolve?code=A3K7-MN2P  ←─────────────────────────────────────────────────── │
     │                         │                         │── get pairing ───→│                        │                        │
     │                         │                         │  ← { roomId }     │                        │                        │
     │                         │                         │── → { roomId } ──────────────────────────────────────────────────── →│
     │                         │                         │                   │                        │                        │
     │                         │          POST /register-device { roomId } ←────────────────────────────────────────────────── │
     │                         │                         │── put user ──────→│                        │                        │
     │                         │                         │── put device ────→│                        │                        │
     │                         │                         │── put room ──────→│  (stableRoomId)        │                        │
     │                         │                         │── → { userToken,  │                        │                        │
     │                         │                         │      deviceToken, │                        │                        │
     │                         │                         │      stableRoomId } ────────────────────────────────────────────── →│
     │                         │                         │                   │                        │   localStorage.set()   │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 4: Browser joins signaling room ──         │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │          WS upgrade /ws?room={roomId} ←────────────────────────────────────────────────────── │
     │                         │                         │                   │     acceptWebSocket()   │                        │
     │                         │                         │                   │                        │  ← WS connected        │
     │                         │                         │                   │                        │                        │
     │                         │          WS { type:'join', role:'client' } ←───────────────────────────────────────────────── │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │     ── WAKE ──          │                        │
     │                         │                         │                   │     from hibernation    │                        │
     │                         │                         │                   │                        │                        │
     │                    ← { type:'peer-joined',        │                   │     broadcast to       │                        │
     │                         role:'client' }           │                   │     sidecar             │                        │
     │                         │                         │                   │                        │                        │
     │                         │                    { type:'peer-joined', role:'sidecar' } ──────────────────────────────────→ │
     │                         │                         │                   │     (existing peer      │                        │
     │                         │                         │                   │      sent to joiner)    │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 5: WebRTC negotiation ──                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │         WS { type:'offer', sdp } ←─────────────────────────────────────────────────────────  │
     │                         │                         │                   │     relay + add peerId  │                        │
     │                    ← { type:'offer', sdp,         │                   │                        │                        │
     │                         peerId }                  │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    pc.setRemoteDescription(offer)  │                   │                        │                        │
     │                    answer = pc.localDescription()  │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    WS { type:'answer', sdp } ─────────────────────────────→                    │                        │
     │                         │                         │                   │     relay + add peerId  │                        │
     │                         │                    { type:'answer', sdp, peerId } ──────────────────────────────────────────→ │
     │                         │                         │                   │                        │                        │
     │                    ─── ICE candidate exchange (bidirectional, via DO relay) ───                │                        │
     │                         │                         │                   │                        │                        │
     │                    ═══════════ DataChannel opens ══════════════════   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    bridge.attach(dc)               │                   │                        │                        │
     │                    → ws://127.0.0.1:18789          │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ── Step 6: Device registration (over DataChannel) ──                        │                        │
     │                         │                         │                   │                        │                        │
     │                    ← DC { type:'device-registration',                 │                        │                        │
     │                           deviceToken,            │                   │                        │                        │
     │                           stableRoomId }          │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │               saveDeviceConfig()                  │                   │                        │                        │
     │               ~/.openclaw-sidecar/device.json     │                   │                        │                        │
     │               { deviceToken, stableRoomId,        │                   │                        │                        │
     │                 signalingUrl, registeredAt }       │                   │                        │                        │
     │                         │                         │                   │                        │                        │
     │                    DC { type:'device-registration-ack' } ─────────────────────────────────────────────────────────────→ │
     │                         │                         │                   │                        │                        │
     │                    ═══════════ Normal operation ═══════════════════   │                        │                        │
     │                    Browser ←── DC (64 KiB chunks) ──→ Sidecar ←── WS ──→ Gateway              │                        │
```

### Code Path (sidecar `index.ts`)

1. `loadDeviceConfig()` → `null` (line 50)
2. Skip Mode A block (line 52 condition false)
3. Skip Mode B block (line 65 condition false — no roomId)
4. Enter Mode C block (line 74 — `!config.roomId`)
5. `createRoom()` → `{ roomId, pairingCode }` (line 77)
6. `needsRegistrationListener = true` (line 79)
7. Print pairing code to terminal (lines 81-88)
8. `new WsSidecarSignaling(...)` → `signaling.join()` (lines 94-95)
9. `signaling.onMessage()` handles offer/ICE (lines 165-184)
10. `pc.onDataChannel()` → `bridge.attach(dc)` + registration listener (lines 131-161)

---

## Mode B: Browser Pair Code

**Scenario**: User opens the browser PWA first, generates a pairing code, then starts the sidecar with that code.

**Entry condition**: `--room-id` matches `XXXX-XXXX` format (regex: `/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i`).

### Sequence

```
Browser PWA                  CF Worker              R2                  DO (SignalingRoom)          Sidecar
     │                            │                   │                        │                        │
     │  User clicks "New Pair"    │                   │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 1: Browser creates pairing session ── │                        │                        │
     │                            │                   │                        │                        │
  POST /create-room ─────────────→                   │                        │                        │
     │                            │  generateCode()   │                        │                        │
     │                            │  → "B5X2-QW8R"    │                        │                        │
     │                            │── put pairing ───→│                        │                        │
     │                            │── put room ──────→│                        │                        │
     │  ← { roomId,              │                   │                        │                        │
     │    pairingCode }           │                   │                        │                        │
     │                            │                   │                        │                        │
     │  Display: "B5X2-QW8R"     │                   │                        │                        │
     │  "Enter this code on       │                   │                        │                        │
     │   your sidecar CLI"        │                   │                        │                        │
     │                            │                   │                        │                        │
  POST /register-device ─────────→                   │                        │                        │
     │  { roomId }                │── put user ──────→│                        │                        │
     │                            │── put device ────→│                        │                        │
     │                            │── put room ──────→│  (stableRoomId)        │                        │
     │  ← { userToken,           │                   │                        │                        │
     │    deviceToken,            │                   │                        │                        │
     │    stableRoomId }          │                   │                        │                        │
     │  localStorage.set()        │                   │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 2: Browser joins signaling room ──    │                        │                        │
     │                            │                   │                        │                        │
  WS upgrade /ws?room={roomId} ──────────────────────────────→                │                        │
     │                            │                   │     acceptWebSocket()  │                        │
     │  ← WS connected           │                   │                        │                        │
  WS { type:'join',              │                   │                        │                        │
       role:'client' } ──────────────────────────────────────→                │                        │
     │                            │                   │     serializeAttachment│                        │
     │                            │                   │     (no other peers)   │                        │
     │                            │                   │     ── hibernates ──   │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 3: User starts sidecar with pairing code ──  │                │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │  openclaw-sidecar       │
     │                            │                   │                        │  --room-id B5X2-QW8R   │
     │                            │                   │                        │                        │
     │                            │                   │                        │  SHORT_CODE_RE match    │
     │                            │                   │                        │                        │
     │                         GET /resolve?code=B5X2-QW8R ←────────────────────────────────────────── │
     │                            │── get pairing ───→│                        │                        │
     │                            │  ← { roomId }     │                        │                        │
     │                            │── → { roomId } ──────────────────────────────────────────────────→ │
     │                            │                   │                        │                        │
     │                            │                   │                        │  needsRegistration=true│
     │                            │                   │                        │                        │
     │                         WS upgrade /ws?room={roomId} ←───────────────────────────────────────── │
     │                            │                   │     acceptWebSocket()  │                        │
     │                            │                   │                        │  ← WS connected        │
     │                            │                   │                        │                        │
     │                         WS { type:'join', role:'sidecar' } ←──────────────────────────────────  │
     │                            │                   │                        │                        │
     │                            │                   │     ── WAKE ──         │                        │
     │                            │                   │     from hibernation   │                        │
     │                            │                   │                        │                        │
     │  ← { type:'peer-joined',  │                   │     broadcast to       │                        │
     │       role:'sidecar' }     │                   │     browser            │                        │
     │                            │                   │                        │                        │
     │                            │              { type:'peer-joined', role:'client' } ──────────────→ │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 4: WebRTC negotiation (same as Mode C) ──    │                │                        │
     │                            │                   │                        │                        │
  WS { type:'offer', sdp } ─────────────────────────────────→│                │                        │
     │                            │                   │     relay + peerId     │                        │
     │                            │              ← { type:'offer', sdp, peerId } ────────────────────→ │
     │                            │                   │                        │                        │
     │                            │              WS { type:'answer', sdp } ←─────────────────────────  │
     │                            │                   │     relay + peerId     │                        │
     │  ← { type:'answer',       │                   │                        │                        │
     │       sdp, peerId }        │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ─── ICE exchange (bidirectional) ─────────────────────────────────────────────────────────────  │
     │                            │                   │                        │                        │
     │  ═══════════ DataChannel opens ═══════════════════════════════════════  │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │  bridge.attach(dc)     │
     │                            │                   │                        │  → Gateway WS          │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 5: Device registration (same as Mode C) ──   │                │                        │
     │                            │                   │                        │                        │
  DC { type:'device-registration',│                   │                        │                        │
       deviceToken,               │                   │                        │                        │
       stableRoomId } ──────────────────────────────────────────────────────────────────────────────→ │
     │                            │                   │                        │                        │
     │                            │                   │                        │  saveDeviceConfig()    │
     │                            │                   │                        │  device.json written   │
     │                            │                   │                        │                        │
     │  ← DC { type:'device-registration-ack' } ───────────────────────────────────────────────────── │
     │                            │                   │                        │                        │
     │  ═══════════ Normal operation ════════════════════════════════════════  │                        │
```

### Code Path (sidecar `index.ts`)

1. `loadDeviceConfig()` → `null` (line 50) — or exists but `--room-id` is explicitly set
2. Skip Mode A block (line 52 — `config.roomId` is set)
3. Enter Mode B block (line 65 — `SHORT_CODE_RE.test("B5X2-QW8R")` → true)
4. `resolveShortCode()` → real roomId (line 68)
5. `needsRegistrationListener = true` (line 71)
6. Skip Mode C block (line 74 — roomId now set)
7. Continue to signaling + WebRTC setup (lines 94+)

### Differences from Mode C

| Aspect | Mode C (Sidecar first) | Mode B (Browser first) |
|--------|----------------------|----------------------|
| Who calls `/create-room` | Sidecar | Browser |
| Pairing code displayed on | Terminal | PWA UI |
| Who hibernates in DO first | Sidecar | Browser |
| Who calls `/resolve` | Browser | Sidecar |
| Sidecar start command | `openclaw-sidecar` | `openclaw-sidecar --room-id B5X2-QW8R` |

---

## Mode A: Quick Reconnect

**Scenario**: Device was previously paired. User restarts sidecar (or it auto-starts on boot), then opens browser later. No pairing code needed.

**Entry condition**: `~/.openclaw-sidecar/device.json` exists with valid `deviceToken`, AND `--room-id` is not specified.

### Persisted State

```
~/.openclaw-sidecar/device.json (sidecar):
{
  "deviceToken": "d-abc-123",
  "stableRoomId": "stable-xyz-789",
  "signalingUrl": "https://signal.openclaw.dev",
  "registeredAt": "2026-02-01T10:00:00Z"
}

Browser localStorage:
  userToken: "u-def-456"
  stableRoomId: "stable-xyz-789"
```

### Sequence

```
Sidecar                      CF Worker              R2                  DO (SignalingRoom)          Browser PWA
     │                            │                   │                        │                        │
     │  loadDeviceConfig()        │                   │                        │                        │
     │  → { deviceToken:          │                   │                        │                        │
     │      "d-abc-123",          │                   │                        │                        │
     │      stableRoomId:         │                   │                        │                        │
     │      "stable-xyz" }        │                   │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 1: Sidecar reconnects with device token ──   │                │                        │
     │                            │                   │                        │                        │
  POST /reconnect ───────────────→                   │                        │                        │
     │  { deviceToken:            │                   │                        │                        │
     │    "d-abc-123" }           │── get device ────→│                        │                        │
     │                            │  ← { stableRoomId,│                        │                        │
     │                            │      userToken }   │                        │                        │
     │                            │                   │                        │                        │
     │                            │── get room ──────→│  (ensure exists)       │                        │
     │                            │                   │                        │                        │
     │                            │── get user ──────→│                        │                        │
     │                            │  update lastSeen   │                        │                        │
     │                            │── put user ──────→│                        │                        │
     │                            │                   │                        │                        │
     │  ← { stableRoomId:        │                   │                        │                        │
     │      "stable-xyz-789" }    │                   │                        │                        │
     │                            │                   │                        │                        │
     │  config.roomId = stableRoomId                  │                        │                        │
     │  needsRegistrationListener = false             │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 2: Sidecar joins stable room ──       │                        │                        │
     │                            │                   │                        │                        │
  WS upgrade /ws?room=stable-xyz ────────────────────────────→                │                        │
     │                            │                   │     NEW DO instance    │                        │
     │                            │                   │     (keyed by          │                        │
     │                            │                   │      stableRoomId)     │                        │
     │  ← WS connected           │                   │     acceptWebSocket()  │                        │
     │                            │                   │                        │                        │
  WS { type:'join',              │                   │                        │                        │
       role:'sidecar' } ────────────────────────────────────→                │                        │
     │                            │                   │     serializeAttachment│                        │
     │                            │                   │     (no other peers)   │                        │
     │                            │                   │                        │                        │
     │  [sidecar] Waiting...      │                   │     ── hibernates ──   │                        │
     │                            │                   │     (zero cost)        │                        │
     │                            │                   │     auto ping/pong     │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ══════ Hours / Days pass ══════════════════   │                        │                        │
     │  (DO hibernating,          │                   │                        │                        │
     │   WS kept alive by         │                   │                        │                        │
     │   auto ping/pong)          │                   │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 3: User opens browser ──              │                        │                        │
     │                            │                   │                        │                        │
     │                            │                   │                        │   User opens PWA       │
     │                            │                   │                        │   (has stored tokens)  │
     │                            │                   │                        │                        │
     │                         POST /reconnect { userToken: "u-def-456" } ←────────────────────────── │
     │                            │── get user ──────→│                        │                        │
     │                            │  ← { stableRoomId,│                        │                        │
     │                            │      devices }     │                        │                        │
     │                            │── → { stableRoomId, devices } ────────────────────────────────── →│
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 4: Browser joins stable room ──       │                        │                        │
     │                            │                   │                        │                        │
     │                         WS upgrade /ws?room=stable-xyz ←──────────────────────────────────────  │
     │                            │                   │     SAME DO instance   │                        │
     │                            │                   │     acceptWebSocket()  │                        │
     │                            │                   │                        │  ← WS connected        │
     │                            │                   │                        │                        │
     │                         WS { type:'join', role:'client' } ←───────────────────────────────────  │
     │                            │                   │                        │                        │
     │                            │                   │     ── WAKE ──         │                        │
     │                            │                   │     from hibernation   │                        │
     │                            │                   │                        │                        │
     │  ← { type:'peer-joined',  │                   │     broadcast to       │                        │
     │       role:'client' }      │                   │     sidecar            │                        │
     │                            │                   │                        │                        │
     │                            │              { type:'peer-joined', role:'sidecar' } ─────────── →  │
     │                            │                   │                        │                        │
     │                            │                   │                        │                        │
     │  ── Step 5: WebRTC negotiation (same as Mode C/B) ── │                 │                        │
     │                            │                   │                        │                        │
     │  ─── Offer / Answer / ICE exchange via DO relay ────  │                │                        │
     │                            │                   │                        │                        │
     │  ═══════════ DataChannel opens ═══════════════════════════════════════  │                        │
     │                            │                   │                        │                        │
     │  bridge.attach(dc) → Gateway                   │                        │                        │
     │                            │                   │                        │                        │
     │  (NO device-registration!)  │                   │                        │                        │
     │  needsRegistrationListener = false              │                        │                        │
     │                            │                   │                        │                        │
     │  ═══════════ Normal operation ════════════════════════════════════════  │                        │
```

### Code Path (sidecar `index.ts`)

1. `loadDeviceConfig()` → `{ deviceToken: "d-abc-123", ... }` (line 50)
2. Enter Mode A block (line 52 — device exists, no `--room-id`)
3. `reconnectWithToken()` → `stableRoomId` (line 56)
4. `config.roomId = stableRoomId` (line 57)
5. Skip Mode B block (line 65 — stableRoomId is UUID, not short code)
6. Skip Mode C block (line 74 — roomId is set)
7. `needsRegistrationListener = false` (line 48, never set to true)
8. Continue to signaling + WebRTC setup (lines 94+)
9. `pc.onDataChannel()` → `bridge.attach(dc)` only, **no registration listener** (line 136 condition false)

### Failure Recovery

If the device token is invalid or expired (R2 record deleted), `/reconnect` returns 404:

```
Sidecar                      CF Worker              R2
     │                            │                   │
  POST /reconnect ───────────────→                   │
     │  { deviceToken:            │── get device ────→│
     │    "d-abc-123" }           │  ← null           │
     │                            │                   │
     │  ← 404 Device not found    │                   │
     │                            │                   │
     │  catch → console.warn()    │                   │
     │  "Falling back to new      │                   │
     │   pairing session..."      │                   │
     │                            │                   │
     │  (config.roomId still "")  │                   │
     │  → Falls through to        │                   │
     │    Mode C automatically    │                   │
```

Relevant code (`index.ts:52-62`):
```typescript
if (existingDevice && existingDevice.deviceToken && !config.roomId) {
  try {
    const stableRoomId = await reconnectWithToken(...);
    config.roomId = stableRoomId;
  } catch (err) {
    console.warn(`[sidecar] Reconnect failed: ${err.message}`);
    // Fall through to Mode C
  }
}
```

---

## Comparison

| Aspect | Mode C: Sidecar Sign-in | Mode B: Browser Pair Code | Mode A: Quick Reconnect |
|--------|------------------------|--------------------------|------------------------|
| **Who starts first** | Sidecar | Browser | Sidecar |
| **User action required** | Enter code in PWA | Enter code in CLI | None |
| **HTTP calls (sidecar)** | 1 `create-room` | 1 `resolve` | 1 `reconnect` |
| **HTTP calls (browser)** | 1 `resolve` + 1 `register-device` | 1 `create-room` + 1 `register-device` | 1 `reconnect` |
| **R2 writes** | pairing + room + user + device | Same | 0 (read + update lastSeen) |
| **Room ID used** | Temporary UUID | Temporary UUID | Stable UUID |
| **Device registration** | Over DataChannel | Over DataChannel | Skipped |
| **DO hibernation** | Sidecar waits | Browser waits | Sidecar waits |
| **Failure fallback** | — | — | Auto → Mode C |

### Data Flow After Connection

All three modes converge to the same runtime data flow once the DataChannel opens:

```
Browser PWA ←── DataChannel (64 KiB chunks) ──→ Sidecar ←── WebSocket ──→ OpenClaw Gateway
                                                              ws://127.0.0.1:18789
```

The signaling WebSocket is closed by the browser after the DataChannel opens (`connection-manager.ts:73`). The sidecar keeps its signaling WebSocket open for potential future reconnections.
