# OpenClaw Web Client: agent guide

## Project

OpenClaw Web Client — a PWA that connects to OpenClaw AI agent gateways via WebRTC DataChannel. Uses a sidecar proxy to bridge WebRTC to the gateway's local WebSocket (`ws://127.0.0.1:18789`) with zero modifications to OpenClaw itself.

Read `docs/PRD.md` for requirement changes and `docs/IMPLEMENTATION_PLAN.md` for architecture changes. Before changing connection or pairing behavior, read `docs/PAIRING_FLOWS.md`; for authentication, token lifecycle, or deployment changes, read `docs/SECURITY.md`. These design documents include planned work: check current source before describing a defense as implemented.

## Monorepo Structure (pnpm workspaces)

```
packages/
  shared-types/         # Pure TypeScript types (protocol, signaling, A2UI, store, cluster)
  pwa-client/           # React 19 PWA — main application
  sidecar-proxy/        # Node.js bridge: WebRTC DataChannel ↔ local WebSocket
  cf-worker-signaling/  # Cloudflare Worker + Durable Object: WebSocket signaling server
```

## Commands

Use Node >=22 and pnpm 10.29.3 (`package.json`); install with `pnpm install --frozen-lockfile`.

```bash
pnpm dev              # Start PWA dev server (localhost:5173)
pnpm build            # Build PWA only
pnpm build:all        # Build all packages
pnpm lint             # Lint all packages
pnpm typecheck        # Typecheck all packages
pnpm test             # Run all tests (Vitest)
pnpm test:e2e         # Playwright E2E tests (pwa-client only)
pnpm dev:sidecar      # Start sidecar proxy (connects to local gateway)
pnpm dev:worker       # Start CF Worker locally via wrangler
pnpm deploy:worker    # Deploy CF Worker signaling to production
pnpm deploy:pages     # Build PWA + deploy to Cloudflare Pages
```

Run a single test file:
```bash
pnpm --filter @openclaw/pwa-client exec vitest run src/lib/webrtc/chunker.test.ts
```

## Tech Stack

- **React 19 + TypeScript** — strict mode, ES2022 target, bundler module resolution
- **Vite 6** with `vite-plugin-pwa` — path aliases: `@/` → `packages/pwa-client/src/`, `@shared/` → `packages/shared-types/src/`
- **ShadCN/ui** (Radix + Tailwind CSS 4) — all UI primitives
- **Zustand 5** — state management (stores in `packages/pwa-client/src/stores/`)
- **react-router-dom 7** — client-side routing
- **Monaco Editor** (lazy-loaded) — code block rendering; additional diff/editor components are planned in `docs/IMPLEMENTATION_PLAN.md` §7.2.
- **xterm.js** — terminal output rendering
- **node-datachannel** — WebRTC in sidecar (Node.js, not browser)
- **Vitest + React Testing Library** — unit/component tests
- **Playwright** — declared E2E command; a checked-in E2E suite is still missing.

## Architecture

The following describes the protocol and component design. Inspect the relevant integration path before claiming a user flow works; several hooks are only partially wired.

### Data Flow
```
Browser PWA → WebRTC DataChannel (64KiB chunks) → Sidecar Proxy → ws://127.0.0.1:18789 → OpenClaw Gateway
                    ↕ signaling (WebSocket)
           CF Worker → Durable Object (SignalingRoom, WebSocket Hibernation)
```

### OpenClaw Protocol
JSON-RPC over DataChannel: `OCRequest` (type: 'req'), `OCResponse` (type: 'res'), `OCEvent` (type: 'event'). Connect handshake uses nonce/challenge auth with device tokens. See `packages/shared-types/src/openclaw-protocol.ts`.

### Rendering Pipeline
Agent responses are split by `StreamSplitter`: plain text → `react-markdown`, fenced `` ```a2ui `` blocks → A2UI Bridge renderer (Widget Registry maps component types to ShadCN-based React components).

### Signaling Architecture
WebSocket signaling via Cloudflare Durable Objects with Hibernation API:
- Each `roomId` maps to one `SignalingRoom` DO instance
- Browser and sidecar connect via `wss://<worker>/ws?room=<roomId>`
- DO uses hibernation when idle and wakes on message
- Messages: `join`, `offer`, `answer`, `ice`, `peer-joined`, `peer-left`
- TURN credentials still fetched via HTTP (`POST /turn-creds`)
- Types: `WsClientMessage` (client→server), `WsServerMessage` (server→client)

### Connection and Reconnection
UI states, including pairing, are defined in `packages/pwa-client/src/stores/connection.ts`; transport states are separate in `packages/pwa-client/src/lib/webrtc/connection-manager.ts`. Keep their mapping explicit rather than treating them as one linear state chain.

The current disconnect handler closes the old channel/PeerConnection, creates a fresh signaling client, and calls `connect()` under the exponential backoff in `packages/pwa-client/src/lib/webrtc/reconnection.ts`. An ICE-restart escalation is a design proposal, not the implemented reconnect path.

### Message Chunking
WebRTC DataChannel max varies by browser (256 KiB Chrome/Safari). All messages chunk at **64 KiB** with `ChunkEnvelope` format (`_chunk.id`, `_chunk.seq`, `_chunk.total`, `_data`). Shared between pwa-client and sidecar.

## Key Conventions

- Zustand stores: one file per domain in `packages/pwa-client/src/stores/` (connection, chat, surface, datamodel, plan, store, cluster, settings); the planned voice store is not implemented.
- A2UI components: `packages/pwa-client/src/components/a2ui/standard/` (ShadCN mappings) and `packages/pwa-client/src/components/a2ui/openclaw/` (custom: CodeBlock, TerminalOutput, ApprovalDialog, etc.)
- Widget Registry (`packages/pwa-client/src/components/a2ui/registry.ts`): maps A2UI type strings → React components. Use `registerWidget()` to add new ones.
- Hooks live in `packages/pwa-client/src/hooks/`. `useOpenClaw`, `useDataChannel`, `useA2UISurface`, `usePlanMode`, and `useCluster` exist, but protocol/connection integrations remain TODOs in several hooks. Their presence is not evidence of a working end-to-end flow; `useVoiceInput` is planned and absent.
- CF Worker uses Durable Object `SignalingRoom` for WebSocket signaling, R2 for pairing data, Cloudflare TURN API for relay credentials

## Platform Constraints

- **Voice input (planned)**: `docs/PRD.md` VM-04 and `docs/IMPLEMENTATION_PLAN.md` §7.1 require Deepgram Nova-3 streaming for the Pro tier and iOS PWA. The current tree only contains voice/provider settings, not the voice pipeline, browser capability detection, `useVoiceInput`, or Deepgram client. When implementing this requirement, validate the target Safari/PWA behavior; do not describe those settings as functioning STT.
- **WebRTC DataChannel**: 64 KiB chunk size for safe cross-browser support
- **A2UI**: Keep protocol details behind the adapter layer (`packages/pwa-client/src/lib/a2ui/adapter.ts`).

## Testing

- When adding WebRTC tests, stub `RTCPeerConnection` and DataChannel behavior rather than connecting to a live gateway. This is the testing convention; the checked-in suite does not yet contain the planned connection mocks.
- Coverage targets: protocol/chunker/signaling 90%, A2UI parser/splitter 85%, voice pipeline 90%
- Sidecar tests must mock `node-datachannel` and `ws` when added; no sidecar test files are currently checked in.

- CI (`.github/workflows/ci.yml`) runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, then `pnpm build:all`. Root lint/typecheck first build shared types; preserve that prerequisite when running scoped checks.
- The coverage percentages above are project targets, not evidence of measured coverage or enforced thresholds. The shared-types test script is a placeholder, and Worker/sidecar tests allow no tests. Report missing coverage explicitly.
- `pnpm test:e2e` is declared, but no Playwright configuration or E2E suite is checked in at this revision. Do not describe it as verified browser coverage.
- Deployment commands publish to Cloudflare. Development of the sidecar connects to the configured gateway and can operate real agent sessions; neither is a substitute for mocked unit tests.
