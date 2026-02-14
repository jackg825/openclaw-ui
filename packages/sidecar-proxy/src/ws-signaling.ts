import WebSocket from 'ws';
import type { WsServerMessage } from '@openclaw/shared-types';

/**
 * WebSocket relay client for the sidecar proxy.
 * Connects to Durable Object SignalingRoom via CF Worker /ws endpoint.
 * In relay mode, the WS stays open for the entire session.
 */
export class WsSidecarSignaling {
  private ws: WebSocket | null = null;
  private handlers: ((msg: WsServerMessage) => void)[] = [];
  private disconnectHandlers: (() => void)[] = [];
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
    this.ws = new WebSocket(wsUrl);

    console.debug(`[ws-signaling] Connecting to ${wsUrl}`);
    await new Promise<void>((resolve, reject) => {
      this.ws!.on('open', () => {
        console.debug('[ws-signaling] WebSocket open, sending join', { room: this.roomId, peer: this.peerId });
        this.ws!.send(JSON.stringify({
          type: 'join',
          roomId: this.roomId,
          peerId: this.peerId,
          role: 'sidecar',
        }));
        resolve();
      });
      this.ws!.on('error', (err) => reject(err));
    });

    this.ws.on('message', (data) => {
      let msg: WsServerMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        console.warn('[ws-signaling] Malformed JSON message, ignoring', { size: data.toString().length });
        return;
      }

      console.debug('[ws-signaling] Received', { type: msg.type });
      for (const handler of this.handlers) {
        try {
          handler(msg);
        } catch (err) {
          console.error('[ws-signaling] Message handler error', {
            type: msg.type,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    });

    this.ws.on('close', (code) => {
      console.debug('[ws-signaling] WebSocket closed', { code });
      for (const handler of this.disconnectHandlers) handler();
    });

    this.ws.on('error', () => {
      console.debug('[ws-signaling] WebSocket error');
      for (const handler of this.disconnectHandlers) handler();
    });
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

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
    this.disconnectHandlers = [];
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.debug('[ws-signaling] Sending', { type: data.type });
      this.ws.send(JSON.stringify(data));
    } else {
      console.debug('[ws-signaling] Send skipped, WS not open', { type: data.type, readyState: this.ws?.readyState });
    }
  }
}
