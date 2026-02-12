import type { WsServerMessage, TurnCredentials } from '@shared/webrtc-signaling';

/**
 * WebSocket signaling client for the browser PWA.
 * Connects to Durable Object SignalingRoom via CF Worker /ws endpoint.
 */
export class WsSignalingClient {
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
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error('WebSocket connection failed'));
    });

    this.ws.send(JSON.stringify({
      type: 'join',
      roomId: this.roomId,
      peerId: this.peerId,
      role: 'client',
    }));

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };
  }

  async sendOffer(sdp: string): Promise<void> {
    this.send({ type: 'offer', sdp });
  }

  async sendAnswer(sdp: string): Promise<void> {
    this.send({ type: 'answer', sdp });
  }

  async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.send({ type: 'ice', candidate });
  }

  async getTurnCredentials(): Promise<TurnCredentials> {
    const res = await fetch(`${this.baseUrl}/turn-creds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId }),
    });
    if (!res.ok) throw new Error(`TURN creds failed: ${res.status}`);
    return res.json();
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
