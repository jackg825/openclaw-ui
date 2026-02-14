import type { WsServerMessage, WsErrorCode } from '@shared/webrtc-signaling';

/**
 * WebSocket relay client for the browser PWA.
 * Connects to Durable Object SignalingRoom via CF Worker /ws endpoint.
 * In relay mode, the WS stays open for the entire session (not just signaling).
 */
export class WsSignalingClient {
  private ws: WebSocket | null = null;
  private handlers: ((msg: WsServerMessage) => void)[] = [];
  private disconnectHandlers: ((reason?: { code: WsErrorCode; retryAfter?: number }) => void)[] = [];
  private errorHandlers: ((code: WsErrorCode, message: string, retryAfter?: number) => void)[] = [];
  private baseUrl: string;
  private roomId: string;
  private peerId: string;
  private deviceToken: string | null;

  constructor(baseUrl: string, roomId: string, peerId: string, deviceToken?: string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.roomId = roomId;
    this.peerId = peerId;
    this.deviceToken = deviceToken ?? null;
  }

  async join(): Promise<void> {
    let wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws?room=${encodeURIComponent(this.roomId)}`;
    if (this.deviceToken) {
      wsUrl += `&token=${encodeURIComponent(this.deviceToken)}`;
    }
    console.debug(`[signaling] Connecting to ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => {
        console.debug('[signaling] WebSocket open');
        resolve();
      };
      this.ws!.onerror = () => reject(new Error('WebSocket connection failed'));
    });

    console.debug('[signaling] Sending join', { room: this.roomId, peer: this.peerId });
    this.ws.send(JSON.stringify({
      type: 'join',
      roomId: this.roomId,
      peerId: this.peerId,
      role: 'client',
    }));

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        console.debug('[signaling] Received', { type: msg.type });

        // Detect structured WsError with code
        if (msg.type === 'error' && msg.code) {
          for (const handler of this.errorHandlers) {
            handler(msg.code, msg.message, msg.retryAfter);
          }
        }

        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        console.debug('[signaling] Malformed message, ignoring');
      }
    };

    this.ws.onclose = (event) => {
      console.debug('[signaling] WebSocket closed', { code: event.code });
      const reason = this.closeCodeToReason(event.code);
      for (const handler of this.disconnectHandlers) handler(reason);
    };

    this.ws.onerror = () => {
      console.debug('[signaling] WebSocket error');
      for (const handler of this.disconnectHandlers) handler(undefined);
    };
  }

  sendRelay(data: string): void {
    this.send({ type: 'relay', data });
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  onMessage(handler: (msg: WsServerMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: (reason?: { code: WsErrorCode; retryAfter?: number }) => void): void {
    this.disconnectHandlers.push(handler);
  }

  onError(handler: (code: WsErrorCode, message: string, retryAfter?: number) => void): void {
    this.errorHandlers.push(handler);
  }

  close(): void {
    console.debug('[signaling] Closing');
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
    this.disconnectHandlers = [];
    this.errorHandlers = [];
  }

  private closeCodeToReason(code: number): { code: WsErrorCode; retryAfter?: number } | undefined {
    switch (code) {
      case 1008: return { code: 'blocked' };
      case 1009: return { code: 'payload-too-large' };
      case 1013: return { code: 'rate-limited' };
      default: return undefined;
    }
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.debug('[signaling] Send skipped, WS not open', { type: data.type, readyState: this.ws?.readyState });
    }
  }
}
