import type { Env, DeviceData } from './types.js';
import { getSignaling } from './storage.js';
import { authenticateRequest } from './auth.js';
import { handleAuthGoogle } from './routes/auth-google.js';
import { handleGetSettings, handlePutSettings } from './routes/settings.js';
import { handleGetDevices } from './routes/devices.js';
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Upgrade',
  };
}

const PUBLIC_ENDPOINTS = new Set([
  '/auth/google',
  '/create-room',
  '/resolve',
  '/room-status',
  '/register-device',
  '/reconnect',
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    try {
      // L2: IP Blocklist — fail-open if R2 is unavailable
      const clientIp = request.headers.get('CF-Connecting-IP');
      if (clientIp) {
        try {
          const blocked = await getSignaling(env.SIGNALING_BUCKET, `blocklist:ip:${clientIp}`);
          if (blocked) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json', ...cors },
            });
          }
        } catch (err) {
          console.error('[worker] IP blocklist check failed, allowing request', {
            ip: clientIp,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

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

      // Public endpoints (no JWT required)
      if (PUBLIC_ENDPOINTS.has(url.pathname)) {
        let response: Response;
        switch (url.pathname) {
          case '/auth/google':
            response = await handleAuthGoogle(request, env);
            break;
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

      // All other endpoints require JWT authentication
      const claims = await authenticateRequest(request, env.SESSION_SECRET);
      if (claims instanceof Response) {
        for (const [k, v] of Object.entries(cors)) claims.headers.set(k, v);
        return claims;
      }

      // Settings endpoints
      if (url.pathname === '/settings') {
        const response = request.method === 'PUT'
          ? await handlePutSettings(request, env, claims)
          : await handleGetSettings(request, env, claims);
        for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
        return response;
      }

      // Devices endpoint
      if (url.pathname === '/devices') {
        const response = await handleGetDevices(request, env, claims);
        for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
        return response;
      }

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
