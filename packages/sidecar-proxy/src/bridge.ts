import type { DataChannel } from 'node-datachannel';
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { MessageChunker } from './chunker.js';

const INTERNAL_TYPES = new Set(['device-registration', 'device-registration-ack']);

export class Bridge {
  private ws: WebSocket | null = null;
  private chunker = new MessageChunker();

  constructor(private gatewayUrl: string = 'ws://127.0.0.1:18789') {}

  /**
   * Bridge a DataChannel to the local OpenClaw Gateway.
   * NOTE: Does NOT set dc.onMessage — caller must wire that up
   * and call handleDataChannelMessage() from the single callback.
   */
  attach(dc: DataChannel): void {
    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.on('open', () => {
      console.log(`[bridge] Connected to gateway at ${this.gatewayUrl}`);
      this.sendConnectHandshake();
    });

    // WebSocket -> DataChannel (chunk if large, forward)
    this.ws.on('message', (data: WebSocket.RawData) => {
      const str = data.toString('utf-8');
      const chunks = this.chunker.split(str);
      for (const chunk of chunks) {
        dc.sendMessage(chunk);
      }
    });

    // Lifecycle
    dc.onClosed(() => {
      console.log('[bridge] DataChannel closed');
      this.ws?.close();
    });

    this.ws.on('close', () => {
      console.log('[bridge] WebSocket closed');
      dc.close();
    });

    this.ws.on('error', (err: Error) => {
      console.error('[bridge] WebSocket error:', err.message);
      dc.close();
    });
  }

  /**
   * Process a message received from the DataChannel.
   * Reassembles chunks and forwards protocol messages to the gateway.
   * @returns true if consumed (forwarded or chunk-in-progress), false if internal (caller should handle).
   */
  handleDataChannelMessage(raw: string | Buffer | ArrayBuffer): boolean {
    const text = typeof raw === 'string'
      ? raw
      : raw instanceof Buffer
        ? raw.toString('utf-8')
        : new TextDecoder().decode(raw);

    const assembled = this.chunker.receive(text);
    if (assembled === null) return true; // chunk in progress

    // Check for internal pairing messages — don't forward to gateway
    try {
      const parsed = JSON.parse(assembled);
      if (parsed.type && INTERNAL_TYPES.has(parsed.type)) {
        return false;
      }
    } catch {
      // Not JSON — forward as-is
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(assembled);
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
  }
}
