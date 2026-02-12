import WebSocket from 'ws';
import type { WsServerMessage, TurnCredentials } from '@openclaw/shared-types';

/**
 * WebSocket signaling client for the sidecar proxy.
 * Connects to Durable Object SignalingRoom via CF Worker /ws endpoint.
 */
export class WsSidecarSignaling {
  private ws: WebSocket | null = null;
  private handlers: ((msg: WsServerMessage) => void)[] = [];
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

    await new Promise<void>((resolve, reject) => {
      this.ws!.on('open', () => {
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
      try {
        const msg: WsServerMessage = JSON.parse(data.toString());
        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    });
  }

  async sendAnswer(sdp: string): Promise<void> {
    this.send({ type: 'answer', sdp });
  }

  async sendIceCandidate(candidate: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null }): Promise<void> {
    this.send({ type: 'ice', candidate });
  }

  async getTurnCredentials(): Promise<TurnCredentials> {
    const res = await fetch(`${this.baseUrl}/turn-creds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId }),
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try {
        const body = await res.json() as { error?: string };
        if (body.error) detail = `${res.status}: ${body.error}`;
      } catch { /* ignore parse failure */ }
      throw new Error(`TURN creds failed (${detail})`);
    }
    return res.json() as Promise<TurnCredentials>;
  }

  onMessage(handler: (msg: WsServerMessage) => void): void {
    this.handlers.push(handler);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
