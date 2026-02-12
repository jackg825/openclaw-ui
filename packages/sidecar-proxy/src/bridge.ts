import type { DataChannel } from 'node-datachannel';
import WebSocket from 'ws';
import { MessageChunker } from './chunker.js';

export class Bridge {
  private ws: WebSocket | null = null;
  private chunker = new MessageChunker();

  constructor(private gatewayUrl: string = 'ws://127.0.0.1:18789') {}

  /** Bridge a DataChannel to the local OpenClaw Gateway */
  attach(dc: DataChannel): void {
    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.on('open', () => {
      console.log(`[bridge] Connected to gateway at ${this.gatewayUrl}`);
    });

    // DataChannel -> WebSocket (reassemble chunks, forward)
    dc.onMessage((msg) => {
      const str = typeof msg === 'string'
        ? msg
        : msg instanceof Buffer
          ? msg.toString('utf-8')
          : new TextDecoder().decode(msg);
      const assembled = this.chunker.receive(str);
      if (assembled && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(assembled);
      }
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

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
