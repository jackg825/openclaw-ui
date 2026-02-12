# Contributing to OpenClaw Web Client

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openclaw-ui.git
   cd openclaw-ui
   ```
3. **Install dependencies** (requires Node.js 22+ and pnpm 9+):
   ```bash
   corepack enable
   pnpm install
   ```
4. **Start development**:
   ```bash
   pnpm dev          # PWA at localhost:5173
   pnpm dev:sidecar  # Sidecar proxy (requires local OpenClaw gateway)
   pnpm dev:worker   # CF Worker signaling (via wrangler)
   ```

## Development Workflow

### Branch Naming

- `feat/description` -- New features
- `fix/description` -- Bug fixes
- `docs/description` -- Documentation changes
- `refactor/description` -- Code refactoring
- `test/description` -- Test additions or changes

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add skill search to store page
fix: handle WebRTC ICE restart on Safari
docs: update CONTRIBUTING.md with testing section
refactor: extract chunker into shared utility
test: add coverage for session router
```

## Architecture Overview

```
packages/
  shared-types/         # Pure TypeScript types (no runtime code)
  pwa-client/           # React 19 PWA -- main application
  sidecar-proxy/        # Node.js WebRTC-to-WebSocket bridge
  cf-worker-signaling/  # Cloudflare Worker signaling server
```

### Data Flow

```
Browser PWA -> WebRTC DataChannel -> Sidecar Proxy -> ws://127.0.0.1:18789 -> OpenClaw Gateway
```

### Key Libraries

- **React 19** + **TypeScript** -- UI framework
- **Vite 6** -- Build tool with PWA plugin
- **ShadCN/ui** (Radix + Tailwind CSS 4) -- UI primitives
- **Zustand 5** -- State management
- **react-router-dom 7** -- Client-side routing

## Adding A2UI Components

1. Create your component in `packages/pwa-client/src/components/a2ui/standard/` (for standard A2UI types) or `components/a2ui/openclaw/` (for OpenClaw-specific types)
2. Register it in `components/a2ui/registry.ts` using `registerWidget()`
3. Add tests in a co-located `.test.tsx` file
4. The component receives `WidgetProps` with `component`, `surface`, `dataModel`, and optional `children`

## Testing

### Running Tests

```bash
pnpm test             # All packages
pnpm test:e2e         # Playwright E2E tests (PWA only)

# Single file
pnpm --filter pwa-client exec vitest run src/lib/webrtc/chunker.test.ts
```

### Coverage Targets

| Area | Target |
|------|--------|
| Protocol, chunker, signaling | 90% |
| A2UI parser, stream splitter | 85% |
| Voice pipeline | 90% |
| Store catalog client | 80% |
| Cluster node manager, router | 85% |

### WebRTC Testing

WebRTC tests use mock stubs (`MockPeerConnection`, `MockDataChannel`). See `test-utils.tsx` for the custom render wrapper.

## PR Process

1. Create a branch from `main`
2. Make your changes and add tests
3. Ensure CI passes: `pnpm lint && pnpm typecheck && pnpm test`
4. Push to your fork and open a PR
5. Fill out the PR template
6. Wait for review -- maintainers aim to respond within 48 hours

### PR Requirements

- All CI checks pass (lint, typecheck, test, build)
- New features include tests
- Breaking changes are documented
- UI changes include screenshots or screen recordings

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Please be respectful and constructive in all interactions.

## Questions?

Open a [Discussion](https://github.com/jackg825/openclaw-ui/discussions) or join the community chat.
