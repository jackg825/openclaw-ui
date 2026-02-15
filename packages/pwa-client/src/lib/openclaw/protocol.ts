import type {
  OCRequest,
  OCFrame,
  ChatSendParams,
  TokenUsage,
  SessionInfo,
  GatewayEventMap,
} from '@shared/openclaw-protocol';

const REQUEST_TIMEOUT = 30_000; // 30s
const CHAT_SEND_TIMEOUT = 120_000; // 2min — chat.send waits for full turn

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

type EventHandler<T> = (payload: T) => void;

/**
 * Typed protocol layer for OpenClaw Gateway JSON-RPC.
 *
 * Uses typed on() instead of EventTarget for compile-time event safety.
 * Browser does NOT send connect handshake — sidecar handles auth.
 */
export class OpenClawProtocol {
  private sendFn: (data: string) => void;
  private pendingRequests = new Map<string, PendingRequest>();
  private listeners = new Map<string, Set<EventHandler<unknown>>>();

  constructor(sendFn: (data: string) => void) {
    this.sendFn = sendFn;
  }

  /** Subscribe to a typed Gateway event. Returns unsubscribe function. */
  on<E extends keyof GatewayEventMap>(
    event: E,
    handler: EventHandler<GatewayEventMap[E]>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const set = this.listeners.get(key)!;
    set.add(handler as EventHandler<unknown>);

    return () => {
      set.delete(handler as EventHandler<unknown>);
      if (set.size === 0) this.listeners.delete(key);
    };
  }

  /** Send a request and wait for response */
  async request<T>(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs = REQUEST_TIMEOUT,
  ): Promise<T> {
    const id = crypto.randomUUID();
    const frame: OCRequest = { type: 'req', id, method, params };

    console.debug('[protocol] Request', { method, id: id.slice(0, 8) });
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.debug('[protocol] Request timeout', { method, id: id.slice(0, 8) });
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.sendFn(JSON.stringify(frame));
    });
  }

  /** Send a chat message (chat.send RPC). Returns runId. */
  async chatSend(params: ChatSendParams): Promise<{ runId: string }> {
    return this.request<{ runId: string }>(
      'chat.send',
      params as unknown as Record<string, unknown>,
      CHAT_SEND_TIMEOUT,
    );
  }

  /** Abort a running chat turn */
  async chatAbort(runId: string): Promise<void> {
    return this.request('chat.abort', { runId });
  }

  /** List sessions */
  async sessionsList(limit?: number): Promise<{ sessions: SessionInfo[] }> {
    const params: Record<string, unknown> = {};
    if (limit != null) params.limit = limit;
    return this.request('sessions.list', params);
  }

  /** Get token usage for a session */
  async sessionsUsage(sessionKey: string): Promise<TokenUsage> {
    return this.request('sessions.usage', { sessionKey });
  }

  /** Resolve an approval request */
  async resolveApproval(
    runId: string,
    toolCallId: string,
    action: 'approve' | 'deny',
  ): Promise<void> {
    return this.request('exec.approval.resolve', { runId, toolCallId, action });
  }

  /** Handle an incoming raw frame (call from message handler) */
  handleFrame(raw: string): void {
    let frame: OCFrame;
    try {
      frame = JSON.parse(raw) as OCFrame;
    } catch {
      // Not JSON — silently skip (e.g. chunk envelope, relay control)
      return;
    }

    if (frame.type === 'res') {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        console.debug('[protocol] Response', { id: frame.id.slice(0, 8), ok: frame.ok });
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          pending.reject(frame.error ?? new Error('Unknown error'));
        }
      }
    } else if (frame.type === 'event') {
      const handlers = this.listeners.get(frame.event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(frame.payload);
          } catch (err) {
            console.error('[protocol] Event handler error', { event: frame.event, err });
          }
        }
      }
    }
  }

  /** Clean up pending requests and listeners */
  destroy(): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Protocol destroyed'));
    }
    this.pendingRequests.clear();
    this.listeners.clear();
  }
}
