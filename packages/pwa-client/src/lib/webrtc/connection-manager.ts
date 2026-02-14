import type { WsServerMessage, WsErrorCode } from '@shared/webrtc-signaling';
import { MessageChunker } from './chunker';
import { ReconnectionManager } from './reconnection';
import { WsSignalingClient } from './ws-signaling-client';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

const HANDSHAKE_TIMEOUT = 30_000; // 30s — max wait for sidecar peer-joined

export class ConnectionManager extends EventTarget {
  private signaling: WsSignalingClient;
  private chunker = new MessageChunker();
  private reconnection = new ReconnectionManager();
  private state: ConnectionState = 'idle';
  private messageHandlers: ((message: string) => void)[] = [];
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private roomId: string;
  private signalingUrl: string;
  private peerId: string;
  private deviceToken: string | null;

  constructor(signalingUrl: string, roomId: string, deviceToken?: string | null) {
    super();
    this.roomId = roomId;
    this.signalingUrl = signalingUrl;
    this.deviceToken = deviceToken ?? null;
    this.peerId = crypto.randomUUID();
    this.signaling = new WsSignalingClient(signalingUrl, roomId, this.peerId, this.deviceToken);

    this.reconnection.addEventListener('exhausted', () => {
      this.setState('failed');
      this.dispatchEvent(new CustomEvent('error', { detail: 'Reconnection attempts exhausted' }));
    });
  }

  getState(): ConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') return;
    this.setState('connecting');

    try {
      // 1. Join the signaling room via WebSocket
      console.debug('[connection] Joining relay room', { room: this.roomId });
      await this.signaling.join();

      // 2. Listen for messages from DO
      this.signaling.onMessage((msg: WsServerMessage) => {
        switch (msg.type) {
          case 'peer-joined':
            // Sidecar connected → ready to exchange data
            if (msg.role === 'sidecar') {
              console.debug('[connection] Sidecar peer joined');
              this.clearHandshakeTimer();
              this.setState('connected');
              this.reconnection.reset();
              this.dispatchEvent(new Event('connected'));
            }
            break;
          case 'relay':
            // Data from sidecar → chunk reassembly
            this.handleRawMessage(msg.data);
            break;
          case 'peer-left':
            console.debug('[connection] Peer left');
            this.handleDisconnect(undefined);
            break;
        }
      });

      // 3. Detect WS drop → reconnection
      this.signaling.onDisconnect((reason) => this.handleDisconnect(reason));

      // 4. Handshake timeout (30s)
      this.handshakeTimer = setTimeout(() => {
        if (this.state === 'connecting') {
          console.debug('[connection] Handshake timeout');
          this.handleDisconnect();
        }
      }, HANDSHAKE_TIMEOUT);
    } catch (err) {
      this.setState('failed');
      this.dispatchEvent(new CustomEvent('error', { detail: (err as Error).message }));
    }
  }

  send(message: string): void {
    if (!this.signaling.isOpen) {
      throw new Error('WebSocket relay is not open');
    }
    console.debug('[connection] Sending message', { size: message.length });
    const chunks = this.chunker.split(message);
    for (const chunk of chunks) {
      this.signaling.sendRelay(chunk);
    }
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: (message: string) => void): void {
    this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
  }

  disconnect(): void {
    this.clearHandshakeTimer();
    this.reconnection.cancel();
    this.signaling.close();
    this.chunker.clear();
    this.setState('idle');
    this.dispatchEvent(new Event('disconnected'));
  }

  private setState(state: ConnectionState): void {
    const from = this.state;
    this.state = state;
    console.debug('[connection] State transition', { from, to: state });
  }

  private clearHandshakeTimer(): void {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  private handleRawMessage(raw: string): void {
    const assembled = this.chunker.receive(raw);
    if (assembled !== null) {
      console.debug('[connection] Message received', { size: assembled.length });
      for (const handler of this.messageHandlers) {
        handler(assembled);
      }
      this.dispatchEvent(new CustomEvent('message', { detail: assembled }));
    }
  }

  private handleDisconnect(reason?: { code: WsErrorCode; retryAfter?: number }): void {
    if (this.state === 'reconnecting' || this.state === 'idle') return;
    console.debug('[connection] Disconnect detected', { from: this.state, reason });

    // Permanent errors — no retry
    if (reason?.code === 'blocked') {
      this.setState('failed');
      this.dispatchEvent(new CustomEvent('error', { detail: { message: 'Connection blocked', code: reason.code } }));
      return;
    }

    this.setState('reconnecting');
    this.dispatchEvent(new Event('reconnecting'));
    this.chunker.clear();

    // Rate-limited — use server-specified delay
    if (reason?.code === 'rate-limited' && reason.retryAfter) {
      setTimeout(() => {
        this.reconnection.schedule(async () => {
          try {
            this.signaling.close();
            this.signaling = new WsSignalingClient(this.signalingUrl, this.roomId, this.peerId, this.deviceToken);
            await this.connect();
            return this.state === 'connected';
          } catch {
            return false;
          }
        });
      }, reason.retryAfter);
      return;
    }

    this.reconnection.schedule(async () => {
      try {
        this.signaling.close();

        // Fresh signaling client for reconnection
        this.signaling = new WsSignalingClient(this.signalingUrl, this.roomId, this.peerId, this.deviceToken);
        await this.connect();
        return this.state === 'connected';
      } catch {
        return false;
      }
    });
  }
}
