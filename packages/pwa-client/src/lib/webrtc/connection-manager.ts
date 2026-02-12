import type { WsServerMessage, TurnCredentials } from '@shared/webrtc-signaling';
import { MessageChunker } from './chunker';
import { DataChannelWrapper } from './data-channel';
import { ReconnectionManager } from './reconnection';
import { WsSignalingClient } from './ws-signaling-client';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

const STUN_SERVERS = ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'];
const HANDSHAKE_TIMEOUT = 30_000; // 30s — max wait for offer→answer→DC open

export class WebRTCConnectionManager extends EventTarget {
  private pc: RTCPeerConnection | null = null;
  private dc: DataChannelWrapper | null = null;
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
      console.debug('[webrtc] Joining signaling room', { room: this.roomId });
      await this.signaling.join();

      // 2. Get TURN credentials
      let turnCreds: TurnCredentials | null = null;
      try {
        turnCreds = await this.signaling.getTurnCredentials();
        console.debug('[webrtc] TURN credentials received', { servers: turnCreds.iceServers?.length ?? 0 });
      } catch {
        console.debug('[webrtc] TURN not available, using STUN only');
      }

      // 3. Create RTCPeerConnection
      const iceServers: RTCIceServer[] = [{ urls: STUN_SERVERS }];
      if (turnCreds?.iceServers) {
        for (const server of turnCreds.iceServers) {
          iceServers.push(server);
        }
      }
      this.pc = new RTCPeerConnection({ iceServers });

      // 4. Create DataChannel
      console.debug('[webrtc] Creating DataChannel "openclaw"');
      const rawDc = this.pc.createDataChannel('openclaw', { ordered: true });
      this.dc = new DataChannelWrapper(rawDc);
      this.dc.onMessage((msg) => this.handleRawMessage(msg));

      this.dc.addEventListener('open', () => {
        console.debug('[webrtc] DataChannel opened');
        this.clearHandshakeTimer();
        this.setState('connected');
        this.reconnection.reset();
        this.signaling.close();
        this.dispatchEvent(new Event('connected'));
      });

      this.dc.addEventListener('close', () => {
        console.debug('[webrtc] DataChannel closed');
        this.handleDisconnect();
      });

      // 5. ICE candidate gathering
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.debug('[webrtc] Local ICE candidate', { type: event.candidate.type, protocol: event.candidate.protocol });
          this.signaling.sendIceCandidate(event.candidate.toJSON()).catch(() => {});
        }
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
          this.handleDisconnect();
        }
      };

      // 6. Create and send offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.debug('[webrtc] Offer created and sent', { sdpLength: offer.sdp?.length });
      await this.signaling.sendOffer(offer.sdp!);

      // 7. Listen for answer and ICE candidates
      this.signaling.onMessage((msg) => {
        this.handleSignalingMessage(msg);
      });

      // 8. Detect signaling WebSocket drop (e.g., DO hibernation cleanup)
      this.signaling.onDisconnect(() => {
        if (this.state === 'connecting') {
          this.handleDisconnect();
        }
      });

      // 9. Handshake timeout — if DC doesn't open within 30s, treat as failure
      this.handshakeTimer = setTimeout(() => {
        if (this.state === 'connecting') {
          this.handleDisconnect();
        }
      }, HANDSHAKE_TIMEOUT);
    } catch (err) {
      this.setState('failed');
      this.dispatchEvent(new CustomEvent('error', { detail: (err as Error).message }));
    }
  }

  send(message: string): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('DataChannel is not open');
    }
    console.debug('[webrtc] Sending message', { size: message.length });
    const chunks = this.chunker.split(message);
    for (const chunk of chunks) {
      this.dc.send(chunk);
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
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
    this.chunker.clear();
    this.setState('idle');
    this.dispatchEvent(new Event('disconnected'));
  }

  private setState(state: ConnectionState): void {
    const from = this.state;
    this.state = state;
    console.debug('[webrtc] State transition', { from, to: state });
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
      console.debug('[webrtc] Message received', { size: assembled.length });
      for (const handler of this.messageHandlers) {
        handler(assembled);
      }
      this.dispatchEvent(new CustomEvent('message', { detail: assembled }));
    }
  }

  private async handleSignalingMessage(msg: WsServerMessage): Promise<void> {
    console.debug('[webrtc] Signaling message', { type: msg.type });
    switch (msg.type) {
      case 'answer':
        if (this.pc) {
          try {
            console.debug('[webrtc] Setting remote answer', { sdpLength: msg.sdp.length });
            await this.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
          } catch {
            this.handleDisconnect();
          }
        }
        break;
      case 'ice':
        if (this.pc) {
          this.pc.addIceCandidate(msg.candidate).catch(() => {});
        }
        break;
    }
  }

  private handleDisconnect(): void {
    if (this.state === 'reconnecting' || this.state === 'idle') return;
    console.debug('[webrtc] Disconnect detected, scheduling reconnection', { from: this.state });

    this.setState('reconnecting');
    this.dispatchEvent(new Event('reconnecting'));
    this.chunker.clear();

    this.reconnection.schedule(async () => {
      try {
        this.dc?.close();
        this.pc?.close();
        this.dc = null;
        this.pc = null;

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
