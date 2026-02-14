export interface Env {
  SIGNALING_BUCKET: R2Bucket;
  SIGNALING_ROOM: DurableObjectNamespace;
  ROOM_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  GOOGLE_CLIENT_ID: string;
  SESSION_SECRET: string;
  SETTINGS_ENCRYPTION_KEY?: string;
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
  googleSub?: string;
}

export interface DeviceEntry {
  deviceToken: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  lastSeen: string;
  registeredAt: string;
}

export interface DeviceData {
  stableRoomId: string;
  userToken: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  registeredAt: string;
  lastSeen: string;
}

export interface BlocklistEntry {
  reason: string;
  blockedAt: string;
  expiresAt?: string;
}

export interface AccountData {
  googleSub: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  userToken: string;
  stableRoomId: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface SyncedSettings {
  theme: 'dark' | 'light' | 'system';
  defaultSignalingUrl: string;
  defaultRoomId: string;
  voiceEnabled: boolean;
  voiceProvider: 'web-speech' | 'deepgram';
  deepgramApiKey: string | null;
  updatedAt: string;
}
