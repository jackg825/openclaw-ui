import type { Env, AccountData, SyncedSettings, UserData, DeviceEntry, DeviceData } from '../types.js';
import { verifyGoogleIdToken, createSessionToken } from '../auth.js';
import { getSignaling, putSignaling } from '../storage.js';
import { decrypt } from '../crypto-utils.js';

const DEFAULT_SETTINGS: SyncedSettings = {
  theme: 'dark',
  defaultSignalingUrl: 'https://openclaw-signaling.jackg825.workers.dev',
  defaultRoomId: '',
  voiceEnabled: true,
  voiceProvider: 'web-speech',
  deepgramApiKey: null,
  updatedAt: new Date().toISOString(),
};

export async function handleAuthGoogle(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json()) as {
    idToken: string;
    userToken?: string;
    deviceName?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  };

  if (!body.idToken) {
    return new Response(JSON.stringify({ error: 'Missing idToken' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Verify Google ID Token
  let googlePayload;
  try {
    googlePayload = await verifyGoogleIdToken(body.idToken, env.GOOGLE_CLIENT_ID);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid Google ID token', detail: String(err) }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const now = new Date().toISOString();
  const sub = googlePayload.sub;

  // 2. Check if account exists
  let account = await getSignaling<AccountData>(env.SIGNALING_BUCKET, `account:${sub}`);
  let isNewAccount = false;

  if (!account) {
    isNewAccount = true;

    // Try to link existing userToken if provided
    let userToken: string;
    let stableRoomId: string;

    if (body.userToken) {
      const existingUser = await getSignaling<UserData>(env.SIGNALING_BUCKET, `user:${body.userToken}`);
      if (existingUser) {
        userToken = body.userToken;
        stableRoomId = existingUser.stableRoomId;
        existingUser.googleSub = sub;
        await putSignaling(env.SIGNALING_BUCKET, `user:${userToken}`, existingUser);
      } else {
        userToken = crypto.randomUUID();
        stableRoomId = crypto.randomUUID();
      }
    } else {
      userToken = crypto.randomUUID();
      stableRoomId = crypto.randomUUID();
    }

    // Create account record
    account = {
      googleSub: sub,
      email: googlePayload.email,
      displayName: googlePayload.name || null,
      avatarUrl: googlePayload.picture || null,
      userToken,
      stableRoomId,
      createdAt: now,
      lastLoginAt: now,
    };

    // Create user record if new
    if (!body.userToken || !(await getSignaling<UserData>(env.SIGNALING_BUCKET, `user:${userToken}`))) {
      const deviceToken = crypto.randomUUID();
      const deviceName = body.deviceName || 'Default Device';
      const deviceType = body.deviceType || 'unknown';

      const device: DeviceEntry = {
        deviceToken,
        name: deviceName,
        type: deviceType,
        lastSeen: now,
        registeredAt: now,
      };

      const userData: UserData = {
        stableRoomId,
        devices: [device],
        googleSub: sub,
      };

      const deviceData: DeviceData = {
        stableRoomId,
        userToken,
        name: deviceName,
        type: deviceType,
        registeredAt: now,
        lastSeen: now,
      };

      await Promise.all([
        putSignaling(env.SIGNALING_BUCKET, `user:${userToken}`, userData),
        putSignaling(env.SIGNALING_BUCKET, `device:${deviceToken}`, deviceData),
        putSignaling(env.SIGNALING_BUCKET, `room:${stableRoomId}`, { peers: [] }),
      ]);
    }

    // Create default settings
    await putSignaling(env.SIGNALING_BUCKET, `settings:${sub}`, {
      ...DEFAULT_SETTINGS,
      updatedAt: now,
    });

    await putSignaling(env.SIGNALING_BUCKET, `account:${sub}`, account);
  } else {
    // Existing account — update lastLoginAt
    account.lastLoginAt = now;
    account.email = googlePayload.email;
    account.displayName = googlePayload.name || account.displayName;
    account.avatarUrl = googlePayload.picture || account.avatarUrl;
    await putSignaling(env.SIGNALING_BUCKET, `account:${sub}`, account);
  }

  // 3. Issue session JWT
  const { token, expiresAt } = await createSessionToken(
    { sub, email: googlePayload.email },
    env.SESSION_SECRET,
  );

  // 4. Fetch settings (decrypt deepgramApiKey if present)
  let settings = await getSignaling<SyncedSettings>(env.SIGNALING_BUCKET, `settings:${sub}`);
  if (settings?.deepgramApiKey && env.SETTINGS_ENCRYPTION_KEY) {
    try {
      settings = {
        ...settings,
        deepgramApiKey: await decrypt(settings.deepgramApiKey, env.SETTINGS_ENCRYPTION_KEY),
      };
    } catch {
      // Decryption failed — return null
      settings = { ...settings, deepgramApiKey: null };
    }
  }

  return new Response(
    JSON.stringify({
      user: {
        sub,
        email: googlePayload.email,
        name: googlePayload.name || '',
        picture: googlePayload.picture || '',
      },
      sessionToken: token,
      expiresAt,
      settings,
      isNewAccount,
      userToken: account.userToken,
      stableRoomId: account.stableRoomId,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
