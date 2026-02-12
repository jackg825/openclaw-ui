import type { PairingSession, DeviceRegistration, ReconnectResponse } from '@shared/webrtc-signaling';

export async function createRoom(signalingUrl: string): Promise<PairingSession> {
  const res = await fetch(`${signalingUrl.replace(/\/$/, '')}/create-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return res.json();
}

export async function resolveCode(signalingUrl: string, code: string): Promise<{ roomId: string }> {
  const res = await fetch(
    `${signalingUrl.replace(/\/$/, '')}/resolve?code=${encodeURIComponent(code)}`,
  );
  if (!res.ok) {
    if (res.status === 410) throw new Error('Pairing code expired');
    if (res.status === 404) throw new Error('Pairing code not found');
    throw new Error(`Resolve failed: ${res.status}`);
  }
  return res.json();
}

export async function checkRoomStatus(
  signalingUrl: string,
  roomId: string,
): Promise<{ hasSidecar: boolean; hasClient: boolean }> {
  const res = await fetch(
    `${signalingUrl.replace(/\/$/, '')}/room-status?room=${encodeURIComponent(roomId)}`,
  );
  if (!res.ok) throw new Error(`Room status failed: ${res.status}`);
  return res.json();
}

export async function registerDevice(
  signalingUrl: string,
  roomId: string,
  deviceName?: string,
): Promise<DeviceRegistration> {
  const res = await fetch(`${signalingUrl.replace(/\/$/, '')}/register-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, deviceName }),
  });
  if (!res.ok) throw new Error(`Register device failed: ${res.status}`);
  return res.json();
}

export async function reconnect(
  signalingUrl: string,
  token: string,
  type: 'user' | 'device',
): Promise<ReconnectResponse> {
  const body = type === 'user' ? { userToken: token } : { deviceToken: token };
  const res = await fetch(`${signalingUrl.replace(/\/$/, '')}/reconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Reconnect failed: ${res.status}`);
  return res.json();
}
