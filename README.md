# OpenClaw Web Client

Rich WebRTC-based PWA client for [OpenClaw](https://github.com/openclaw) AI agent gateways.

Connect to any OpenClaw Gateway instance from a browser — no plugins, no extensions. WebRTC DataChannel provides low-latency, peer-to-peer communication with automatic fallback to TURN relay.

## Live Demo

| Service | URL |
|---------|-----|
| PWA Client | https://openclaw-ui-ch0.pages.dev |
| Signaling Worker | https://openclaw-signaling.jackg825.workers.dev |

## Architecture

```
┌──────────────┐     WebRTC DataChannel     ┌────────────────┐     WebSocket     ┌──────────────────┐
│  Browser PWA │ ◄─────── 64 KiB ─────────► │  Sidecar Proxy │ ◄──────────────► │ OpenClaw Gateway │
│  (React 19)  │      chunks (P2P/TURN)      │   (Node.js)    │   ws://127.0.0.1 │  :18789          │
└──────┬───────┘                             └────────────────┘   :18789          └──────────────────┘
       │ HTTP polling
       ▼
┌──────────────────┐
│  CF Worker       │
│  (Signaling)     │ ── R2 Bucket (SDP/ICE ephemeral storage)
│  HTTP polling    │
└──────────────────┘
```

**Zero-intrusion design** — the OpenClaw Gateway needs no modification. The sidecar proxy bridges WebRTC ↔ WebSocket transparently.

## Features

- **WebRTC P2P Connection** — Low-latency DataChannel with 64 KiB chunking, ICE restart reconnection, exponential backoff
- **Hybrid Rendering** — Markdown (default) + A2UI rich components (CodeBlock, TerminalOutput, ApprovalDialog, etc.)
- **A2UI Widget Registry** — 14 built-in components mapped to ShadCN/ui, extensible via `registerWidget()`
- **Plan Mode** — Review and approve agent execution plans before they run
- **Skill Store** — Browse, search, install, and manage skills from ClawHub registry
- **Cluster Management** — Connect to multiple OpenClaw instances with affinity routing
- **PWA** — Installable, offline-capable, responsive (desktop + mobile)
- **Dark Theme** — Slate-based dark UI as default

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- An OpenClaw Gateway instance (for full functionality)

### Development

```bash
# Clone and install
git clone https://github.com/jackg825/openclaw-ui.git
cd openclaw-ui
corepack enable
pnpm install

# Start PWA dev server
pnpm dev                    # → http://localhost:5173

# Start sidecar proxy (connects to local gateway)
pnpm dev:sidecar            # → bridges WebRTC to ws://127.0.0.1:18789

# Start CF Worker signaling locally
pnpm dev:worker             # → http://localhost:8787
```

### Build

```bash
pnpm build                  # Build PWA only
pnpm -r build               # Build all packages
```

### Test

```bash
pnpm test                   # Run all tests (52 tests across 5 suites)
pnpm --filter pwa-client exec vitest run --coverage   # With coverage report

# Single test file
pnpm --filter pwa-client exec vitest run src/lib/webrtc/chunker.test.ts

# Watch mode
pnpm --filter pwa-client exec vitest
```

### Deploy

```bash
pnpm deploy:worker          # Deploy CF Worker signaling to production
pnpm deploy:pages           # Build PWA + deploy to Cloudflare Pages
```

## Monorepo Structure

```
packages/
  shared-types/             # Pure TypeScript types — protocol, signaling, A2UI, store, cluster
  pwa-client/               # React 19 PWA — main application
  │  src/
  │  ├── components/
  │  │   ├── ui/            # ShadCN/ui base (button, card, dialog, input, tabs, etc.)
  │  │   ├── layout/        # Shell, Sidebar, Header, StatusBar
  │  │   ├── chat/          # ChatView, MessageBubble, InputBar
  │  │   ├── a2ui/          # Widget Registry + 14 A2UI components
  │  │   ├── connection/    # ConnectionStatus, PairingDialog
  │  │   ├── plan/          # PlanPreview, PlanApproval
  │  │   ├── store/         # StoreHome, SkillCard, SkillDetail, InstallWizard
  │  │   └── cluster/       # ClusterDashboard, NodeCard, NodeDetail, AddNodeWizard
  │  ├── stores/            # Zustand stores (connection, chat, surface, datamodel, plan, store, cluster, settings)
  │  ├── hooks/             # useOpenClaw, useDataChannel, useA2UISurface, usePlanMode, useCluster
  │  ├── lib/               # Core libraries
  │  │   ├── webrtc/        # MessageChunker, SignalingClient, ConnectionManager, ReconnectionManager
  │  │   ├── openclaw/      # OpenClawProtocol, auth, session
  │  │   ├── a2ui/          # A2UIParser, StreamSplitter, adapter
  │  │   ├── store/         # ClawHubClient, MCPRegistryClient, CatalogService
  │  │   └── cluster/       # NodeManager, SessionRouter, HealthMonitor
  │  ├── pages/             # ChatPage, ConnectPage, StorePage, ClusterPage, SettingsPage, etc.
  │  └── utils/             # id, crypto, format helpers
  │
  sidecar-proxy/            # Node.js bridge: WebRTC DataChannel ↔ local WebSocket
  cf-worker-signaling/      # Cloudflare Worker: HTTP-polling signaling + R2 storage
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | React 19 + TypeScript (strict) |
| Build | Vite 7 + vite-plugin-pwa |
| Styling | Tailwind CSS 4 + ShadCN/ui (Radix) |
| State | Zustand 5 |
| Routing | react-router-dom 7 |
| Code Display | Monaco Editor (lazy-loaded) |
| Terminal | xterm.js |
| WebRTC (browser) | Native RTCPeerConnection + RTCDataChannel |
| WebRTC (sidecar) | node-datachannel |
| Signaling | Cloudflare Worker + R2 |
| Relay | Cloudflare TURN |
| Testing | Vitest 4 + React Testing Library + Playwright |
| CI/CD | GitHub Actions → Cloudflare Pages/Workers |

## OpenClaw Protocol

JSON-RPC over DataChannel with three frame types:

```typescript
// Request
{ type: 'req', id: string, method: string, params: Record<string, unknown> }

// Response
{ type: 'res', id: string, ok: boolean, payload?: unknown, error?: { code, message } }

// Event (streaming)
{ type: 'event', event: string, payload: unknown, seq?: number }
```

Key methods: `connect` (handshake), `agent` (run prompt), `exec.approval.resolve` (approve/deny tool use).

## A2UI Rendering

Agent responses can embed rich UI via fenced blocks:

````
Here is the result:

```a2ui
{"surfaceUpdate":{"surfaceId":"s1","components":[{"id":"c1","type":"CodeBlock","props":{"language":"typescript","value":"console.log('hello')"}}]}}
```
````

The `StreamSplitter` detects ```` ```a2ui ```` fences, the `A2UIParser` parses JSONL, and the `Widget Registry` resolves component types to React components.

Built-in widgets:

| Standard (→ ShadCN) | Custom (OpenClaw) |
|---------------------|-------------------|
| Text, Button, Card | CodeBlock (Monaco) |
| TextField, Tabs | TerminalOutput (xterm.js) |
| Row, Column, List | ApprovalDialog |
| Modal | ProgressBar, StatusBadge |

Add custom widgets:

```typescript
import { registerWidget } from '@/components/a2ui/registry';
registerWidget('MyWidget', MyWidgetComponent);
```

## Platform Notes

- **iOS Safari PWA**: Web Speech API not available — voice features require Deepgram Pro tier (not yet implemented)
- **WebRTC DataChannel**: 64 KiB chunk size for cross-browser safety (Chrome/Safari max varies 256 KiB)
- **TURN relay**: Only ~10-20% of connections need relay (symmetric NAT); free up to 1 TB/month on Cloudflare
- **Offline**: PWA service worker caches static assets; ClawHub API responses cached via StaleWhileRevalidate

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, branch naming, testing requirements, and PR process.

## License

[MIT](./LICENSE) — OpenClaw Contributors
