import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { MessageChunker } from './chunker.js';
import type { WsSidecarSignaling } from './ws-signaling.js';

const INTERNAL_TYPES = new Set(['device-registration', 'device-registration-ack']);

export class Bridge {
  private ws: WebSocket | null = null;
  private chunker = new MessageChunker();
  private signaling: WsSidecarSignaling | null = null;

  constructor(private gatewayUrl: string = 'ws://127.0.0.1:18789') {}

  /**
   * Bridge the WS relay signaling to the local OpenClaw Gateway.
   * Gateway WS messages are chunked and sent via signaling.sendRelay().
   */
  attach(signaling: WsSidecarSignaling): void {
    this.signaling = signaling;
    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.on('open', () => {
      console.log(`[bridge] Connected to gateway at ${this.gatewayUrl}`);
      this.sendConnectHandshake();
    });

    // Gateway → relay (chunk if large, forward to browser via DO)
    this.ws.on('message', (data: WebSocket.RawData) => {
      const str = data.toString('utf-8');
      console.debug('[bridge] GW→relay', { size: str.length });
      const chunks = this.chunker.split(str);
      for (const chunk of chunks) {
        signaling.sendRelay(chunk);
      }
    });

    this.ws.on('close', () => {
      console.log('[bridge] Gateway WebSocket closed');
    });

    this.ws.on('error', (err: Error) => {
      console.error('[bridge] Gateway WebSocket error:', err.message);
    });
  }

  /**
   * Process a relay message received from the browser (via DO).
   * Reassembles chunks and forwards protocol messages to the gateway.
   * @returns true if consumed (forwarded or chunk-in-progress), false if internal (caller should handle).
   */
  handleRelayMessage(data: string): boolean {
    const assembled = this.chunker.receive(data);
    if (assembled === null) return true; // chunk in progress

    // Check for internal pairing messages — don't forward to gateway
    try {
      const parsed = JSON.parse(assembled);
      if (parsed.type && INTERNAL_TYPES.has(parsed.type)) {
        console.debug('[bridge] Internal message intercepted', { type: parsed.type });
        return false;
      }
    } catch {
      // Not JSON — forward as-is
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.debug('[bridge] relay→GW', { size: assembled.length });
      this.ws.send(assembled);
    } else {
      console.debug('[bridge] relay→GW dropped, gateway not connected', { size: assembled.length });
    }
    return true;
  }

  private sendConnectHandshake(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const handshake = JSON.stringify({
      type: 'req',
      id: randomUUID(),
      method: 'connect',
      params: {
        role: 'node',
        scopes: ['agent', 'skill', 'exec'],
        device: {
          name: 'openclaw-sidecar',
          platform: process.platform,
          version: '0.1.0',
        },
        minProtocol: 1,
        maxProtocol: 1,
      },
    });

    this.ws.send(handshake);
    console.log('[bridge] Sent connect handshake to gateway');
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.signaling = null;
  }
}
