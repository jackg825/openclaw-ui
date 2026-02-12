import type { Env, RoomData } from '../types.js';
import { getSignaling } from '../storage.js';

export async function handleRoomStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('room');

  if (!roomId) {
    return new Response(
      JSON.stringify({ error: 'Missing room parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const room = await getSignaling<RoomData>(env.SIGNALING_BUCKET, `room:${roomId}`);

  if (!room) {
    return new Response(
      JSON.stringify({ error: 'Room not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const hasSidecar = room.peers.some((p) => p.role === 'sidecar');
  const hasClient = room.peers.some((p) => p.role === 'client');

  return new Response(
    JSON.stringify({ roomId, peers: room.peers, hasSidecar, hasClient }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
