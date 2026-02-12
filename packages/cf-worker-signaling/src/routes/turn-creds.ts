import type { Env } from '../types.js';

export async function handleTurnCreds(request: Request, env: Env): Promise<Response> {
  if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'TURN credentials not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Call Cloudflare TURN API to generate ephemeral credentials
  const turnRes = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TURN_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: 86400 }), // 24 hour TTL
    },
  );

  if (!turnRes.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate TURN credentials' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const creds = (await turnRes.json()) as {
    iceServers: { urls: string[]; username: string; credential: string };
  };

  return new Response(
    JSON.stringify({
      iceServers: [creds.iceServers],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
