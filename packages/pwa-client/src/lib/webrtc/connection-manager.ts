import type { WsServerMessage, TurnCredentials } from '@shared/webrtc-signaling';
import { MessageChunker } from './chunker';
import { DataChannelWrapper } from './data-channel';
import { ReconnectionManager } from './reconnection';
import { WsSignalingClient } from './ws-signaling-client';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

const STUN_SERVERS = ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'];

export class WebRTCConnectionManager extends EventTarget {
  private pc: RTCPeerConnection | null = null;
  private dc: DataChannelWrapper | null = null;
  private signaling: WsSignalingClient;
  private chunker = new MessageChunker();
  private reconnection = new ReconnectionManager();
  private state: ConnectionState = 'idle';
  private messageHandlers: ((message: string) => void)[] = [];
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
      await this.signaling.join();

      // 2. Get TURN credentials
      let turnCreds: TurnCredentials | null = null;
      try {
        turnCreds = await this.signaling.getTurnCredentials();
      } catch {
        // TURN not available — proceed with STUN only
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
      const rawDc = this.pc.createDataChannel('openclaw', { ordered: true });
      this.dc = new DataChannelWrapper(rawDc);
      this.dc.onMessage((msg) => this.handleRawMessage(msg));

      this.dc.addEventListener('open', () => {
        this.setState('connected');
        this.reconnection.reset();
        this.signaling.close();
        this.dispatchEvent(new Event('connected'));
      });

      this.dc.addEventListener('close', () => {
        this.handleDisconnect();
      });

      // 5. ICE candidate gathering
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
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
      await this.signaling.sendOffer(offer.sdp!);

      // 7. Listen for answer and ICE candidates
      this.signaling.onMessage((msg) => {
        this.handleSignalingMessage(msg);
      });
    } catch (err) {
      this.setState('failed');
      this.dispatchEvent(new CustomEvent('error', { detail: (err as Error).message }));
    }
  }

  send(message: string): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('DataChannel is not open');
    }
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
    this.state = state;
  }

  private handleRawMessage(raw: string): void {
    const assembled = this.chunker.receive(raw);
    if (assembled !== null) {
      for (const handler of this.messageHandlers) {
        handler(assembled);
      }
      this.dispatchEvent(new CustomEvent('message', { detail: assembled }));
    }
  }

  private handleSignalingMessage(msg: WsServerMessage): void {
    switch (msg.type) {
      case 'answer':
        if (this.pc) {
          this.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
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
