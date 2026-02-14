import type { Env, SyncedSettings } from '../types.js';
import type { AuthClaims } from '../auth.js';
import { getSignaling, putSignaling } from '../storage.js';
import { encrypt, decrypt } from '../crypto-utils.js';

export async function handleGetSettings(
  _request: Request,
  env: Env,
  claims: AuthClaims,
): Promise<Response> {
  const settings = await getSignaling<SyncedSettings>(
    env.SIGNALING_BUCKET,
    `settings:${claims.sub}`,
  );

  if (!settings) {
    return new Response(JSON.stringify({ error: 'No settings found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Decrypt deepgramApiKey if present
  if (settings.deepgramApiKey && env.SETTINGS_ENCRYPTION_KEY) {
    try {
      settings.deepgramApiKey = await decrypt(
        settings.deepgramApiKey,
        env.SETTINGS_ENCRYPTION_KEY,
      );
    } catch {
      settings.deepgramApiKey = null;
    }
  }

  return new Response(JSON.stringify(settings), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handlePutSettings(
  request: Request,
  env: Env,
  claims: AuthClaims,
): Promise<Response> {
  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json()) as Partial<SyncedSettings>;

  // Check for conflict (last-write-wins)
  const existing = await getSignaling<SyncedSettings>(
    env.SIGNALING_BUCKET,
    `settings:${claims.sub}`,
  );

  if (existing && body.updatedAt && existing.updatedAt > body.updatedAt) {
    return new Response(
      JSON.stringify({ error: 'Conflict', serverSettings: existing }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const now = new Date().toISOString();
  const merged: SyncedSettings = {
    theme: body.theme ?? existing?.theme ?? 'dark',
    defaultSignalingUrl:
      body.defaultSignalingUrl ??
      existing?.defaultSignalingUrl ??
      'https://openclaw-signaling.jackg825.workers.dev',
    defaultRoomId: body.defaultRoomId ?? existing?.defaultRoomId ?? '',
    voiceEnabled: body.voiceEnabled ?? existing?.voiceEnabled ?? true,
    voiceProvider: body.voiceProvider ?? existing?.voiceProvider ?? 'web-speech',
    deepgramApiKey: body.deepgramApiKey ?? existing?.deepgramApiKey ?? null,
    updatedAt: now,
  };

  // Encrypt deepgramApiKey before storing
  if (merged.deepgramApiKey && env.SETTINGS_ENCRYPTION_KEY) {
    merged.deepgramApiKey = await encrypt(
      merged.deepgramApiKey,
      env.SETTINGS_ENCRYPTION_KEY,
    );
  }

  await putSignaling(env.SIGNALING_BUCKET, `settings:${claims.sub}`, merged);

  return new Response(JSON.stringify({ ...merged, updatedAt: now }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
