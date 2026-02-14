import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

// ── Types ──

export interface AuthClaims {
  sub: string;
  email: string;
}

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

// ── Google ID Token Verification ──

const googleJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdTokenPayload> {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  if (!payload.email_verified) {
    throw new Error('Email not verified');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    email_verified: payload.email_verified as boolean,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
  };
}

// ── Session JWT ──

export async function createSessionToken(
  claims: AuthClaims,
  secret: string,
): Promise<{ token: string; expiresAt: number }> {
  const secretKey = new TextEncoder().encode(secret);
  const expiresAt = Math.floor(Date.now() / 1000) + 4 * 3600; // 4 hours

  const token = await new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer('openclaw-signaling')
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey);

  return { token, expiresAt: expiresAt * 1000 }; // return ms for client
}

// ── Request Authentication Middleware ──

export async function authenticateRequest(
  request: Request,
  sessionSecret: string,
): Promise<AuthClaims | Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : new URL(request.url).searchParams.get('token');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing auth token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const secretKey = new TextEncoder().encode(sessionSecret);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: 'openclaw-signaling',
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
    };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
