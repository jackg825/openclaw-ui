import type { Env } from './types.js';

/**
 * Validate the room token from the Authorization header.
 * If ROOM_SECRET is not configured, all requests are allowed.
 */
export function validateAuth(request: Request, env: Env): boolean {
  if (!env.ROOM_SECRET) return true;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === env.ROOM_SECRET;
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
