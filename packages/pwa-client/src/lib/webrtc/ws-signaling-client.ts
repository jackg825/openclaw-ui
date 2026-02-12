import type { WsServerMessage, TurnCredentials } from '@shared/webrtc-signaling';

/**
 * WebSocket signaling client for the browser PWA.
 * Connects to Durable Object SignalingRoom via CF Worker /ws endpoint.
 */
export class WsSignalingClient {
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
        for (const handler of this.handlers) {
          handler(msg);
        }
      } catch {
        console.debug('[signaling] Malformed message, ignoring');
      }
    };

    this.ws.onclose = (event) => {
      console.debug('[signaling] WebSocket closed', { code: event.code });
      for (const handler of this.disconnectHandlers) handler();
    };

    this.ws.onerror = () => {
      console.debug('[signaling] WebSocket error');
      for (const handler of this.disconnectHandlers) handler();
    };
  }

  async sendOffer(sdp: string): Promise<void> {
    console.debug('[signaling] Sending offer', { sdpLength: sdp.length });
    this.send({ type: 'offer', sdp });
  }

  async sendAnswer(sdp: string): Promise<void> {
    console.debug('[signaling] Sending answer', { sdpLength: sdp.length });
    this.send({ type: 'answer', sdp });
  }

  async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    this.send({ type: 'ice', candidate });
  }

  async getTurnCredentials(): Promise<TurnCredentials> {
    console.debug('[signaling] Fetching TURN credentials');
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
    return res.json();
  }

  onMessage(handler: (msg: WsServerMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  close(): void {
    console.debug('[signaling] Closing');
    this.ws?.close();
    this.ws = null;
    this.handlers = [];
    this.disconnectHandlers = [];
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.debug('[signaling] Send skipped, WS not open', { type: data.type, readyState: this.ws?.readyState });
    }
  }
}
