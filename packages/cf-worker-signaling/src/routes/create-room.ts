import type { Env } from '../types.js';
import { putSignaling } from '../storage.js';
import { createPairingCode, PAIRING_EXPIRY_MINUTES } from '../pairing-utils.js';

export async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const roomId = crypto.randomUUID();
  const pairing = await createPairingCode(env, roomId, PAIRING_EXPIRY_MINUTES);

  if (!pairing) {
    return new Response(JSON.stringify({ error: 'Failed to generate unique code' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Create room
  await putSignaling(env.SIGNALING_BUCKET, `room:${roomId}`, { peers: [] });

  return new Response(
    JSON.stringify({ roomId, pairingCode: pairing.pairingCode, expiresAt: pairing.expiresAt }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}
