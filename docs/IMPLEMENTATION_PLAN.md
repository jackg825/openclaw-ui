# OpenClaw Web Client — Implementation Plan

**Version**: 0.1.0
**Date**: 2026-02-11
**Model**: Claude Opus 4.6
**Status**: Draft

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Phase 1: Scaffold & WebRTC Foundation (Weeks 1-4)](#2-phase-1-scaffold--webrtc-foundation)
3. [Phase 2: Rich UI — Markdown + A2UI (Weeks 5-8)](#3-phase-2-rich-ui--markdown--a2ui)
4. [Phase 3: Voice-Driven Plan Mode (Weeks 9-12)](#4-phase-3-voice-driven-plan-mode)
5. [Phase 4: MCP/Skill Store (Weeks 13-16)](#5-phase-4-mcpskill-store)
6. [Phase 5: Cluster Management (Weeks 17-20)](#6-phase-5-cluster-management)
7. [Phase 6: Polish & Launch (Weeks 21-24)](#7-phase-6-polish--launch)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Testing Strategy](#9-testing-strategy)
10. [Open Source Strategy](#10-open-source-strategy)

---

## 1. Monorepo Structure

### 1.1 Package Layout (pnpm workspaces)

```
openclaw-ui/
├── pnpm-workspace.yaml
├── package.json                    # Root: scripts, devDependencies
├── tsconfig.base.json              # Shared TypeScript config
├── .eslintrc.cjs                   # Shared ESLint config
├── .prettierrc                     # Prettier config
├── .gitignore
├── LICENSE                         # MIT
├── README.md
├── CONTRIBUTING.md
├── CLAUDE.md                       # Claude Code project instructions
├── docs/
│   ├── PRD.md
│   ├── IMPLEMENTATION_PLAN.md      # This file
│   └── PAIRING_FLOWS.md           # 3 connection modes (sidecar sign-in, browser pair, reconnect)
│
├── packages/
│   ├── shared-types/               # Shared TypeScript types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Re-exports all types
│   │       ├── openclaw-protocol.ts # Gateway JSON-RPC types
│   │       ├── webrtc-signaling.ts  # Signaling message types
│   │       ├── a2ui.ts             # A2UI JSONL message types
│   │       ├── store.ts            # Skill/MCP catalog types
│   │       └── cluster.ts          # Cluster node/routing types
│   │
│   ├── pwa-client/                 # Main PWA application
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── public/
│   │   │   ├── manifest.json       # PWA manifest
│   │   │   ├── sw.js               # Service worker (generated)
│   │   │   ├── icons/              # PWA icons (192, 512)
│   │   │   └── robots.txt
│   │   └── src/
│   │       ├── main.tsx            # Entry point
│   │       ├── App.tsx             # Root component + router
│   │       ├── vite-env.d.ts
│   │       │
│   │       ├── components/         # UI Components
│   │       │   ├── ui/             # ShadCN/ui base components
│   │       │   ├── layout/         # Shell, Sidebar, Header, StatusBar
│   │       │   ├── chat/           # ChatView, MessageBubble, InputBar
│   │       │   ├── a2ui/           # A2UI renderers
│   │       │   │   ├── registry.ts          # Widget Registry
│   │       │   │   ├── A2UISurface.tsx      # Surface renderer
│   │       │   │   ├── standard/            # Standard A2UI → ShadCN
│   │       │   │   └── openclaw/            # Custom components
│   │       │   ├── voice/          # PushToTalk, Waveform, Transcript
│   │       │   ├── plan/           # PlanPreview, PlanApproval
│   │       │   ├── store/          # StoreHome, SkillCard, InstallWizard
│   │       │   ├── cluster/        # ClusterDashboard, NodeCard, NodeDetail
│   │       │   └── connection/     # ConnectionStatus, PairingDialog
│   │       │
│   │       ├── stores/             # Zustand stores
│   │       │   ├── connection.ts   # WebRTC + OpenClaw connection state
│   │       │   ├── chat.ts         # Conversations, messages, sessions
│   │       │   ├── surface.ts      # A2UI surface trees
│   │       │   ├── datamodel.ts    # A2UI data model bindings
│   │       │   ├── voice.ts        # STT state, recording, transcript
│   │       │   ├── plan.ts         # Plan mode state
│   │       │   ├── store.ts        # Skill catalog, installed, search
│   │       │   ├── cluster.ts      # Cluster nodes, routing, health
│   │       │   └── settings.ts     # User preferences
│   │       │
│   │       ├── lib/                # Core libraries
│   │       │   ├── webrtc/
│   │       │   │   ├── connection-manager.ts   # PeerConnection lifecycle
│   │       │   │   ├── data-channel.ts         # DataChannel wrapper
│   │       │   │   ├── chunker.ts              # 64 KiB message chunking
│   │       │   │   ├── ws-signaling-client.ts  # WebSocket signaling (DO)
│   │       │   │   └── reconnection.ts         # Reconnection state machine
│   │       │   ├── openclaw/
│   │       │   │   ├── protocol.ts             # Protocol bridge (req/res/event)
│   │       │   │   ├── auth.ts                 # Connect handshake, tokens
│   │       │   │   └── session.ts              # Session management
│   │       │   ├── a2ui/
│   │       │   │   ├── parser.ts               # JSONL stream parser
│   │       │   │   ├── stream-splitter.ts      # Markdown vs A2UI detection
│   │       │   │   └── adapter.ts              # A2UI version adapter
│   │       │   ├── voice/
│   │       │   │   ├── web-speech.ts           # Web Speech API wrapper
│   │       │   │   ├── deepgram.ts             # Deepgram Nova-3 client
│   │       │   │   ├── text-cleanup.ts         # Filler removal, vocab correction
│   │       │   │   ├── intent-classifier.ts    # Intent detection
│   │       │   │   └── prompt-generator.ts     # Structured prompt templates
│   │       │   ├── store/
│   │       │   │   ├── clawhub-client.ts       # ClawHub API client
│   │       │   │   ├── mcp-registry-client.ts  # MCP Registry API client
│   │       │   │   └── catalog.ts              # Unified catalog service
│   │       │   └── cluster/
│   │       │       ├── node-manager.ts         # Multi-node connections
│   │       │       ├── router.ts               # Session routing engine
│   │       │       └── health.ts               # Health monitoring
│   │       │
│   │       ├── hooks/              # React hooks
│   │       │   ├── useOpenClaw.ts              # OpenClaw connection hook
│   │       │   ├── useDataChannel.ts           # DataChannel lifecycle
│   │       │   ├── useA2UISurface.ts           # Surface subscription
│   │       │   ├── useVoiceInput.ts            # Voice capture hook
│   │       │   ├── usePlanMode.ts              # Plan mode workflow
│   │       │   └── useCluster.ts               # Cluster state hook
│   │       │
│   │       ├── pages/              # Route pages
│   │       │   ├── ChatPage.tsx
│   │       │   ├── StorePage.tsx
│   │       │   ├── StoreDetailPage.tsx
│   │       │   ├── ClusterPage.tsx
│   │       │   ├── NodeDetailPage.tsx
│   │       │   ├── SettingsPage.tsx
│   │       │   └── ConnectPage.tsx
│   │       │
│   │       └── utils/
│   │           ├── id.ts                       # UUID generation
│   │           ├── crypto.ts                   # Token encryption
│   │           └── format.ts                   # Date, size formatters
│   │
│   ├── sidecar-proxy/              # Node.js WebRTC-WS bridge
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts            # Entry point, CLI args
│   │       ├── bridge.ts           # DataChannel ↔ WebSocket bridge
│   │       ├── ws-signaling.ts     # WebSocket signaling client (DO)
│   │       ├── chunker.ts          # Message chunking (shared logic)
│   │       ├── auth.ts             # Room token validation
│   │       └── config.ts           # Configuration (env vars, defaults)
│   │
│   └── cf-worker-signaling/        # Cloudflare Worker + Durable Object signaling
│       ├── package.json
│       ├── wrangler.toml           # CF Worker + DO config + migrations
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Worker entry (fetch handler, /ws route)
│           ├── signaling-room.ts   # Durable Object (WebSocket Hibernation)
│           ├── routes/
│           │   ├── turn-creds.ts   # POST /turn-creds - generate TURN credentials
│           │   ├── create-room.ts  # POST /create-room - pairing session
│           │   ├── resolve.ts      # GET /resolve - pairing code → roomId
│           │   ├── room-status.ts  # GET /room-status - room peer info
│           │   ├── register-device.ts # POST /register-device
│           │   └── reconnect.ts    # POST /reconnect - device token reconnect
│           ├── storage.ts          # R2 bucket operations for pairing data
│           ├── auth.ts             # Room token validation
│           └── types.ts            # Worker-specific types (Env, PairingData, etc.)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Lint, typecheck, test, build
│   │   ├── deploy-preview.yml      # PR preview deploy to CF Pages
│   │   └── deploy-production.yml   # Main branch → CF Pages production
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
└── scripts/
    ├── setup.sh                    # One-command dev environment setup
    └── deploy-worker.sh            # Deploy CF Worker signaling
```

### 1.2 Root Configuration Files

**pnpm-workspace.yaml**
```yaml
packages:
  - 'packages/*'
```

**package.json (root)**
```json
{
  "name": "openclaw-ui",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter pwa-client dev",
    "build": "pnpm --filter pwa-client build",
    "build:all": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter pwa-client test:e2e",
    "dev:sidecar": "pnpm --filter sidecar-proxy dev",
    "dev:worker": "pnpm --filter cf-worker-signaling dev",
    "deploy:worker": "pnpm --filter cf-worker-signaling deploy",
    "deploy:pages": "pnpm --filter pwa-client build && wrangler pages deploy packages/pwa-client/dist"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**tsconfig.base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 2. Phase 1: Scaffold & WebRTC Foundation

**Duration**: Weeks 1-4
**Goal**: PWA shell running, WebRTC P2P connection to OpenClaw established

### 2.1 Week 1-2: Project Scaffold

#### 2.1.1 packages/shared-types/src/openclaw-protocol.ts

**Purpose**: TypeScript types matching OpenClaw's Gateway JSON-RPC protocol.

```typescript
// Frame types
export interface OCRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface OCResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface OCEvent {
  type: 'event';
  event: string;
  payload: unknown;
  seq?: number;
  stateVersion?: number;
}

export type OCFrame = OCRequest | OCResponse | OCEvent;

// Connect handshake
export interface ConnectParams {
  role: 'operator' | 'node';
  scopes?: string[];
  auth?: {
    token?: string;
    deviceToken?: string;
  };
  device?: {
    name: string;
    platform: string;
    version: string;
  };
  minProtocol: number;
  maxProtocol: number;
}

export interface ConnectResult {
  protocolVersion: number;
  gateway: { version: string; name: string };
  auth?: { deviceToken: string };
}

// Agent execution
export interface AgentRunParams {
  prompt: string;
  agentId?: string;
  sessionKey?: string;
}

export interface AgentRunResult {
  runId: string;
  status: 'accepted';
}

// Agent events
export interface AgentEvent {
  runId: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'status';
  content: string;
  seq: number;
}

// Approval
export interface ApprovalRequest {
  runId: string;
  tool: string;
  args: Record<string, unknown>;
  description: string;
}
```

**Exports**: All interfaces above
**Dependencies**: None (pure types)

#### 2.1.2 packages/shared-types/src/webrtc-signaling.ts

**Purpose**: Types for WebSocket signaling messages exchanged via Durable Object.

```typescript
// ── WebSocket Signaling Protocol ──
// Messages exchanged via Durable Object (SignalingRoom) WebSocket connections

export interface WsJoin {
  type: 'join';
  roomId: string;
  peerId: string;
  role: 'client' | 'sidecar';
}

export interface WsOffer {
  type: 'offer';
  sdp: string;
  peerId?: string; // server → client: source peerId
}

export interface WsAnswer {
  type: 'answer';
  sdp: string;
  peerId?: string;
}

export interface WsIce {
  type: 'ice';
  candidate: RTCIceCandidateInit;
  peerId?: string;
}

export interface WsPeerJoined {
  type: 'peer-joined';
  peerId: string;
  role: 'client' | 'sidecar';
}

export interface WsPeerLeft {
  type: 'peer-left';
  peerId: string;
}

export interface WsError {
  type: 'error';
  message: string;
}

export type WsClientMessage = WsJoin | WsOffer | WsAnswer | WsIce;
export type WsServerMessage = WsOffer | WsAnswer | WsIce | WsPeerJoined | WsPeerLeft | WsError;

// Chunking protocol
export interface ChunkEnvelope {
  _chunk: {
    id: string;     // Message ID
    seq: number;    // 0-indexed chunk sequence
    total: number;  // Total chunks
  };
  _data: string;    // Partial payload (UTF-8)
}

// TURN credentials
export interface TurnCredentials {
  iceServers: {
    urls: string[];
    username?: string;
    credential?: string;
  };
}
```

**Exports**: All interfaces and types
**Dependencies**: None

#### 2.1.3 packages/pwa-client/vite.config.ts

**Purpose**: Vite 6 configuration with PWA plugin, React, and path aliases.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'robots.txt'],
      manifest: {
        name: 'OpenClaw Web Client',
        short_name: 'OpenClaw',
        description: 'Rich WebRTC client for OpenClaw AI agent gateway',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.clawhub\./,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'clawhub-api', expiration: { maxEntries: 100, maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared-types/src'),
    },
  },
  server: { port: 5173 },
});
```

**Dependencies**: `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`

#### 2.1.4 packages/pwa-client/src/stores/connection.ts

**Purpose**: Zustand store for WebRTC + OpenClaw connection state.

```typescript
import { create } from 'zustand';
import type { ConnectResult, OCFrame } from '@shared/openclaw-protocol';

export type ConnectionStatus =
  | 'disconnected'
  | 'signaling'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'failed';

interface ConnectionState {
  status: ConnectionStatus;
  deviceToken: string | null;
  gatewayInfo: ConnectResult['gateway'] | null;
  error: string | null;
  latency: number | null;          // Last measured RTT in ms
  transport: 'p2p' | 'turn' | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setDeviceToken: (token: string) => void;
  setGatewayInfo: (info: ConnectResult['gateway']) => void;
  setError: (error: string | null) => void;
  setLatency: (ms: number) => void;
  setTransport: (transport: 'p2p' | 'turn') => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  deviceToken: null,
  gatewayInfo: null,
  error: null,
  latency: null,
  transport: null,

  setStatus: (status) => set({ status, error: status === 'failed' ? undefined : null }),
  setDeviceToken: (deviceToken) => set({ deviceToken }),
  setGatewayInfo: (gatewayInfo) => set({ gatewayInfo }),
  setError: (error) => set({ error, status: 'failed' }),
  setLatency: (latency) => set({ latency }),
  setTransport: (transport) => set({ transport }),
  reset: () => set({
    status: 'disconnected', deviceToken: null, gatewayInfo: null,
    error: null, latency: null, transport: null,
  }),
}));
```

**Exports**: `useConnectionStore`, `ConnectionStatus` type
**Dependencies**: `zustand`, `@shared/openclaw-protocol`

#### 2.1.5 packages/pwa-client/src/App.tsx

**Purpose**: Root component with React Router and layout shell.

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { ChatPage } from '@/pages/ChatPage';
import { StorePage } from '@/pages/StorePage';
import { ClusterPage } from '@/pages/ClusterPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ConnectPage } from '@/pages/ConnectPage';

export function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/:slug" element={<StoreDetailPage />} />
          <Route path="/cluster" element={<ClusterPage />} />
          <Route path="/cluster/:nodeId" element={<NodeDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
```

**Exports**: `App`
**Dependencies**: `react-router-dom`, all page components, `Shell` layout

#### 2.1.6 packages/pwa-client/src/components/layout/Shell.tsx

**Purpose**: Application shell with sidebar navigation, header, and connection status bar.

```
┌────────────────────────────────────────────────────┐
│ [≡] OpenClaw                    [●Connected] [⚙]  │  ← Header
├──────────┬─────────────────────────────────────────┤
│ 💬 Chat  │                                         │
│ 🔌 Connect│         Main Content Area              │
│ 🏪 Store │         (Router outlet)                 │
│ 🖥 Cluster│                                         │
│ ⚙ Settings│                                        │
│          │                                         │
│          │                                         │
├──────────┴─────────────────────────────────────────┤
│ Status: P2P | Latency: 12ms | Gateway v0.12.1     │  ← StatusBar
└────────────────────────────────────────────────────┘
```

**Key components**:
- `Sidebar` — nav links with active state, collapsible on mobile
- `Header` — logo, connection indicator (color-coded), settings gear
- `StatusBar` — transport type, latency, gateway version, cluster node count
- `children` — React Router outlet

**Dependencies**: ShadCN/ui primitives, `useConnectionStore`

### 2.2 Week 3-4: WebRTC Connection Layer

#### 2.2.1 packages/pwa-client/src/lib/webrtc/chunker.ts

**Purpose**: Split large messages into 64 KiB chunks and reassemble.

```typescript
const MAX_CHUNK_SIZE = 64 * 1024; // 64 KiB

export class MessageChunker {
  private pending = new Map<string, { chunks: string[]; total: number }>();

  /** Split a message into chunks if needed */
  split(message: string): string[] {
    if (message.length <= MAX_CHUNK_SIZE) return [message];

    const id = crypto.randomUUID();
    const chunks: string[] = [];
    for (let i = 0; i < message.length; i += MAX_CHUNK_SIZE) {
      const data = message.slice(i, i + MAX_CHUNK_SIZE);
      const seq = chunks.length;
      const total = Math.ceil(message.length / MAX_CHUNK_SIZE);
      chunks.push(JSON.stringify({ _chunk: { id, seq, total }, _data: data }));
    }
    return chunks;
  }

  /** Receive a chunk; returns assembled message when complete, else null */
  receive(raw: string): string | null {
    const parsed = JSON.parse(raw);
    if (!parsed._chunk) return raw; // Not chunked, pass through

    const { id, seq, total } = parsed._chunk;
    if (!this.pending.has(id)) {
      this.pending.set(id, { chunks: new Array(total), total });
    }
    const entry = this.pending.get(id)!;
    entry.chunks[seq] = parsed._data;

    if (entry.chunks.filter(Boolean).length === entry.total) {
      this.pending.delete(id);
      return entry.chunks.join('');
    }
    return null;
  }
}
```

**Exports**: `MessageChunker`, `MAX_CHUNK_SIZE`
**Dependencies**: None

#### 2.2.2 packages/pwa-client/src/lib/webrtc/ws-signaling-client.ts

**Purpose**: WebSocket signaling client for browser — connects to Durable Object via CF Worker `/ws` endpoint.

```typescript
export class WsSignalingClient {
  private ws: WebSocket | null = null;
  private handlers: ((msg: WsServerMessage) => void)[] = [];
  private baseUrl: string;
  private roomId: string;
  private peerId: string;

  constructor(baseUrl: string, roomId: string, peerId: string) { ... }

  async join(): Promise<void> {
    // 1. Open WebSocket to /ws?room=<roomId>
    // 2. Send { type: 'join', roomId, peerId, role: 'client' }
    // 3. Set up onmessage handler dispatching to registered handlers
  }

  async sendOffer(sdp: string): Promise<void> { /* WS send */ }
  async sendAnswer(sdp: string): Promise<void> { /* WS send */ }
  async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> { /* WS send */ }
  async getTurnCredentials(): Promise<TurnCredentials> { /* HTTP POST /turn-creds */ }

  onMessage(handler: (msg: WsServerMessage) => void): void {
    this.handlers.push(handler);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
  }
}
```

**Exports**: `WsSignalingClient`
**Dependencies**: `@shared/webrtc-signaling` (`WsServerMessage`, `TurnCredentials`)

#### 2.2.3 packages/pwa-client/src/lib/webrtc/connection-manager.ts

**Purpose**: Full WebRTC lifecycle — signaling, ICE, DataChannel, reconnection.

```typescript
export class WebRTCConnectionManager extends EventTarget {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private signaling: WsSignalingClient;
  private chunker = new MessageChunker();
  private state: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' = 'idle';

  constructor(signalingUrl: string, roomId: string) { ... }

  /** Initiate connection as the offering peer */
  async connect(): Promise<void> {
    // 1. Connect to signaling via WebSocket (join room)
    // 2. Get TURN credentials via HTTP
    // 3. Create RTCPeerConnection with STUN + TURN
    // 4. Create DataChannel("openclaw", { ordered: true })
    // 5. Register signaling.onMessage() handler for answer/ICE/peer events
    // 6. Create offer, set local description, send via WS
    // 7. Handle incoming answer → set remote description
    // 8. Handle incoming ICE → add candidates
    // 9. Wait for DataChannel open event
  }

  /** Send a message over DataChannel (with chunking) */
  send(message: string): void {
    const chunks = this.chunker.split(message);
    for (const chunk of chunks) {
      this.dc!.send(chunk);
    }
  }

  /** Register message handler */
  onMessage(handler: (message: string) => void): void { ... }

  /** Reconnection state machine */
  private async handleDisconnect(): Promise<void> {
    // 1. Try ICE restart on existing PC
    // 2. If fails, create new PC + full renegotiation
    // 3. If fails, enter 'failed' state with exponential backoff retry
  }

  /** Cleanup */
  disconnect(): void { ... }
}
```

**Exports**: `WebRTCConnectionManager`
**Dependencies**: `WsSignalingClient`, `MessageChunker`, `@shared/webrtc-signaling`
**Events emitted**: `connected`, `disconnected`, `reconnecting`, `message`, `error`

#### 2.2.4 packages/pwa-client/src/lib/openclaw/protocol.ts

**Purpose**: OpenClaw protocol bridge — send requests, handle responses/events over DataChannel.

```typescript
export class OpenClawProtocol extends EventTarget {
  private connection: WebRTCConnectionManager;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  constructor(connection: WebRTCConnectionManager) {
    this.connection = connection;
    this.connection.onMessage(this.handleFrame.bind(this));
  }

  /** Send a request and wait for response */
  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = crypto.randomUUID();
    const frame: OCRequest = { type: 'req', id, method, params };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 30000);
      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.connection.send(JSON.stringify(frame));
    });
  }

  /** Perform connect handshake */
  async connect(params: ConnectParams): Promise<ConnectResult> {
    return this.request<ConnectResult>('connect', params);
  }

  /** Start an agent run */
  async agentRun(prompt: string, agentId?: string): Promise<AgentRunResult> {
    return this.request<AgentRunResult>('agent', { prompt, agentId });
  }

  /** Resolve an approval */
  async resolveApproval(runId: string, action: 'approve' | 'deny'): Promise<void> {
    return this.request('exec.approval.resolve', { runId, action });
  }

  /** Handle incoming frames */
  private handleFrame(raw: string): void {
    const frame = JSON.parse(raw) as OCFrame;
    if (frame.type === 'res') {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(frame.id);
        frame.ok ? pending.resolve(frame.payload) : pending.reject(frame.error);
      }
    } else if (frame.type === 'event') {
      this.dispatchEvent(new CustomEvent(frame.event, { detail: frame.payload }));
    }
  }
}
```

**Exports**: `OpenClawProtocol`
**Dependencies**: `WebRTCConnectionManager`, `@shared/openclaw-protocol`

#### 2.2.5 packages/sidecar-proxy/src/bridge.ts

**Purpose**: Core bridge logic — bidirectional forwarding between DataChannel and local WebSocket.

```typescript
import { PeerConnection, DataChannel } from 'node-datachannel';
import WebSocket from 'ws';
import { MessageChunker } from './chunker';

export class Bridge {
  private ws: WebSocket | null = null;
  private chunker = new MessageChunker();

  constructor(
    private gatewayUrl: string = 'ws://127.0.0.1:18789',
  ) {}

  /** Bridge a DataChannel to the local OpenClaw Gateway */
  attach(dc: DataChannel): void {
    this.ws = new WebSocket(this.gatewayUrl);

    // DataChannel → WebSocket (reassemble chunks, forward)
    dc.onMessage((msg: string | Buffer) => {
      const str = typeof msg === 'string' ? msg : msg.toString('utf-8');
      const assembled = this.chunker.receive(str);
      if (assembled && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(assembled);
      }
    });

    // WebSocket → DataChannel (chunk if large, forward)
    this.ws.on('message', (data: WebSocket.Data) => {
      const str = data.toString('utf-8');
      const chunks = this.chunker.split(str);
      for (const chunk of chunks) {
        dc.sendMessage(chunk);
      }
    });

    // Lifecycle
    dc.onClosed(() => { this.ws?.close(); });
    this.ws.on('close', () => { dc.close(); });
    this.ws.on('error', (err) => { console.error('[bridge] WS error:', err.message); dc.close(); });
  }

  close(): void {
    this.ws?.close();
  }
}
```

**Exports**: `Bridge`
**Dependencies**: `node-datachannel`, `ws`, `MessageChunker`

#### 2.2.6 packages/cf-worker-signaling/src/index.ts

**Purpose**: Cloudflare Worker entry point — WebSocket upgrade to Durable Object + HTTP pairing routes.

```typescript
import type { Env } from './types.js';
export { SignalingRoom } from './signaling-room.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    // ── WebSocket upgrade → Durable Object ──
    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room');
      if (!roomId) return new Response('Missing room param', { status: 400 });
      const id = env.SIGNALING_ROOM.idFromName(roomId);
      const stub = env.SIGNALING_ROOM.get(id);
      return stub.fetch(request);
    }

    // ── Public pairing routes (HTTP) ──
    switch (url.pathname) {
      case '/create-room':     /* POST — create pairing session */ break;
      case '/resolve':         /* GET — pairing code → roomId */ break;
      case '/room-status':     /* GET — room peer info */ break;
      case '/register-device': /* POST — register device token */ break;
      case '/reconnect':       /* POST — device token reconnect */ break;
    }

    // ── Auth-required routes ──
    switch (url.pathname) {
      case '/turn-creds': /* POST — generate TURN credentials */ break;
    }
  },
};
```

**Exports**: Default Worker fetch handler, `SignalingRoom` (Durable Object class)
**Dependencies**: `SignalingRoom` DO, route handlers, `R2Bucket` (pairing data), Cloudflare TURN API

#### 2.2.7 Phase 1 Definition of Done

- [ ] `pnpm dev` starts PWA at localhost:5173 with hot reload
- [ ] PWA installs on Chrome/Safari/Firefox as standalone app
- [ ] `pnpm dev:worker` starts CF Worker locally via wrangler
- [ ] `pnpm dev:sidecar` starts sidecar proxy pointing at local Gateway
- [ ] Browser → Sidecar WebRTC DataChannel connection established (verified in devtools)
- [ ] OpenClaw `connect` handshake succeeds over DataChannel
- [ ] Messages sent/received through the bridge (req → res cycle)
- [ ] Agent event streaming works (seq-tagged events forwarded)
- [ ] Reconnection recovers from ICE disconnect within 10 seconds
- [ ] Connection status indicator updates in real-time
- [ ] Unit tests for `MessageChunker` (100% coverage)
- [ ] Unit tests for `OpenClawProtocol` (mock DataChannel)
- [ ] Integration test: full signaling → connect → message cycle

---

## 3. Phase 2: Rich UI — Markdown + A2UI

**Duration**: Weeks 5-8
**Goal**: Agent responses render as rich UI with code blocks, terminals, and approval dialogs

### 3.1 Week 5-6: Rendering Foundation

#### 3.1.1 packages/pwa-client/src/lib/a2ui/parser.ts

**Purpose**: Parse A2UI JSONL messages from agent response stream.

```typescript
import type { A2UIMessage, SurfaceUpdate, DataModelUpdate } from '@shared/a2ui';

export class A2UIParser {
  /** Parse a single JSONL line into a typed message */
  parseLine(line: string): A2UIMessage | null {
    const obj = JSON.parse(line);
    if (obj.beginRendering) return { type: 'beginRendering', ...obj.beginRendering };
    if (obj.surfaceUpdate) return { type: 'surfaceUpdate', ...obj.surfaceUpdate };
    if (obj.dataModelUpdate) return { type: 'dataModelUpdate', ...obj.dataModelUpdate };
    if (obj.deleteSurface) return { type: 'deleteSurface', ...obj.deleteSurface };
    return null;
  }

  /** Parse multiple JSONL lines */
  parseBlock(block: string): A2UIMessage[] {
    return block.split('\n')
      .filter(line => line.trim())
      .map(line => this.parseLine(line))
      .filter(Boolean) as A2UIMessage[];
  }
}
```

**Exports**: `A2UIParser`
**Dependencies**: `@shared/a2ui`

#### 3.1.2 packages/pwa-client/src/lib/a2ui/stream-splitter.ts

**Purpose**: Detect and split agent response stream into markdown segments and A2UI blocks.

```typescript
export type StreamSegment =
  | { type: 'markdown'; content: string }
  | { type: 'a2ui'; content: string };

/**
 * Split a streaming agent response into markdown and A2UI segments.
 * A2UI blocks are delimited by ```a2ui ... ``` fence markers.
 */
export class StreamSplitter {
  private buffer = '';
  private inA2UIBlock = false;

  /** Feed new text chunk, returns any complete segments */
  feed(chunk: string): StreamSegment[] {
    this.buffer += chunk;
    const segments: StreamSegment[] = [];

    while (true) {
      if (!this.inA2UIBlock) {
        const fenceStart = this.buffer.indexOf('```a2ui\n');
        if (fenceStart === -1) break;
        if (fenceStart > 0) {
          segments.push({ type: 'markdown', content: this.buffer.slice(0, fenceStart) });
        }
        this.buffer = this.buffer.slice(fenceStart + 8); // Skip ```a2ui\n
        this.inA2UIBlock = true;
      }

      if (this.inA2UIBlock) {
        const fenceEnd = this.buffer.indexOf('\n```');
        if (fenceEnd === -1) break;
        segments.push({ type: 'a2ui', content: this.buffer.slice(0, fenceEnd) });
        this.buffer = this.buffer.slice(fenceEnd + 4); // Skip \n```
        this.inA2UIBlock = false;
      }
    }

    return segments;
  }

  /** Flush remaining buffer as markdown */
  flush(): StreamSegment | null {
    if (this.buffer.length > 0) {
      const content = this.buffer;
      this.buffer = '';
      return { type: this.inA2UIBlock ? 'a2ui' : 'markdown', content };
    }
    return null;
  }
}
```

**Exports**: `StreamSplitter`, `StreamSegment`
**Dependencies**: None

#### 3.1.3 packages/pwa-client/src/stores/surface.ts

**Purpose**: Zustand store for A2UI surface component trees.

```typescript
import { create } from 'zustand';
import type { A2UIComponent } from '@shared/a2ui';

interface Surface {
  id: string;
  components: Map<string, A2UIComponent>;
  rootId: string | null;
  status: 'rendering' | 'complete';
}

interface SurfaceState {
  surfaces: Map<string, Surface>;
  createSurface: (surfaceId: string) => void;
  updateSurface: (surfaceId: string, components: A2UIComponent[]) => void;
  deleteSurface: (surfaceId: string) => void;
  getSurface: (surfaceId: string) => Surface | undefined;
}

export const useSurfaceStore = create<SurfaceState>((set, get) => ({
  surfaces: new Map(),
  createSurface: (surfaceId) => set((state) => {
    const surfaces = new Map(state.surfaces);
    surfaces.set(surfaceId, { id: surfaceId, components: new Map(), rootId: null, status: 'rendering' });
    return { surfaces };
  }),
  updateSurface: (surfaceId, components) => set((state) => {
    const surfaces = new Map(state.surfaces);
    const surface = surfaces.get(surfaceId);
    if (!surface) return state;
    for (const comp of components) {
      surface.components.set(comp.id, comp);
      if (!surface.rootId) surface.rootId = comp.id; // First component is root
    }
    return { surfaces };
  }),
  deleteSurface: (surfaceId) => set((state) => {
    const surfaces = new Map(state.surfaces);
    surfaces.delete(surfaceId);
    return { surfaces };
  }),
  getSurface: (surfaceId) => get().surfaces.get(surfaceId),
}));
```

**Exports**: `useSurfaceStore`
**Dependencies**: `zustand`, `@shared/a2ui`

### 3.2 Week 7-8: Component Library

#### 3.2.1 packages/pwa-client/src/components/a2ui/registry.ts

**Purpose**: Widget Registry mapping A2UI component types to React components.

```typescript
import type { ComponentType } from 'react';
// Standard components
import { A2UIText } from './standard/Text';
import { A2UIButton } from './standard/Button';
import { A2UICard } from './standard/Card';
import { A2UITextField } from './standard/TextField';
import { A2UITabs } from './standard/Tabs';
import { A2UIRow } from './standard/Row';
import { A2UIColumn } from './standard/Column';
import { A2UIList } from './standard/List';
import { A2UIModal } from './standard/Modal';
// OpenClaw custom components
import { CodeBlock } from './openclaw/CodeBlock';
import { TerminalOutput } from './openclaw/TerminalOutput';
import { ApprovalDialog } from './openclaw/ApprovalDialog';
import { ProgressBar } from './openclaw/ProgressBar';
import { StatusBadge } from './openclaw/StatusBadge';

export interface WidgetProps {
  component: A2UIComponent;
  surface: Surface;
  dataModel: Record<string, unknown>;
  children?: React.ReactNode;
}

const REGISTRY: Record<string, ComponentType<WidgetProps>> = {
  // Standard A2UI → ShadCN mappings
  Text: A2UIText,
  Button: A2UIButton,
  Card: A2UICard,
  TextField: A2UITextField,
  Tabs: A2UITabs,
  Row: A2UIRow,
  Column: A2UIColumn,
  List: A2UIList,
  Modal: A2UIModal,
  // OpenClaw custom
  CodeBlock,
  TerminalOutput,
  ApprovalDialog,
  ProgressBar,
  StatusBadge,
};

export function resolveWidget(type: string): ComponentType<WidgetProps> | null {
  return REGISTRY[type] ?? null;
}

export function registerWidget(type: string, component: ComponentType<WidgetProps>): void {
  REGISTRY[type] = component;
}
```

**Exports**: `resolveWidget`, `registerWidget`, `WidgetProps`
**Dependencies**: All A2UI component implementations

#### 3.2.2 packages/pwa-client/src/components/a2ui/openclaw/CodeBlock.tsx

**Purpose**: Read-only code viewer using Monaco Editor.

```typescript
// Lazy-loaded Monaco to avoid blocking initial bundle
import { lazy, Suspense } from 'react';
import type { WidgetProps } from '../registry';
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export function CodeBlock({ component, dataModel }: WidgetProps) {
  const { language, value, filename } = resolveBindings(component, dataModel);

  return (
    <div className="rounded-lg border overflow-hidden">
      {filename && (
        <div className="px-3 py-1.5 bg-muted text-xs font-mono border-b">{filename}</div>
      )}
      <Suspense fallback={<pre className="p-4 font-mono text-sm">{value}</pre>}>
        <MonacoEditor
          height="auto"
          language={language || 'typescript'}
          value={value}
          theme="vs-dark"
          options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
        />
      </Suspense>
    </div>
  );
}
```

**Exports**: `CodeBlock`
**Dependencies**: `@monaco-editor/react` (lazy), `WidgetProps`

#### 3.2.3 packages/pwa-client/src/components/a2ui/openclaw/ApprovalDialog.tsx

**Purpose**: Accept/reject dialog for OpenClaw exec.approval.requested events.

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useOpenClaw } from '@/hooks/useOpenClaw';
import type { WidgetProps } from '../registry';

export function ApprovalDialog({ component, dataModel }: WidgetProps) {
  const { tool, description, args, runId } = resolveBindings(component, dataModel);
  const { protocol } = useOpenClaw();

  const handleApprove = () => protocol?.resolveApproval(runId, 'approve');
  const handleDeny = () => protocol?.resolveApproval(runId, 'deny');

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status="pending" />
          <span className="font-semibold">Approval Required: {tool}</span>
        </div>
      </CardHeader>
      <CardContent className="text-sm">{description}</CardContent>
      {args && (
        <CardContent className="pt-0">
          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(args, null, 2)}</pre>
        </CardContent>
      )}
      <CardFooter className="gap-2">
        <Button variant="default" onClick={handleApprove}>Approve</Button>
        <Button variant="outline" onClick={handleDeny}>Deny</Button>
      </CardFooter>
    </Card>
  );
}
```

**Exports**: `ApprovalDialog`
**Dependencies**: ShadCN `Button`, `Card`, `useOpenClaw` hook

#### 3.2.4 Phase 2 Definition of Done

- [ ] Agent text responses render as streaming markdown (incremental)
- [ ] A2UI blocks within ```a2ui fences render as native React components
- [ ] CodeBlock displays syntax-highlighted code with filename header
- [ ] TerminalOutput renders ANSI escape sequences correctly
- [ ] ApprovalDialog sends approve/deny back to Gateway
- [ ] ProgressBar and StatusBadge update reactively via dataModelUpdate
- [ ] Chat interface shows conversation history with agent/user messages
- [ ] Surface store correctly manages multiple concurrent surfaces
- [ ] Widget Registry resolves all standard + custom components
- [ ] Unknown A2UI component types show graceful fallback
- [ ] Component tests for each A2UI component (React Testing Library)

---

## 4. Phase 3: Voice-Driven Plan Mode

**Duration**: Weeks 9-12
**Goal**: Users can speak commands, get structured plans, and approve via voice/touch

### 4.1 Week 9-10: Speech Input

#### 4.1.1 packages/pwa-client/src/lib/voice/web-speech.ts

**Purpose**: Web Speech API wrapper with cross-browser handling.

```typescript
export class WebSpeechSTT extends EventTarget {
  private recognition: SpeechRecognition | null = null;
  private supported: boolean;

  constructor() {
    super();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SR;
    if (this.supported) {
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  get isSupported(): boolean { return this.supported; }

  start(): void {
    if (!this.recognition) return;
    this.recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const transcript = results.map(r => r[0].transcript).join('');
      const isFinal = results[results.length - 1]?.isFinal ?? false;
      this.dispatchEvent(new CustomEvent('transcript', {
        detail: { transcript, isFinal, confidence: results[results.length - 1]?.[0]?.confidence ?? 0 }
      }));
    };
    this.recognition.onerror = (event) => {
      this.dispatchEvent(new CustomEvent('error', { detail: event.error }));
    };
    this.recognition.start();
  }

  stop(): void { this.recognition?.stop(); }
}
```

**Exports**: `WebSpeechSTT`
**Dependencies**: Browser `SpeechRecognition` API

#### 4.1.2 packages/pwa-client/src/lib/voice/text-cleanup.ts

**Purpose**: Clean raw STT output — remove fillers, correct technical vocabulary.

```typescript
import Fuse from 'fuse.js';

const FILLER_PATTERNS = [
  /\b(um|uh|er|ah|like|you know|basically|actually|so yeah)\b/gi,
  /\b(I mean|kind of|sort of)\b/gi,
];

const TECH_CORRECTIONS: Record<string, string> = {
  'react hoods': 'React hooks', 'use state': 'useState', 'use effect': 'useEffect',
  'type script': 'TypeScript', 'next js': 'Next.js', 'node js': 'Node.js',
  'jason': 'JSON', 'package jason': 'package.json', 'env file': '.env file',
  'cube control': 'kubectl', 'docker file': 'Dockerfile',
};

export function cleanTranscript(raw: string, projectVocab?: string[]): string {
  let text = raw;

  // Phase 1: Remove fillers
  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, '');
  }
  text = text.replace(/\s{2,}/g, ' ').trim();

  // Phase 2: Technical vocabulary correction (exact matches)
  for (const [wrong, right] of Object.entries(TECH_CORRECTIONS)) {
    text = text.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  }

  // Phase 3: Project-aware fuzzy matching (if vocabulary provided)
  if (projectVocab?.length) {
    const fuse = new Fuse(projectVocab, { threshold: 0.3, distance: 4 });
    text = text.replace(/\b\w+\b/g, (word) => {
      const results = fuse.search(word);
      return results.length > 0 && results[0].score! < 0.25 ? results[0].item : word;
    });
  }

  return text;
}
```

**Exports**: `cleanTranscript`
**Dependencies**: `fuse.js`

#### 4.1.3 packages/pwa-client/src/lib/voice/intent-classifier.ts

**Purpose**: Classify cleaned transcript into actionable intents.

```typescript
export type IntentType = 'plan_request' | 'direct_command' | 'question' | 'approval' | 'rejection' | 'abort' | 'ambiguous';

export interface ClassifiedIntent {
  type: IntentType;
  confidence: number;
}

export function classifyIntent(text: string, hasPendingPlan: boolean): ClassifiedIntent {
  const lower = text.toLowerCase().trim();

  // Approval (when plan is pending)
  if (hasPendingPlan && /^(yes|yeah|go ahead|looks good|approve|do it|execute|ship it)/i.test(lower)) {
    return { type: 'approval', confidence: 0.95 };
  }
  // Rejection
  if (/^(no|stop|cancel|abort|wait|reject)/i.test(lower)) {
    return { type: hasPendingPlan ? 'rejection' : 'abort', confidence: 0.9 };
  }
  // Direct command
  if (/^(run|execute|deploy|build|test|install|start|open|delete|create|commit|push)/i.test(lower)) {
    return { type: 'direct_command', confidence: 0.85 };
  }
  // Question
  if (/\?$|^(what|how|why|where|when|can you explain|tell me|show me)/i.test(lower)) {
    return { type: 'question', confidence: 0.85 };
  }
  // Plan request (substantial input)
  if (lower.split(' ').length > 5) {
    return { type: 'plan_request', confidence: 0.7 };
  }

  return { type: 'ambiguous', confidence: 0.4 };
}
```

**Exports**: `classifyIntent`, `IntentType`, `ClassifiedIntent`
**Dependencies**: None

#### 4.1.4 packages/pwa-client/src/components/voice/PushToTalk.tsx

**Purpose**: Push-to-talk button with waveform visualization and live transcript.

```
┌─────────────────────────────────────────┐
│  "Add authentication with Google..."    │  ← Live transcript overlay
│  ~~~~~~~~~~~ (waveform) ~~~~~~~~~~~     │  ← Audio level animation
│             [🎤 Release to send]         │  ← Button states: idle/recording/processing
│             [Swipe up to cancel]         │
└─────────────────────────────────────────┘
```

**Key states**: `idle` → `recording` (hold) → `processing` (release) → `done`
**Keyboard shortcut**: Hold `M` key (configurable)
**Mobile**: Large FAB button in bottom-right

**Exports**: `PushToTalk`
**Dependencies**: `useVoiceInput` hook, `WebSpeechSTT` or `DeepgramSTT`, waveform canvas

### 4.2 Week 11-12: Plan Pipeline

#### 4.2.1 packages/pwa-client/src/lib/voice/prompt-generator.ts

**Purpose**: Transform classified voice input into structured agent prompts.

```typescript
interface SessionContext {
  recentFiles: string[];
  recentCommands: string[];
  framework: string;
  language: string;
  dependencies: string[];
}

const TEMPLATES: Record<string, (task: string, ctx: SessionContext) => string> = {
  feature: (task, ctx) => `## Task: ${extractTitle(task)}
Implement the following: ${task}

## Context
- Project: ${ctx.framework} (${ctx.language})
- Key dependencies: ${ctx.dependencies.slice(0, 10).join(', ')}
- Recent files: ${ctx.recentFiles.slice(0, 5).join(', ')}

## Instructions
Provide a step-by-step implementation plan with specific file changes.`,

  bugfix: (task, ctx) => `## Bug Report
${task}

## Context
- Recent files: ${ctx.recentFiles.join(', ')}

## Instructions
Investigate the root cause and provide a fix plan.`,

  question: (task, _ctx) => task, // Questions pass through directly
};

export function generateStructuredPrompt(
  text: string,
  intent: IntentType,
  context: SessionContext,
): string {
  if (intent === 'question' || intent === 'direct_command') return text;

  const templateKey = detectTemplateType(text); // 'feature' | 'bugfix' | 'refactor' | ...
  const template = TEMPLATES[templateKey] ?? TEMPLATES.feature;
  return template(text, context);
}
```

**Exports**: `generateStructuredPrompt`
**Dependencies**: `IntentType`, `SessionContext`

#### 4.2.2 packages/pwa-client/src/components/plan/PlanPreview.tsx

**Purpose**: Plan mode UI — displays generated plan, allows approval/edit/rejection.

```
┌──────────────────────────────────────────────────────┐
│  Plan Mode                                    [×]    │
│                                                      │
│  Voice Input (editable):                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ "Add Google OAuth and email/password auth     │   │
│  │  to the Next.js app"                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Generated Plan:                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Install next-auth and @auth/prisma-adapter│   │
│  │ 2. Create app/api/auth/[...nextauth]/route.ts│   │
│  │ 3. Set up Google OAuth provider              │   │
│  │ 4. Add email/password provider with bcrypt   │   │
│  │ 5. Create login page at app/login/page.tsx   │   │
│  │ 6. Add session provider to root layout       │   │
│  │ 7. Create middleware for protected routes     │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Confidence: 92%  |  Est. changes: 7 files          │
│                                                      │
│  [🎤 "Approve"] [✏️ Edit Plan] [❌ Reject]          │
└──────────────────────────────────────────────────────┘
```

**Exports**: `PlanPreview`
**Dependencies**: `usePlanMode` hook, `useVoiceInput`, ShadCN components

#### 4.2.3 Phase 3 Definition of Done

- [ ] Push-to-talk captures voice and shows live waveform + interim transcript
- [ ] Web Speech API works on Chrome desktop
- [ ] Text cleanup removes fillers and corrects common technical terms
- [ ] Intent classifier correctly categorizes: plan request, command, question, approval
- [ ] Structured prompt generator produces well-formatted agent prompts
- [ ] Plan preview UI displays agent-generated plans
- [ ] Voice approval ("go ahead") triggers plan execution
- [ ] Voice rejection ("start over") re-enters capture mode
- [ ] Editable transcript allows keyboard corrections before submission
- [ ] Keyboard shortcut (M key) works for push-to-talk on desktop
- [ ] Mobile FAB button works for push-to-talk

---

## 5. Phase 4: MCP/Skill Store

**Duration**: Weeks 13-16
**Goal**: Users can browse, search, install, and manage skills/MCP servers from the PWA

### 5.1 Week 13-14: Store Backend

#### 5.1.1 packages/pwa-client/src/lib/store/clawhub-client.ts

**Purpose**: API client for ClawHub skill registry.

```typescript
const CLAWHUB_API = 'https://api.clawhub.dev'; // or configurable

export class ClawHubClient {
  async search(query: string, filters?: SearchFilters): Promise<CatalogEntry[]> { ... }
  async getSkill(slug: string): Promise<CatalogEntry> { ... }
  async getVersions(slug: string): Promise<VersionEntry[]> { ... }
  async getPopular(limit?: number): Promise<CatalogEntry[]> { ... }
  async getCategories(): Promise<Category[]> { ... }
}
```

**Exports**: `ClawHubClient`
**Dependencies**: `@shared/store` types

#### 5.1.2 Skill Install via Gateway WebSocket

Installation uses the OpenClaw protocol bridge to send install commands:

```typescript
// In OpenClawProtocol class:
async installSkill(slug: string, version?: string, config?: Record<string, string>): Promise<void> {
  return this.request('skill.install', { slug, version, config });
}

async uninstallSkill(slug: string): Promise<void> {
  return this.request('skill.uninstall', { slug });
}

async listInstalledSkills(): Promise<InstalledSkill[]> {
  return this.request('skill.list', {});
}

async enableSkill(slug: string): Promise<void> {
  return this.request('skill.enable', { slug });
}

async disableSkill(slug: string): Promise<void> {
  return this.request('skill.disable', { slug });
}
```

### 5.2 Week 15-16: Store UI

Key pages: `StorePage`, `StoreDetailPage`, `InstallWizard`, `InstalledDashboard`

#### 5.2.4 Phase 4 Definition of Done

- [ ] Store homepage loads with featured, popular, and categorized skills
- [ ] Search returns relevant results with faceted filters
- [ ] Skill detail page shows description, screenshots, permissions, version history
- [ ] Install wizard walks through: review → permissions → configure → activate
- [ ] Installation sends `skill.install` via Gateway WebSocket and shows progress
- [ ] Installed dashboard lists all skills with enable/disable/update/uninstall
- [ ] Update notifications show changelog previews
- [ ] Offline browsing works via cached catalog in IndexedDB

---

## 6. Phase 5: Cluster Management

**Duration**: Weeks 17-20
**Goal**: Manage multiple OpenClaw instances from one client

### 6.1 Multi-Node Architecture

#### 6.1.1 packages/pwa-client/src/lib/cluster/node-manager.ts

**Purpose**: Manage parallel WebRTC connections to multiple OpenClaw instances.

```typescript
export class NodeManager extends EventTarget {
  private nodes = new Map<string, {
    connection: WebRTCConnectionManager;
    protocol: OpenClawProtocol;
    meta: ClusterNode;
  }>();

  async addNode(config: NodeConfig): Promise<void> { ... }
  async removeNode(nodeId: string): Promise<void> { ... }
  getNode(nodeId: string): { connection; protocol; meta } | undefined { ... }
  getHealthyNodes(): ClusterNode[] { ... }
  getAllNodes(): ClusterNode[] { ... }
}
```

**Exports**: `NodeManager`
**Dependencies**: `WebRTCConnectionManager`, `OpenClawProtocol`, `@shared/cluster`

#### 6.1.2 packages/pwa-client/src/lib/cluster/router.ts

**Purpose**: Route requests to the best available node.

```typescript
export type RoutingStrategy = 'affinity' | 'capability' | 'round-robin' | 'least-loaded' | 'manual';

export class SessionRouter {
  private strategy: RoutingStrategy = 'affinity';
  private sessionAffinity = new Map<string, string>(); // sessionKey → nodeId

  /** Select the best node for a request */
  route(request: RouteRequest, nodes: ClusterNode[]): string {
    const healthy = nodes.filter(n => n.status === 'online');
    if (healthy.length === 0) throw new Error('No healthy nodes available');

    // Check affinity first
    if (this.sessionAffinity.has(request.sessionKey)) {
      const affinityNode = this.sessionAffinity.get(request.sessionKey)!;
      if (healthy.find(n => n.id === affinityNode)) return affinityNode;
    }

    switch (this.strategy) {
      case 'capability': return this.routeByCapability(request, healthy);
      case 'least-loaded': return this.routeByLoad(healthy);
      case 'round-robin': return this.routeRoundRobin(healthy);
      default: return healthy[0].id; // Affinity fallback to first healthy
    }
  }

  setStrategy(strategy: RoutingStrategy): void { this.strategy = strategy; }
}
```

**Exports**: `SessionRouter`, `RoutingStrategy`
**Dependencies**: `@shared/cluster`

#### 6.1.3 Phase 5 Definition of Done

- [ ] Add/remove nodes via wizard UI
- [ ] Cluster dashboard shows all nodes with health status (green/yellow/red)
- [ ] Node detail page displays CPU, RAM, disk charts + agent/skill lists
- [ ] Session routing respects affinity (same conversation → same node)
- [ ] Failed node triggers automatic rerouting to next healthy node
- [ ] Resource metrics refresh every 30 seconds
- [ ] Cluster state persists across PWA sessions (IndexedDB)

---

## 7. Phase 6: Polish & Launch

**Duration**: Weeks 21-24
**Goal**: Production-ready, accessible, well-documented open-source release

### 7.1 Deepgram Integration (Pro Tier)

#### packages/pwa-client/src/lib/voice/deepgram.ts

**Purpose**: Deepgram Nova-3 streaming STT client for Pro users and iOS PWA.

```typescript
export class DeepgramSTT extends EventTarget {
  private socket: WebSocket | null = null;

  constructor(private apiKey: string) { super(); }

  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1, sampleRate: 16000 }
    });

    this.socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&interim_results=true&utterance_end_ms=1500&keywords=React:2&keywords=TypeScript:2`,
      ['token', this.apiKey]
    );

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    // ... AudioWorklet setup to pipe PCM to WebSocket
  }

  stop(): void { this.socket?.close(); }
}
```

**Exports**: `DeepgramSTT`
**Dependencies**: Browser `MediaDevices`, `AudioWorklet`

### 7.2 Advanced A2UI Components

- **DiffView**: Monaco diff editor for side-by-side code comparison
- **FileTree**: Virtualized tree (react-arborist) with file type icons
- **CodeEditor**: Monaco editor (editable mode) for inline code editing

### 7.3 Accessibility Audit Checklist

- [ ] All interactive elements keyboard-navigable (Tab, Enter, Escape)
- [ ] ARIA labels on all buttons, inputs, dynamic regions
- [ ] `aria-live="polite"` on streaming text regions
- [ ] Focus trapping in modals and dialogs
- [ ] Color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] Screen reader tested (VoiceOver, NVDA)
- [ ] axe-core integrated in CI

### 7.4 Phase 6 Definition of Done

- [ ] Deepgram STT works on iOS Safari PWA
- [ ] DiffView, FileTree, CodeEditor render correctly
- [ ] Mobile layout responsive (sidebar collapses, FAB push-to-talk)
- [ ] WCAG 2.2 AA compliance verified
- [ ] CONTRIBUTING.md published with contributor guidelines
- [ ] CI/CD pipeline: lint → typecheck → test → build → deploy
- [ ] README with quickstart, screenshots, architecture diagram
- [ ] GitHub releases with changelogs

---

## 8. CI/CD Pipeline

### 8.1 GitHub Actions: ci.yml

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:all
      - uses: actions/upload-artifact@v4
        with:
          name: pwa-dist
          path: packages/pwa-client/dist
```

### 8.2 Deploy Preview (PR)

```yaml
name: Deploy Preview
on: pull_request
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile && pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          command: pages deploy packages/pwa-client/dist --project-name=openclaw-ui --branch=${{ github.head_ref }}
```

### 8.3 Production Deploy (main)

```yaml
name: Deploy Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile && pnpm build:all
      - uses: cloudflare/wrangler-action@v3
        with:
          command: pages deploy packages/pwa-client/dist --project-name=openclaw-ui --branch=main
      - uses: cloudflare/wrangler-action@v3
        with:
          command: deploy --config packages/cf-worker-signaling/wrangler.toml
```

---

## 9. Testing Strategy

### 9.1 Tools

| Type | Tool | Config |
|------|------|--------|
| Unit / Integration | Vitest | Per-package vitest.config.ts |
| Component | React Testing Library + Vitest | @testing-library/react |
| E2E | Playwright | packages/pwa-client/playwright.config.ts |
| Coverage | c8 (via Vitest) | Threshold per phase |

### 9.2 Coverage Targets

| Phase | Scope | Target |
|-------|-------|--------|
| Phase 1 | shared-types, chunker, signaling-client, protocol | 90% |
| Phase 2 | A2UI parser, stream-splitter, surface store | 85% |
| Phase 3 | text-cleanup, intent-classifier, prompt-generator | 90% |
| Phase 4 | clawhub-client, catalog service | 80% |
| Phase 5 | node-manager, router | 85% |

### 9.3 WebRTC Mocking Strategy

```typescript
// Mock RTCPeerConnection for unit tests
class MockPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
  setLocalDescription = vi.fn();
  setRemoteDescription = vi.fn();
  addIceCandidate = vi.fn();
  createDataChannel = vi.fn().mockReturnValue(new MockDataChannel());
  close = vi.fn();
}

class MockDataChannel {
  readyState = 'open';
  send = vi.fn();
  close = vi.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
}

// Use in tests:
vi.stubGlobal('RTCPeerConnection', MockPeerConnection);
```

---

## 10. Open Source Strategy

### 10.1 LICENSE

MIT License — maximizes adoption and contribution.

### 10.2 CONTRIBUTING.md Outline

1. **Getting Started**: Fork, clone, `pnpm install`, `pnpm dev`
2. **Development Workflow**: Branch naming (`feat/`, `fix/`, `docs/`), commit messages (Conventional Commits)
3. **Architecture Overview**: Package structure, key libraries, data flow
4. **Adding Components**: How to add new A2UI components to the registry
5. **Testing Requirements**: Minimum coverage, required test types
6. **PR Process**: Template, review checklist, CI requirements
7. **Code of Conduct**: Contributor Covenant v2.1

### 10.3 Issue Templates

**Bug Report**: Steps to reproduce, expected vs actual, browser/OS, screenshots
**Feature Request**: Use case, proposed solution, alternatives considered

### 10.4 PR Template

```markdown
## What
Brief description of changes.

## Why
Link to issue or explain motivation.

## How
Technical approach.

## Testing
- [ ] Unit tests added/updated
- [ ] Component tests added/updated
- [ ] Manual testing done on Chrome, Safari, Firefox
- [ ] Mobile testing done

## Screenshots
(if UI changes)
```

---

## Appendix: Key Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| react | ^19.0.0 | UI framework | MIT |
| react-dom | ^19.0.0 | DOM rendering | MIT |
| react-router-dom | ^7.0.0 | Client routing | MIT |
| zustand | ^5.0.0 | State management | MIT |
| vite | ^6.0.0 | Build tool | MIT |
| vite-plugin-pwa | ^0.21.0 | PWA support | MIT |
| radix-ui | ^1.2.0 | ShadCN primitives | MIT |
| tailwindcss | ^4.0.0 | Utility CSS | MIT |
| react-markdown | ^9.0.0 | Markdown rendering | MIT |
| @monaco-editor/react | ^4.6.0 | Code editor | MIT |
| @xterm/xterm | ^5.5.0 | Terminal rendering | MIT |
| fuse.js | ^7.0.0 | Fuzzy search | Apache-2.0 |
| node-datachannel | ^0.30.0 | Node.js WebRTC (sidecar) | MPL-2.0 |
| ws | ^8.18.0 | WebSocket client (sidecar) | MIT |
| wrangler | ^3.100.0 | CF Worker dev/deploy | Apache-2.0 |
| vitest | ^3.0.0 | Test runner | MIT |
| @testing-library/react | ^16.0.0 | Component testing | MIT |
| playwright | ^1.50.0 | E2E testing | Apache-2.0 |

---

*Implementation Plan v0.1.0 | Generated 2026-02-11 | Claude Opus 4.6*
