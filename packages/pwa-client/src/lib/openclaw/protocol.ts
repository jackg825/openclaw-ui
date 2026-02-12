import type {
  OCRequest,
  OCFrame,
  ConnectParams,
  ConnectResult,
  AgentRunResult,
} from '@shared/openclaw-protocol';
import type { WebRTCConnectionManager } from '../webrtc/connection-manager';

const REQUEST_TIMEOUT = 30_000; // 30 seconds

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class OpenClawProtocol extends EventTarget {
  private connection: WebRTCConnectionManager;
  private pendingRequests = new Map<string, PendingRequest>();

  constructor(connection: WebRTCConnectionManager) {
    super();
    this.connection = connection;
    this.connection.onMessage(this.handleFrame.bind(this));
  }

  /** Send a request and wait for response */
  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = crypto.randomUUID();
    const frame: OCRequest = { type: 'req', id, method, params };

    console.debug('[protocol] Request', { method, id: id.slice(0, 8) });
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.debug('[protocol] Request timeout', { method, id: id.slice(0, 8) });
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.connection.send(JSON.stringify(frame));
    });
  }

  /** Perform connect handshake */
  async connect(params: ConnectParams): Promise<ConnectResult> {
    return this.request<ConnectResult>('connect', params as unknown as Record<string, unknown>);
  }

  /** Start an agent run */
  async agentRun(prompt: string, agentId?: string): Promise<AgentRunResult> {
    const params: Record<string, unknown> = { prompt };
    if (agentId) params.agentId = agentId;
    return this.request<AgentRunResult>('agent', params);
  }

  /** Resolve an approval request */
  async resolveApproval(runId: string, action: 'approve' | 'deny'): Promise<void> {
    return this.request('exec.approval.resolve', { runId, action });
  }

  /** Clean up pending requests */
  destroy(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Protocol destroyed'));
      this.pendingRequests.delete(id);
    }
    this.connection.offMessage(this.handleFrame.bind(this));
  }

  /** Handle incoming frames from the DataChannel */
  private handleFrame(raw: string): void {
    let frame: OCFrame;
    try {
      frame = JSON.parse(raw) as OCFrame;
    } catch {
      console.debug('[protocol] Frame parse error', { size: raw.length });
      return; // Ignore non-JSON messages
    }

    if (frame.type === 'res') {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        console.debug('[protocol] Response received', { id: frame.id.slice(0, 8), ok: frame.ok });
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          console.debug('[protocol] Response error', { id: frame.id.slice(0, 8), error: frame.error });
          pending.reject(frame.error ?? new Error('Unknown error'));
        }
      } else {
        console.debug('[protocol] Orphan response (no pending request)', { id: frame.id.slice(0, 8) });
      }
    } else if (frame.type === 'event') {
      console.debug('[protocol] Event received', { event: frame.event });
      this.dispatchEvent(new CustomEvent(frame.event, { detail: frame.payload }));
    }
  }
}
