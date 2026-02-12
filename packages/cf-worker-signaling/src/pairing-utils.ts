import type { Env, PairingData } from './types.js';
import { getSignaling, putSignaling } from './storage.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export const PAIRING_EXPIRY_MINUTES = 30;
export const RECONNECT_EXPIRY_MINUTES = 240;

function generateCode(): string {
  const chars: string[] = [];
  const array = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < CODE_LENGTH; i++) {
    chars.push(ALPHABET[array[i] % ALPHABET.length]);
  }
  return chars.slice(0, 4).join('') + '-' + chars.slice(4).join('');
}

/**
 * Generate a pairing code and store it in R2.
 * Returns null if code generation fails after retries.
 */
export async function createPairingCode(
  env: Env,
  roomId: string,
  expiryMinutes: number,
): Promise<{ pairingCode: string; expiresAt: string } | null> {
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await getSignaling<PairingData>(env.SIGNALING_BUCKET, `pairing:${code}`);
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

  const pairing: PairingData = {
    roomId,
    pairingCode: code,
    createdAt: now.toISOString(),
    expiresAt,
  };

  await putSignaling(env.SIGNALING_BUCKET, `pairing:${code}`, pairing);

  return { pairingCode: code, expiresAt };
}
