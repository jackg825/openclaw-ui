import type { Env, UserData, DeviceData, RoomData } from '../types.js';
import { getSignaling, putSignaling } from '../storage.js';
import { createPairingCode, RECONNECT_EXPIRY_MINUTES } from '../pairing-utils.js';

export async function handleReconnect(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const body = (await request.json()) as { userToken?: string; deviceToken?: string };

  if (body.userToken) {
    const userData = await getSignaling<UserData>(env.SIGNALING_BUCKET, `user:${body.userToken}`);
    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'User token not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Ensure stable room exists
    const room = await getSignaling<RoomData>(env.SIGNALING_BUCKET, `room:${userData.stableRoomId}`);
    if (!room) {
      await putSignaling(env.SIGNALING_BUCKET, `room:${userData.stableRoomId}`, { peers: [] });
    }

    return new Response(
      JSON.stringify({ stableRoomId: userData.stableRoomId, devices: userData.devices }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (body.deviceToken) {
    const deviceData = await getSignaling<DeviceData>(env.SIGNALING_BUCKET, `device:${body.deviceToken}`);
    if (!deviceData) {
      return new Response(
        JSON.stringify({ error: 'Device token not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Ensure stable room exists
    const room = await getSignaling<RoomData>(env.SIGNALING_BUCKET, `room:${deviceData.stableRoomId}`);
    if (!room) {
      await putSignaling(env.SIGNALING_BUCKET, `room:${deviceData.stableRoomId}`, { peers: [] });
    }

    // Update lastSeen on user record
    const userData = await getSignaling<UserData>(env.SIGNALING_BUCKET, `user:${deviceData.userToken}`);
    if (userData) {
      const device = userData.devices.find((d) => d.deviceToken === body.deviceToken);
      if (device) {
        device.lastSeen = new Date().toISOString();
        await putSignaling(env.SIGNALING_BUCKET, `user:${deviceData.userToken}`, userData);
      }
    }

    // Generate a fresh pairing code so new browsers can discover this room
    const pairing = await createPairingCode(env, deviceData.stableRoomId, RECONNECT_EXPIRY_MINUTES);

    return new Response(
      JSON.stringify({
        stableRoomId: deviceData.stableRoomId,
        ...(pairing && { pairingCode: pairing.pairingCode, pairingExpiresAt: pairing.expiresAt }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ error: 'Must provide userToken or deviceToken' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  );
}
