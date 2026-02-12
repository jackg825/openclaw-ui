// Chunking protocol
export interface ChunkEnvelope {
  _chunk: {
    id: string;
    seq: number;
    total: number;
  };
  _data: string;
}

// ── Pairing & Device Registration ──

export interface PairingSession {
  roomId: string;
  pairingCode: string;
  expiresAt: string;
}

export interface DeviceRegistration {
  userToken: string;
  deviceToken: string;
  stableRoomId: string;
}

export interface DeviceInfo {
  deviceToken: string;
  name: string;
  lastSeen: string;
  registeredAt: string;
}

export interface ReconnectResponse {
  stableRoomId: string;
  devices?: DeviceInfo[];
}

// ── WebSocket Signaling Protocol ──
// Messages exchanged via Durable Object (SignalingRoom) WebSocket connections

export interface WsJoin {
  type: 'join';
  roomId: string;
  peerId: string;
  role: 'client' | 'sidecar';
}

export interface WsOffer {
  type: 'offer';
  sdp: string;
  peerId?: string; // server → client: source peerId
}

export interface WsAnswer {
  type: 'answer';
  sdp: string;
  peerId?: string;
}

export interface WsIce {
  type: 'ice';
  candidate: RTCIceCandidateInit;
  peerId?: string;
}

export interface WsPeerJoined {
  type: 'peer-joined';
  peerId: string;
  role: 'client' | 'sidecar';
}

export interface WsPeerLeft {
  type: 'peer-left';
  peerId: string;
}

export interface WsError {
  type: 'error';
  message: string;
}

export type WsClientMessage = WsJoin | WsOffer | WsAnswer | WsIce;
export type WsServerMessage = WsOffer | WsAnswer | WsIce | WsPeerJoined | WsPeerLeft | WsError;

// TURN credentials
export interface TurnCredentials {
  iceServers: {
    urls: string[];
    username?: string;
    credential?: string;
  }[];
}
