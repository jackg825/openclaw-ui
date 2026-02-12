import type { Env, UserData, DeviceData, DeviceEntry } from '../types.js';
import { putSignaling } from '../storage.js';

export async function handleRegisterDevice(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const body = (await request.json()) as { roomId?: string; deviceName?: string };

  if (!body.roomId) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: roomId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userToken = crypto.randomUUID();
  const deviceToken = crypto.randomUUID();
  const stableRoomId = crypto.randomUUID();
  const now = new Date().toISOString();
  const deviceName = body.deviceName || 'Default Device';

  const device: DeviceEntry = {
    deviceToken,
    name: deviceName,
    lastSeen: now,
    registeredAt: now,
  };

  const userData: UserData = {
    stableRoomId,
    devices: [device],
  };

  const deviceData: DeviceData = {
    stableRoomId,
    userToken,
    name: deviceName,
    registeredAt: now,
  };

  // Write both records and create the stable room
  await Promise.all([
    putSignaling(env.SIGNALING_BUCKET, `user:${userToken}`, userData),
    putSignaling(env.SIGNALING_BUCKET, `device:${deviceToken}`, deviceData),
    putSignaling(env.SIGNALING_BUCKET, `room:${stableRoomId}`, { peers: [] }),
  ]);

  return new Response(
    JSON.stringify({ userToken, deviceToken, stableRoomId }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}
