import type { Env, PairingData } from '../types.js';
import { getSignaling } from '../storage.js';

export async function handleResolve(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.toUpperCase();

  if (!code || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return new Response(
      JSON.stringify({ error: 'Invalid pairing code format. Expected: XXXX-XXXX' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const pairing = await getSignaling<PairingData>(env.SIGNALING_BUCKET, `pairing:${code}`);

  if (!pairing) {
    return new Response(
      JSON.stringify({ error: 'Pairing code not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (new Date(pairing.expiresAt) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'Pairing code expired' }),
      { status: 410, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ roomId: pairing.roomId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
