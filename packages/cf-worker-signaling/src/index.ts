import type { Env, DeviceData } from './types.js';
import { getSignaling } from './storage.js';
import { handleTurnCreds } from './routes/turn-creds.js';
import { handleCreateRoom } from './routes/create-room.js';
import { handleResolve } from './routes/resolve.js';
import { handleRoomStatus } from './routes/room-status.js';
import { handleRegisterDevice } from './routes/register-device.js';
import { handleReconnect } from './routes/reconnect.js';

export { SignalingRoom } from './signaling-room.js';

function corsHeaders(env: Env): Record<string, string> {
  const origin = env.ALLOWED_ORIGINS || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade',
  };
}

const PUBLIC_ENDPOINTS = new Set([
  '/create-room',
  '/resolve',
  '/room-status',
  '/register-device',
  '/reconnect',
  '/turn-creds',
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    try {
      // WebSocket signaling via Durable Object
      if (url.pathname === '/ws') {
        const roomId = url.searchParams.get('room');
        if (!roomId) {
          return new Response(
            JSON.stringify({ error: 'Missing room param' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
          );
        }

        // Token authentication: require ?token=<deviceToken> when ROOM_SECRET is set
        if (env.ROOM_SECRET) {
          const token = url.searchParams.get('token');
          if (!token) {
            return new Response(
              JSON.stringify({ error: 'Missing token param' }),
              { status: 401, headers: { 'Content-Type': 'application/json', ...cors } },
            );
          }
          const deviceData = await getSignaling<DeviceData>(env.SIGNALING_BUCKET, `device:${token}`);
          if (!deviceData) {
            return new Response(
              JSON.stringify({ error: 'Invalid device token' }),
              { status: 401, headers: { 'Content-Type': 'application/json', ...cors } },
            );
          }
        }

        const id = env.SIGNALING_ROOM.idFromName(roomId);
        const stub = env.SIGNALING_ROOM.get(id);
        return stub.fetch(request);
      }

      // Public pairing endpoints (no auth)
      if (PUBLIC_ENDPOINTS.has(url.pathname)) {
        let response: Response;
        switch (url.pathname) {
          case '/create-room':
            response = await handleCreateRoom(request, env);
            break;
          case '/resolve':
            response = await handleResolve(request, env);
            break;
          case '/room-status':
            response = await handleRoomStatus(request, env);
            break;
          case '/register-device':
            response = await handleRegisterDevice(request, env);
            break;
          case '/reconnect':
            response = await handleReconnect(request, env);
            break;
          case '/turn-creds':
            response = await handleTurnCreds(request, env);
            break;
          default:
            response = new Response(
              JSON.stringify({ error: 'Not Found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            );
        }
        for (const [k, v] of Object.entries(cors)) {
          response.headers.set(k, v);
        }
        return response;
      }

      // Auth-required endpoints (none currently — all moved to public)
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...cors } },
      );
    } catch (err) {
      console.error('[worker] Unhandled error:', err);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...cors },
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;
