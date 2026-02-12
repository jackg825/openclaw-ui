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
      try {
        const msg: WsServerMessage = JSON.parse(data.toString());
        console.debug('[ws-signaling] Received', { type: msg.type });
        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        console.debug('[ws-signaling] Malformed message, ignoring', { size: data.toString().length });
      }
    });

    this.ws.on('close', (code) => {
      console.debug('[ws-signaling] WebSocket closed', { code });
    });
  }

  async sendAnswer(sdp: string): Promise<void> {
    this.send({ type: 'answer', sdp });
  }

  async sendIceCandidate(candidate: { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null }): Promise<void> {
    this.send({ type: 'ice', candidate });
  }

  async getTurnCredentials(): Promise<TurnCredentials> {
    console.debug('[ws-signaling] Fetching TURN credentials');
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
      console.debug('[ws-signaling] Sending', { type: data.type });
      this.ws.send(JSON.stringify(data));
    } else {
      console.debug('[ws-signaling] Send skipped, WS not open', { type: data.type, readyState: this.ws?.readyState });
    }
  }
}
