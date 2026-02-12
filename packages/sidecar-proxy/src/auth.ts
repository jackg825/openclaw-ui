/**
 * Room token validation for the sidecar proxy.
 * When ROOM_SECRET is set, the sidecar validates that the connecting
 * client provides a matching token to prevent unauthorized access.
 */

export function validateRoomToken(token: string | undefined, secret: string | undefined): boolean {
  if (!secret) return true; // No secret configured, allow all
  if (!token) return false; // Secret required but not provided
  return token === secret;
}
