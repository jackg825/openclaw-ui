# OpenClaw Web Client — Product Requirements Document

**Version**: 0.1.0
**Date**: 2026-02-11
**Status**: Draft
**Author**: Product Team

---

## 1. Product Overview

### 1.1 Vision

OpenClaw Web Client is the first rich, cross-platform PWA client purpose-built for the OpenClaw agent gateway ecosystem. It connects to remote OpenClaw instances via WebRTC (using Cloudflare STUN/TURN) and delivers capabilities far beyond what chat-based integrations (Telegram, WhatsApp, Discord) can offer.

### 1.2 Problem Statement

Current OpenClaw users interact through messaging apps or CLI — limited to text-only, single-instance access. There is no:
- Rich UI for code editing, diff viewing, or interactive approvals
- Voice-first interaction for mobile/hands-free usage
- Visual marketplace for discovering and installing skills/MCP servers
- Multi-instance management from a single client

### 1.3 Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| Power Developer | Uses OpenClaw daily for coding tasks | Rich UI (code editor, diffs), cluster management |
| Mobile Developer | On-the-go code reviews and planning | Voice input, responsive PWA, plan mode |
| Team Lead | Manages multiple OpenClaw instances | Cluster dashboard, skill deployment |
| Community Member | Discovers and shares skills/tools | Store marketplace, ratings, easy install |

### 1.4 Development Model

**Open-source community-driven** — core framework is open source, revenue from hosted services and marketplace commissions.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
                         ┌─────────────────────────────────┐
                         │     Cloudflare Global Edge      │
                         │  ┌──────────┐  ┌─────────────┐ │
                         │  │ Workers  │  │ TURN/STUN   │ │
                         │  │(Signaling│  │ (Relay)     │ │
                         │  │ + API)   │  │             │ │
                         │  └─────┬────┘  └──────┬──────┘ │
                         └────────┼──────────────┼────────┘
                                  │              │
     ┌────────────────┐   ┌──────┴──────────────┴──────┐
     │  OpenClaw PWA  │   │   WebRTC DataChannel (P2P) │
     │  (Browser)     │←→│   or via TURN Relay         │
     └────────────────┘   └──────────────┬─────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │  WebRTC-WS Sidecar Proxy    │
                          │  DataChannel ↔ ws://127.0.0.1:18789
                          └──────────────┬──────────────┘
                          ┌──────────────▼──────────────┐
                          │    OpenClaw Gateway          │
                          │    (unmodified)              │
                          └─────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 19 + TypeScript | A2UI ecosystem, Monaco/xterm integration |
| Build | Vite 6 + vite-plugin-pwa | Fast builds, PWA support |
| State | Zustand | Lightweight, streaming-friendly |
| UI Components | ShadCN/ui | Accessible, A2UI Bridge compatible |
| A2UI Renderer | A2UI Bridge (southleft) | Existing React implementation |
| Code Editor | Monaco Editor | VS Code engine |
| Terminal | xterm.js | Industry standard |
| WebRTC (browser) | Native RTCPeerConnection | No library needed |
| WebRTC (sidecar) | node-datachannel | Lightweight C++ bindings |
| Signaling | Cloudflare Workers + Durable Objects (WebSocket Hibernation) | Instant push, zero idle cost |
| Database | Cloudflare D1 | SQLite, generous free tier |
| Storage | Cloudflare R2 | Zero egress fees |
| Hosting | Cloudflare Pages | Free unlimited bandwidth |

### 2.3 Design Principles

1. **Zero-intrusion**: OpenClaw Gateway requires no modifications (sidecar proxy pattern)
2. **Offline-first PWA**: Core browsing/management works offline
3. **Progressive enhancement**: Markdown → A2UI → MCP Apps (increasing richness)
4. **Privacy by default**: P2P WebRTC, device-based STT, no central server sees data
5. **Community-first**: Open source core, plugin architecture for extensions

---

## 3. Core Features

### 3.1 WebRTC Connection Layer

#### 3.1.1 Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| WR-01 | Connect to remote OpenClaw via WebRTC DataChannel (reliable/ordered) | P0 |
| WR-02 | Cloudflare Workers + Durable Objects WebSocket signaling (instant push) | P0 |
| WR-03 | Cloudflare STUN for NAT discovery | P0 |
| WR-04 | Cloudflare TURN fallback for symmetric NAT | P0 |
| WR-05 | Message chunking at 64 KiB for cross-browser compatibility | P0 |
| WR-06 | Reconnection state machine (ICE restart → new PC → re-handshake) | P0 |
| WR-07 | OpenClaw connect handshake over DataChannel (transparent proxy) | P0 |
| WR-08 | DTLS encryption (mandatory, built-in to WebRTC) | P0 |
| WR-09 | Device token storage in IndexedDB | P1 |
| WR-10 | Connection health indicator in UI | P1 |
| WR-11 | QR code pairing for mobile → desktop sidecar setup | P2 |

#### 3.1.2 Sidecar Proxy

A Node.js sidecar runs alongside each OpenClaw instance:
- Bridges WebRTC DataChannel ↔ local WebSocket (ws://127.0.0.1:18789)
- Connects to signaling via WebSocket (Durable Object `SignalingRoom`)
- Implements message chunking/reassembly
- Zero modifications to OpenClaw Gateway

#### 3.1.3 Cost Structure

| Component | Free Tier | Paid Rate |
|-----------|-----------|-----------|
| STUN | Free | Free |
| TURN | 1,000 GB/mo free | $0.05/GB |
| Workers (routing) | 100K req/day | $5/mo + $0.30/M req |
| Durable Objects (signaling) | Included in Workers Paid | $0.15/M requests + $0.50/GB-mo storage |
| R2 (pairing data) | 10M reads/mo | $0.36/M reads |

### 3.2 A2UI Dynamic Interface

#### 3.2.1 Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-01 | Markdown streaming renderer for text responses | P0 |
| UI-02 | A2UI JSONL parser and surface/data model stores | P0 |
| UI-03 | Standard A2UI components mapped to ShadCN/ui (Text, Button, Card, Tabs, Modal, List) | P0 |
| UI-04 | CodeBlock component (Monaco, read-only, syntax highlighting) | P0 |
| UI-05 | TerminalOutput component (xterm.js, ANSI-aware) | P0 |
| UI-06 | ApprovalDialog component (accept/reject with context) | P0 |
| UI-07 | Hybrid stream splitter (markdown + ```a2ui fence blocks) | P0 |
| UI-08 | DiffView component (Monaco diff editor) | P1 |
| UI-09 | FileTree component (virtualized, file icons) | P1 |
| UI-10 | CodeEditor component (Monaco, editable, multi-language) | P1 |
| UI-11 | SplitPane and Panel layout components | P1 |
| UI-12 | MCP Apps iframe renderer (sandboxed) | P2 |
| UI-13 | Responsive breakpoints (mobile collapse to tabs/stacks) | P1 |
| UI-14 | ProgressBar and StatusBadge components | P0 |

#### 3.2.2 Rendering Strategy

```
Agent Response Stream:
  Markdown text        → react-markdown renderer
  ```a2ui blocks       → A2UI Bridge renderer (native React components)
  MCP tool ui:// refs  → Sandboxed iframe renderer
```

#### 3.2.3 Component Architecture

Three tiers:
1. **Standard A2UI** (ShadCN mappings): Text, Button, Card, TextField, Tabs, Modal, List
2. **OpenClaw Custom**: CodeBlock, DiffView, TerminalOutput, FileTree, ApprovalDialog
3. **Layout**: SplitPane, Panel, ScrollArea, Toolbar

### 3.3 Voice-Driven Plan Mode

#### 3.3.1 Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| VM-01 | Push-to-talk voice activation (hold key/button to speak) | P0 |
| VM-02 | Real-time waveform animation + interim transcript display | P0 |
| VM-03 | Web Speech API integration (Chrome desktop, free tier) | P0 |
| VM-04 | Deepgram Nova-3 streaming integration (Pro tier, iOS PWA) | P1 |
| VM-05 | Text cleanup pipeline (filler removal, technical vocabulary correction) | P0 |
| VM-06 | Intent classification (plan_request, direct_command, question, approval, abort) | P0 |
| VM-07 | Structured prompt generation with session context injection | P1 |
| VM-08 | Plan preview UI with voice/touch approval | P0 |
| VM-09 | Editable transcript before submission | P0 |
| VM-10 | Whisper.cpp WASM fallback for offline/privacy mode | P2 |
| VM-11 | Voice status updates via Web Speech Synthesis | P2 |
| VM-12 | Tap-to-toggle mode for longer dictation | P1 |
| VM-13 | Project-aware keyword boosting (from package.json) | P1 |

#### 3.3.2 Pipeline

```
🎤 Push-to-talk → Streaming STT
       ↓
📝 Raw text → Filler removal → Technical vocab correction
       ↓
🎯 Intent classification → plan_request / command / question / approval
       ↓
📋 Structured prompt generation (template + session context)
       ↓
📄 Plan preview → User approval (voice/touch)
       ↓
⚡ Execution with progress updates
```

#### 3.3.3 STT Cost

| Provider | Rate | Use Case |
|----------|------|----------|
| Web Speech API | $0 | Free tier (Chrome desktop only) |
| Deepgram Nova-3 | $0.0077/min | Pro tier, iOS PWA, Firefox |
| Whisper.cpp WASM | $0 (31 MB model) | Offline/privacy mode |

### 3.4 MCP/Skill Store

#### 3.4.1 Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-01 | Browse skill catalog from ClawHub API | P0 |
| ST-02 | Search with faceted filters (type, category, rating, compatibility) | P0 |
| ST-03 | Skill detail page (description, screenshots, reviews, permissions) | P0 |
| ST-04 | Install wizard (permissions review → configure → install via Gateway WS) | P0 |
| ST-05 | Management dashboard (installed, enable/disable, update, uninstall) | P0 |
| ST-06 | Official MCP Registry integration | P1 |
| ST-07 | Update notifications with changelog preview | P1 |
| ST-08 | Ratings and text reviews | P1 |
| ST-09 | Curated collections and editorial content | P2 |
| ST-10 | Publish workflow for community skill authors | P2 |
| ST-11 | Trust levels (Official/Verified/Community/Unreviewed) | P1 |
| ST-12 | Security scanning pipeline for submitted skills | P2 |

#### 3.4.2 Architecture

```
PWA Store UI → BFF API Gateway → ClawHub API (primary)
                                → MCP Registry (secondary)
                                → Third-party indexes (optional)
```

### 3.5 Cluster Management

#### 3.5.1 Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| CL-01 | Multi-node connection manager (Direct Star topology) | P1 |
| CL-02 | Node registration (manual URL entry) | P1 |
| CL-03 | Cluster overview dashboard (nodes, status, load, health) | P1 |
| CL-04 | Node detail page (metrics, agents, skills, sessions) | P1 |
| CL-05 | Session affinity routing (stick to same node per conversation) | P1 |
| CL-06 | Capability-based routing | P2 |
| CL-07 | Cross-node tool proxy | P2 |
| CL-08 | Session migration/failover | P2 |
| CL-09 | Cluster-wide skill matrix and sync | P2 |
| CL-10 | Auto-discovery via Tailscale/mDNS | P2 |
| CL-11 | Resource monitoring charts (CPU, RAM, disk, sessions) | P1 |
| CL-12 | Add/remove node wizard | P1 |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| PWA initial load (cached) | < 2s |
| WebRTC connection establishment | < 2s (P2P), < 5s (TURN) |
| A2UI component render | < 100ms per surface update |
| Voice-to-text latency (streaming) | < 500ms |
| Reconnection time | < 10s |

### 4.2 Compatibility

| Platform | Minimum Version |
|----------|----------------|
| Chrome (desktop + Android) | 115+ |
| Safari (desktop) | 17+ |
| Safari (iOS) | 17+ (cloud STT required) |
| Firefox | 115+ |
| Edge | 115+ |

### 4.3 Security

- DTLS encryption for all WebRTC DataChannel traffic
- Authenticated signaling via room tokens / JWT
- OpenClaw connect handshake with nonce/challenge
- Device token encryption at rest (Web Crypto API + IndexedDB)
- MCP/Skill sandboxing with declared permission model
- Content Security Policy for MCP Apps iframes

### 4.4 Accessibility

- WCAG 2.2 AA compliance for all standard UI components
- Keyboard navigation for all interactive elements
- Screen reader support (ARIA labels, live regions for streaming)
- Reduced motion support

---

## 5. Pricing Strategy

### 5.1 Freemium + Marketplace

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0/mo | 1 OpenClaw connection, Web Speech API, basic A2UI, community skills, 5 sessions/day |
| Pro | $9/mo | Unlimited connections, cluster mgmt (≤5 nodes), Deepgram STT (60 min/mo), advanced A2UI, session sync |
| Team | $29/seat/mo | Pro + shared clusters, team skill library, analytics, 120 min/mo STT |
| Enterprise | $99+/mo | Custom store, SLA 99.9%, SSO/SAML, unlimited STT, dedicated support |

### 5.2 Marketplace Commission

- 20% on paid skill/MCP server sales (developer-friendly vs Apple's 30%)

### 5.3 Unit Economics (Pro Tier)

- Revenue: $9.00/mo
- Infrastructure cost: ~$0.28/mo
- Gross margin: ~92%

---

## 6. Cost Projections

### 6.1 Infrastructure (Monthly)

| MAU | TURN | Workers | STT (Pro 20%) | Storage | Total | $/user |
|-----|------|---------|---------------|---------|-------|--------|
| 100 | $0 | $0 | $4.62 | $0 | $4.62 | $0.046 |
| 1,000 | $0 | $5 | $46 | $0.03 | $51 | $0.051 |
| 5,000 | $0 | $5 | $231 | $3.83 | $240 | $0.048 |
| 10,000 | $0 | $5 | $462 | $11.40 | $478 | $0.048 |

### 6.2 Revenue Projections

| Period | MAU | Revenue | Infra Cost | Net |
|--------|-----|---------|-----------|-----|
| Year 1 (end) | 5,000 | ~$43.8K | ~$3.6K | ~$40.2K gross |
| Year 2 (end) | 25,000 | ~$379K | ~$18K | ~$373K gross |

---

## 7. Development Roadmap

### 7.1 Phased Delivery

| Phase | Duration | Deliverables | Priority Focus |
|-------|----------|-------------|----------------|
| Phase 1: Foundation | 4 weeks | PWA shell, WebRTC signaling + P2P, basic chat UI, sidecar proxy | WR-01~08 |
| Phase 2: Rich UI | 4 weeks | Markdown streaming, A2UI parser + standard components, CodeBlock, Terminal, Approval | UI-01~07, UI-14 |
| Phase 3: Voice | 4 weeks | Push-to-talk, Web Speech API, text cleanup, intent classification, plan mode | VM-01~06, VM-08~09 |
| Phase 4: Store | 4 weeks | ClawHub browsing, search, install wizard, management dashboard | ST-01~05 |
| Phase 5: Cluster | 4 weeks | Multi-node connections, cluster dashboard, routing, node management | CL-01~05, CL-11~12 |
| Phase 6: Polish | 4 weeks | Deepgram integration, DiffView, FileTree, MCP Registry, responsive mobile | P1 items |

### 7.2 Open Source Strategy

- **Core PWA client**: MIT license, community contributions welcome
- **Sidecar proxy**: MIT license, packaged as npm module
- **CF Worker signaling**: MIT license, one-click deploy template
- **Store BFF**: MIT license
- **Premium features**: Hosted service (managed signaling, cloud STT proxy, analytics)

---

## 8. Success Metrics

| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|---------------------|
| GitHub Stars | 5,000 | 20,000 |
| Monthly Active Users | 1,500 | 5,000 |
| Pro Conversion Rate | 3% | 5% |
| Skills in Store | 100 | 500 |
| Avg Session Duration | 15 min | 25 min |
| Voice Input Adoption | 10% of sessions | 25% of sessions |
| Cluster Users (≥2 nodes) | 50 | 500 |

---

## 9. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| A2UI v0.8 instability | Medium | Medium | Adapter layer isolation; hybrid markdown fallback |
| iOS PWA no Web Speech API | High | Certain | Deepgram cloud STT as mandatory path for iOS |
| OpenClaw protocol changes | Medium | Medium | Sidecar decoupling; only proxy needs update |
| WebRTC connection reliability | Medium | Low | TURN fallback + reconnection state machine |
| Skill supply chain attacks | Medium | Low | Trust levels + permission sandbox + security scanning |
| Community adoption slow | High | Medium | Developer-friendly open source; rich documentation; quick-start guides |

---

## 10. References

### OpenClaw
- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw Gateway Protocol](https://docs.openclaw.ai/gateway/protocol)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Architecture (DeepWiki)](https://deepwiki.com/openclaw/openclaw)
- [ClawHub Skill Registry](https://github.com/openclaw/clawhub)

### A2UI
- [A2UI Official Site](https://a2ui.org/)
- [Google A2UI Announcement](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
- [A2UI GitHub](https://github.com/google/A2UI)
- [A2UI Bridge (React)](https://github.com/southleft/a2ui-bridge)

### Cloudflare
- [Cloudflare TURN Service](https://developers.cloudflare.com/realtime/turn/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

### Voice/STT
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Deepgram Nova-3](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api)
- [whisper.cpp WASM](https://github.com/ggml-org/whisper.cpp)

### MCP
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Apps](http://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [MCP Registry](https://github.com/modelcontextprotocol/registry)

---

*Document generated: 2026-02-11 | OpenClaw Web Client PRD v0.1.0*
