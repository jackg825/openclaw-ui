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
  pairingCode?: string;
  pairingExpiresAt?: string;
}

// ── Security Error Codes ──

export type WsErrorCode =
  | 'rate-limited'      // Per-peer msg/s exceeded
  | 'payload-too-large' // Single message exceeds size limit
  | 'blocked'           // IP/device blocked
  | 'auth-failed'       // Device token invalid or expired
  | 'room-full'         // Room at max capacity
  | 'invalid-message'   // JSON parse failure
  | 'not-joined';       // Relay attempted before join

// ── WebSocket Signaling Protocol ──
// Messages exchanged via Durable Object (SignalingRoom) WebSocket connections

export interface WsJoin {
  type: 'join';
  roomId: string;
  peerId: string;
  role: 'client' | 'sidecar';
}

export interface WsRelay {
  type: 'relay';
  data: string;
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
  code?: WsErrorCode;
  retryAfter?: number;
}

export type WsClientMessage = WsJoin | WsRelay;
export type WsServerMessage = WsRelay | WsPeerJoined | WsPeerLeft | WsError;
