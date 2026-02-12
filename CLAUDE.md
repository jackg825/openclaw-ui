# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenClaw Web Client — a PWA that connects to OpenClaw AI agent gateways via WebRTC DataChannel. Uses a sidecar proxy to bridge WebRTC to the gateway's local WebSocket (`ws://127.0.0.1:18789`) with zero modifications to OpenClaw itself.

Design docs: `docs/PRD.md` (requirements), `docs/IMPLEMENTATION_PLAN.md` (architecture + code specs), `docs/PAIRING_FLOWS.md` (3 connection modes with sequence diagrams), `docs/SECURITY.md` (threat model, token lifecycle, defense plan).

## Monorepo Structure (pnpm workspaces)

```
packages/
  shared-types/         # Pure TypeScript types (protocol, signaling, A2UI, store, cluster)
  pwa-client/           # React 19 PWA — main application
  sidecar-proxy/        # Node.js bridge: WebRTC DataChannel ↔ local WebSocket
  cf-worker-signaling/  # Cloudflare Worker + Durable Object: WebSocket signaling server
```

## Commands

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
pnpm --filter pwa-client exec vitest run src/lib/webrtc/chunker.test.ts
```

## Tech Stack

- **React 19 + TypeScript** — strict mode, ES2022 target, bundler module resolution
- **Vite 6** with `vite-plugin-pwa` — path aliases: `@/` → `pwa-client/src/`, `@shared/` → `shared-types/src/`
- **ShadCN/ui** (Radix + Tailwind CSS 4) — all UI primitives
- **Zustand 5** — state management (stores in `pwa-client/src/stores/`)
- **react-router-dom 7** — client-side routing
- **Monaco Editor** (lazy-loaded) — code blocks, diff view, editor
- **xterm.js** — terminal output rendering
- **node-datachannel** — WebRTC in sidecar (Node.js, not browser)
- **Vitest + React Testing Library** — unit/component tests
- **Playwright** — E2E tests

## Architecture

### Data Flow
```
Browser PWA → WebRTC DataChannel (64KiB chunks) → Sidecar Proxy → ws://127.0.0.1:18789 → OpenClaw Gateway
                    ↕ signaling (WebSocket)
           CF Worker → Durable Object (SignalingRoom, WebSocket Hibernation)
```

### OpenClaw Protocol
JSON-RPC over DataChannel: `OCRequest` (type: 'req'), `OCResponse` (type: 'res'), `OCEvent` (type: 'event'). Connect handshake uses nonce/challenge auth with device tokens. See `shared-types/src/openclaw-protocol.ts`.

### Rendering Pipeline
Agent responses are split by `StreamSplitter`: plain text → `react-markdown`, fenced `` ```a2ui `` blocks → A2UI Bridge renderer (Widget Registry maps component types to ShadCN-based React components).

### Signaling Architecture
WebSocket signaling via Cloudflare Durable Objects with Hibernation API:
- Each `roomId` maps to one `SignalingRoom` DO instance
- Browser and sidecar connect via `wss://<worker>/ws?room=<roomId>`
- DO hibernates when idle (zero cost), wakes on message
- Messages: `join`, `offer`, `answer`, `ice`, `peer-joined`, `peer-left`
- TURN credentials still fetched via HTTP (`POST /turn-creds`)
- Types: `WsClientMessage` (client→server), `WsServerMessage` (server→client)

### Connection State Machine
`disconnected → signaling → connecting → authenticating → connected → reconnecting → failed`
Reconnection: ICE restart → new PeerConnection → full re-handshake (exponential backoff).

### Message Chunking
WebRTC DataChannel max varies by browser (256 KiB Chrome/Safari). All messages chunk at **64 KiB** with `ChunkEnvelope` format (`_chunk.id`, `_chunk.seq`, `_chunk.total`, `_data`). Shared between pwa-client and sidecar.

## Key Conventions

- Zustand stores: one file per domain in `pwa-client/src/stores/` (connection, chat, surface, datamodel, voice, plan, store, cluster, settings)
- A2UI components: `components/a2ui/standard/` (ShadCN mappings) and `components/a2ui/openclaw/` (custom: CodeBlock, TerminalOutput, ApprovalDialog, etc.)
- Widget Registry (`components/a2ui/registry.ts`): maps A2UI type strings → React components. Use `registerWidget()` to add new ones.
- Hooks pattern: `useOpenClaw`, `useDataChannel`, `useA2UISurface`, `useVoiceInput`, `usePlanMode`, `useCluster`
- CF Worker uses Durable Object `SignalingRoom` for WebSocket signaling, R2 for pairing data, Cloudflare TURN API for relay credentials

## Platform Constraints

- **iOS Safari PWA**: No Web Speech API — must use Deepgram cloud STT (Pro tier feature)
- **WebRTC DataChannel**: 64 KiB chunk size for safe cross-browser support
- **TURN relay**: Only needed for ~10-20% of connections (symmetric NAT); free up to 1TB/month
- **A2UI**: v0.8 Public Preview — abstract behind adapter layer (`lib/a2ui/adapter.ts`)

## Testing

- WebRTC tests use `MockPeerConnection` and `MockDataChannel` stubs (`vi.stubGlobal('RTCPeerConnection', ...)`)
- Coverage targets: protocol/chunker/signaling 90%, A2UI parser/splitter 85%, voice pipeline 90%
- Sidecar tests mock `node-datachannel` and `ws`
