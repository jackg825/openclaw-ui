# OpenClaw Web Client — Development Guidelines

This document defines coding standards, architectural patterns, and conventions for the OpenClaw Web Client project.

---

## 1. Project Principles

1. **Zero-intrusion** — Never require modifications to the OpenClaw Gateway. All bridging happens in the sidecar proxy.
2. **Offline-first** — PWA must be installable and functional (cached UI) even without a gateway connection.
3. **Accessibility** — WCAG 2.2 AA compliance. All interactive elements keyboard-navigable, ARIA-labeled.
4. **Performance** — Initial bundle under 200 KB gzipped. Lazy-load heavy dependencies (Monaco, xterm.js).
5. **Type safety** — `strict: true` TypeScript everywhere. No `any` unless interfacing with untyped externals.

---

## 2. Monorepo Conventions

### Package Boundaries

| Package | Runtime | Can Import |
|---------|---------|------------|
| `shared-types` | None (pure types) | Nothing |
| `pwa-client` | Browser | `shared-types` |
| `sidecar-proxy` | Node.js | `shared-types` |
| `cf-worker-signaling` | Cloudflare Worker | `shared-types` |

Cross-package imports use workspace references:

```typescript
// In pwa-client (via path alias)
import type { OCFrame } from '@shared/openclaw-protocol';

// In sidecar-proxy / cf-worker-signaling (via workspace)
import type { ChunkEnvelope } from '@openclaw/shared-types';
```

### Path Aliases (pwa-client only)

```
@/      → packages/pwa-client/src/
@shared/ → packages/shared-types/src/
```

Defined in both `tsconfig.json` (for TypeScript) and `vite.config.ts` (for Vite).

---

## 3. TypeScript Standards

### Strict Configuration

```json
{
  "strict": true,
  "isolatedModules": true,
  "forceConsistentCasingInFileNames": true,
  "skipLibCheck": true
}
```

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files (components) | PascalCase.tsx | `ChatView.tsx` |
| Files (lib/utils) | kebab-case.ts | `connection-manager.ts` |
| Files (stores) | kebab-case.ts | `connection.ts` |
| Files (tests) | match source + `.test.ts(x)` | `chunker.test.ts` |
| Interfaces/Types | PascalCase | `ConnectionState` |
| Zustand stores | `use{Name}Store` | `useConnectionStore` |
| React hooks | `use{Name}` | `useOpenClaw` |
| Constants | UPPER_SNAKE_CASE | `MAX_CHUNK_SIZE` |
| Event names | kebab-case strings | `'node-status-changed'` |

### Export Patterns

```typescript
// Named exports (preferred for libraries)
export class MessageChunker { ... }
export const MAX_CHUNK_SIZE = 64 * 1024;

// Default export only for React page/layout components
export default function ChatPage() { ... }

// Re-export from index files
export * from './openclaw-protocol';
```

### Avoid

- `any` — use `unknown` + type guards
- `enum` — use union types or `as const` objects
- Non-null assertion `!` — use optional chaining or proper checks
- Barrel files deeper than package root `index.ts`

---

## 4. React Patterns

### Component Structure

```typescript
// 1. Imports (external → internal → types)
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../registry';

// 2. Component (named export for library, default for pages)
export function MyComponent({ component, dataModel }: WidgetProps) {
  // 3. Hooks at the top
  const store = useConnectionStore();
  const [local, setLocal] = useState('');

  // 4. Derived values
  const isReady = store.status === 'connected';

  // 5. Handlers
  const handleClick = () => { ... };

  // 6. Render
  return <div>...</div>;
}
```

### State Management (Zustand 5)

One store per domain in `src/stores/`:

```typescript
import { create } from 'zustand';

interface MyState {
  // State
  items: Item[];
  loading: boolean;
  // Actions
  addItem: (item: Item) => void;
  reset: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  items: [],
  loading: false,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  reset: () => set({ items: [], loading: false }),
}));
```

**Rules:**
- Stores are flat — no nested state objects
- Actions live inside the store, not in components
- Use `persist` middleware only for `settings.ts` (user preferences)
- Return stable references from selectors (avoid creating new objects per call)

### Hooks

Custom hooks in `src/hooks/` bridge stores and libraries:

```typescript
export function useOpenClaw() {
  const { status, setStatus } = useConnectionStore();
  // ... manage ConnectionManager + Protocol lifecycle
  return { status, connect, disconnect, sendMessage };
}
```

**Rules:**
- Hooks return objects, not arrays (for named destructuring)
- Clean up subscriptions/timers in `useEffect` return
- Don't call hooks conditionally

---

## 5. Styling (Tailwind CSS 4 + ShadCN/ui)

### Theme

Dark theme (slate-based) as default. CSS custom properties in `src/index.css`:

```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  /* ... */
}
```

### ShadCN/ui Components

All base UI primitives live in `src/components/ui/`. Follow standard ShadCN patterns:

```typescript
import { cn } from '@/lib/utils';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
```

### Tailwind Rules

- Use `cn()` helper (clsx + tailwind-merge) for conditional classes
- Prefer Tailwind utilities over custom CSS
- Responsive breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Mobile-first: sidebar collapses below `md:`

---

## 6. WebRTC Conventions

### Message Chunking

All messages over DataChannel must pass through `MessageChunker`:

```typescript
const chunks = chunker.split(largeMessage);   // → string[]
const assembled = chunker.receive(chunkStr);   // → string | null
```

- Chunk size: **64 KiB** (safe for Chrome, Safari, Firefox)
- Format: `{ _chunk: { id, seq, total }, _data: string }`
- Non-chunked messages pass through unchanged

### Connection State Machine

```
disconnected → signaling → connecting → authenticating → connected
                                                            │
                                                            ▼
                                                        reconnecting → failed
                                                            │
                                                            ▼
                                                        (retry with backoff)
```

### Reconnection Strategy

1. ICE restart on existing PeerConnection
2. If fails: new PeerConnection + full renegotiation
3. If fails: exponential backoff (1s → 2s → 4s → ... → 30s max, 10 attempts)

---

## 7. A2UI Widget Development

### Creating a New Widget

1. Create component file:

```typescript
// src/components/a2ui/standard/MyWidget.tsx
import { resolveBindings } from '@/lib/a2ui/adapter';
import type { WidgetProps } from '../registry';

export function A2UIMyWidget({ component, dataModel, children }: WidgetProps) {
  const props = resolveBindings(component, dataModel);
  return <div>{props.label}{children}</div>;
}
```

2. Register in `registry.ts`:

```typescript
import { A2UIMyWidget } from './standard/MyWidget';
registerWidget('MyWidget', A2UIMyWidget);
```

3. Add test:

```typescript
// src/components/a2ui/standard/MyWidget.test.tsx
import { render, screen } from '@/test-utils';
// ...
```

### Widget Props Resolution

Widgets receive raw `A2UIComponent` props. Use `resolveBindings()` to evaluate data model bindings:

```typescript
// component.props = { label: "Static" }
// component.bindings = { value: "form.name" }
// dataModel = { form: { name: "John" } }

const resolved = resolveBindings(component, dataModel);
// → { label: "Static", value: "John" }
```

### Unknown Types

Unknown A2UI component types render as `FallbackWidget` — a dashed gray box showing the type name. Never throw on unknown types.

---

## 8. Testing Standards

### Test Structure

```
packages/pwa-client/
  vitest.config.ts          # jsdom environment, path aliases, coverage
  src/
    test-setup.ts           # @testing-library/jest-dom matchers
    test-utils.tsx           # Custom render with BrowserRouter wrapper
    lib/
      webrtc/
        chunker.test.ts     # Unit tests
      a2ui/
        parser.test.ts      # Unit tests
    components/
      a2ui/
        A2UISurface.test.tsx # Component tests
```

### Running Tests

```bash
# All packages
pnpm test

# Single package
pnpm --filter pwa-client exec vitest run

# Single file
pnpm --filter pwa-client exec vitest run src/lib/webrtc/chunker.test.ts

# Watch mode (re-runs on file changes)
pnpm --filter pwa-client exec vitest

# With coverage
pnpm --filter pwa-client exec vitest run --coverage
```

### Coverage Targets

| Module | Target | Rationale |
|--------|--------|-----------|
| `lib/webrtc/chunker.ts` | 100% | Core data integrity |
| `lib/openclaw/protocol.ts` | 90% | Request/response correctness |
| `lib/a2ui/parser.ts` | 85% | JSONL parsing edge cases |
| `lib/a2ui/stream-splitter.ts` | 85% | Fence detection across chunks |
| `lib/store/*` | 80% | API client with network boundaries |
| `lib/cluster/*` | 85% | Routing correctness |

### Writing Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MessageChunker } from './chunker';

describe('MessageChunker', () => {
  it('passes through small messages unchanged', () => {
    const chunker = new MessageChunker();
    const result = chunker.split('hello');
    expect(result).toEqual(['hello']);
  });

  it('splits large messages into chunks', () => {
    const chunker = new MessageChunker();
    const large = 'x'.repeat(128 * 1024); // 128 KiB
    const chunks = chunker.split(large);
    expect(chunks.length).toBe(2);
  });
});
```

### Writing Component Tests

```typescript
import { render, screen } from '@/test-utils'; // Custom render with router
import { ChatView } from './ChatView';

describe('ChatView', () => {
  it('renders messages', () => {
    // Set up store state
    useChatStore.setState({ messages: [{ id: '1', role: 'user', content: 'hello', timestamp: Date.now() }] });

    render(<ChatView />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

### WebRTC Mocking

```typescript
class MockPeerConnection {
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
}

// In test setup
vi.stubGlobal('RTCPeerConnection', MockPeerConnection);
```

### What NOT to Test

- ShadCN/ui base components (tested upstream by Radix)
- Zustand store internals (test through components that use them)
- CSS styling (use visual regression tests via Playwright instead)

---

## 9. CI/CD Pipeline

### GitHub Actions

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | push, PR | lint → typecheck → test → build |
| `deploy-preview.yml` | PR | Build + deploy to CF Pages preview |
| `deploy-production.yml` | push to main | Build + deploy PWA to CF Pages + deploy Worker |

### Pre-commit Checklist

Before pushing:

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript compiler
pnpm test          # Vitest (52 tests)
pnpm -r build      # Full build
```

---

## 10. Cloudflare Deployment

### Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Pages | `openclaw-ui` | PWA static hosting |
| Worker | `openclaw-signaling` | HTTP-polling signaling server |
| R2 Bucket | `openclaw-signaling` | Ephemeral SDP/ICE storage |
| TURN | Cloudflare TURN API | WebRTC relay (set as Worker secrets) |

### Worker Secrets

```bash
npx wrangler secret put TURN_KEY_ID      # Cloudflare TURN API key ID
npx wrangler secret put TURN_API_TOKEN   # Cloudflare TURN API token
npx wrangler secret put ROOM_SECRET      # Optional: room authentication
```

### Signaling API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/join` | POST | Register peer in room |
| `/offer` | POST | Store SDP offer |
| `/answer` | POST | Store SDP answer |
| `/ice` | POST | Store ICE candidate |
| `/poll` | GET | Retrieve pending messages |
| `/turn-creds` | POST | Generate TURN credentials |

---

## 11. Security

- **Device tokens** — AES-GCM encrypted in localStorage (`src/utils/crypto.ts`)
- **Room authentication** — Optional HMAC-based room tokens validated by Worker and sidecar
- **CORS** — Worker allows `*` origin (signaling is stateless); tighten for production
- **No secrets in client** — TURN credentials fetched on-demand via Worker; Deepgram keys never in PWA bundle
- **CSP** — Set `Content-Security-Policy` headers via CF Pages `_headers` file for production
- **Dependencies** — All MIT/Apache-2.0 licensed; audit with `pnpm audit`

---

## 12. Performance Budget

| Metric | Target |
|--------|--------|
| Initial JS bundle | < 200 KB gzipped |
| Time to Interactive | < 3s on 3G |
| Monaco Editor load | Lazy (not in critical path) |
| xterm.js load | Lazy (not in critical path) |
| WebRTC connection | < 5s (P2P), < 8s (TURN) |
| Reconnection | < 10s |
| Signaling poll | 1s active, 8s max idle |

---

*Guidelines v0.1.0 — OpenClaw Web Client*
