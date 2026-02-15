import type { Env, AccountData, UserData } from '../types.js';
import type { AuthClaims } from '../auth.js';
import { getSignaling } from '../storage.js';

export async function handleGetDevices(
  _request: Request,
  env: Env,
  claims: AuthClaims,
): Promise<Response> {
  const account = await getSignaling<AccountData>(
    env.SIGNALING_BUCKET,
    `account:${claims.sub}`,
  );

  if (!account) {
    return new Response(JSON.stringify({ devices: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userData = await getSignaling<UserData>(
    env.SIGNALING_BUCKET,
    `user:${account.userToken}`,
  );

  return new Response(
    JSON.stringify({ devices: userData?.devices || [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
