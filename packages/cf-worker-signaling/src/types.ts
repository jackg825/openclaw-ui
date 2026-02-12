export interface Env {
  SIGNALING_BUCKET: R2Bucket;
  SIGNALING_ROOM: DurableObjectNamespace;
  TURN_KEY_ID: string;
  TURN_API_TOKEN: string;
  ROOM_SECRET?: string;
  ALLOWED_ORIGINS?: string;
}

export interface PeerInfo {
  peerId: string;
  role: 'client' | 'sidecar';
  joinedAt: string;
}

export interface RoomData {
  peers: PeerInfo[];
}

export interface PairingData {
  roomId: string;
  pairingCode: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserData {
  stableRoomId: string;
  devices: DeviceEntry[];
}

export interface DeviceEntry {
  deviceToken: string;
  name: string;
  lastSeen: string;
  registeredAt: string;
}

export interface DeviceData {
  stableRoomId: string;
  userToken: string;
  name: string;
  registeredAt: string;
}
