import type { Env, PairingData } from '../types.js';
import { putSignaling, getSignaling } from '../storage.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const EXPIRY_MINUTES = 30;

function generateCode(): string {
  const chars: string[] = [];
  const array = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < CODE_LENGTH; i++) {
    chars.push(ALPHABET[array[i] % ALPHABET.length]);
  }
  return chars.slice(0, 4).join('') + '-' + chars.slice(4).join('');
}

export async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // Generate unique pairing code (retry on collision)
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await getSignaling<PairingData>(env.SIGNALING_BUCKET, `pairing:${code}`);
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) {
    return new Response(JSON.stringify({ error: 'Failed to generate unique code' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const roomId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000).toISOString();

  const pairing: PairingData = {
    roomId,
    pairingCode: code,
    createdAt: now.toISOString(),
    expiresAt,
  };

  // Store pairing and create room
  await putSignaling(env.SIGNALING_BUCKET, `pairing:${code}`, pairing);
  await putSignaling(env.SIGNALING_BUCKET, `room:${roomId}`, { peers: [] });

  return new Response(
    JSON.stringify({ roomId, pairingCode: code, expiresAt }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}
