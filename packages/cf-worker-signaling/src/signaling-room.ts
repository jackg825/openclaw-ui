import { DurableObject } from 'cloudflare:workers';
import type { Env } from './types.js';
import type { WsClientMessage, WsErrorCode } from '@openclaw/shared-types';

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 1_000;
const RATE_LIMIT_MAX_MSGS = 100;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KiB
const MAX_VIOLATIONS = 5;

interface PeerAttachment {
  peerId: string;
  role: 'client' | 'sidecar';
  roomId: string;
  msgCount: number;
  windowStart: number;
  violations: number;
}

export class SignalingRoom extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Auto-respond to ping frames — keeps connection alive during hibernation
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Enforce max 2 peers per room (1 client + 1 sidecar)
    const MAX_PEERS = 2;
    if (this.ctx.getWebSockets().length >= MAX_PEERS) {
      return new Response(
        JSON.stringify({ error: 'Room is full (max 2 peers)' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept with hibernation (zero cost while idle)
    this.ctx.acceptWebSocket(server);

    // Schedule cleanup alarm (10 min)
    await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);

    let msg: WsClientMessage;
    try {
      msg = JSON.parse(text);
    } catch {
      this.sendError(ws, 'invalid-message', 'Invalid JSON');
      return;
    }

    switch (msg.type) {
      case 'join': {
        // Store peer info on the WebSocket
        ws.serializeAttachment({
          peerId: msg.peerId,
          role: msg.role,
          roomId: msg.roomId,
          msgCount: 0,
          windowStart: Date.now(),
          violations: 0,
        } satisfies PeerAttachment);

        // Notify existing peers about the new joiner
        this.broadcastExcept(ws, JSON.stringify({
          type: 'peer-joined',
          peerId: msg.peerId,
          role: msg.role,
        }));

        // Send existing peers to the new joiner
        for (const peer of this.ctx.getWebSockets()) {
          if (peer === ws) continue;
          const att = peer.deserializeAttachment() as PeerAttachment | null;
          if (att) {
            ws.send(JSON.stringify({
              type: 'peer-joined',
              peerId: att.peerId,
              role: att.role,
            }));
          }
        }
        break;
      }

      case 'relay': {
        const att = ws.deserializeAttachment() as PeerAttachment | null;
        if (!att) {
          this.sendError(ws, 'not-joined', 'Must join before sending relay data');
          return;
        }

        // L3: Payload size check
        const byteLength = typeof message === 'string'
          ? new TextEncoder().encode(message as string).byteLength
          : (message as ArrayBuffer).byteLength;
        if (byteLength > MAX_PAYLOAD_BYTES) {
          this.sendError(ws, 'payload-too-large', `Message exceeds ${MAX_PAYLOAD_BYTES} byte limit`);
          return;
        }

        // L3: Sliding window rate limit
        const now = Date.now();
        if (now - att.windowStart > RATE_LIMIT_WINDOW_MS) {
          att.msgCount = 0;
          att.windowStart = now;
        }

        if (att.msgCount >= RATE_LIMIT_MAX_MSGS) {
          att.violations++;
          const windowRemaining = RATE_LIMIT_WINDOW_MS - (now - att.windowStart);
          this.sendError(ws, 'rate-limited', 'Rate limit exceeded', windowRemaining);
          ws.serializeAttachment(att);

          if (att.violations >= MAX_VIOLATIONS) {
            ws.close(1008, 'Rate limit exceeded');
          }
          return;
        }

        att.msgCount++;
        ws.serializeAttachment(att);

        // Forward raw text to the other peer — DO does not inspect relay content
        this.broadcastExcept(ws, text);
        break;
      }
    }

    // Reset cleanup alarm on activity
    await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean): Promise<void> {
    const att = ws.deserializeAttachment() as PeerAttachment | null;
    if (att) {
      this.broadcastExcept(ws, JSON.stringify({
        type: 'peer-left',
        peerId: att.peerId,
      }));
    }
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    ws.close(1011, 'WebSocket error');
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) {
      // No active connections — clean up storage so DO can be evicted
      await this.ctx.storage.deleteAll();
    } else {
      // Reschedule while connections exist
      await this.ctx.storage.setAlarm(Date.now() + 10 * 60 * 1000);
    }
  }

  private sendError(ws: WebSocket, code: WsErrorCode, message: string, retryAfter?: number): void {
    const error: { type: 'error'; message: string; code: WsErrorCode; retryAfter?: number } = {
      type: 'error', message, code,
    };
    if (retryAfter !== undefined) error.retryAfter = retryAfter;
    ws.send(JSON.stringify(error));
  }

  private broadcastExcept(sender: WebSocket, message: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender) {
        try {
          ws.send(message);
        } catch {
          // Peer already disconnected
        }
      }
    }
  }
}
