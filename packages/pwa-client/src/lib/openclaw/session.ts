const SESSION_KEY = 'openclaw:session';

export interface SessionData {
  sessionKey: string;
  roomId: string;
  signalingUrl: string;
  gatewayName: string;
  connectedAt: string;
}

export class SessionManager {
  private current: SessionData | null = null;

  /** Save the current session for reconnection */
  save(data: SessionData): void {
    this.current = data;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  /** Load saved session from localStorage */
  load(): SessionData | null {
    if (this.current) return this.current;

    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      this.current = JSON.parse(stored) as SessionData;
      return this.current;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  /** Get the current session key */
  getSessionKey(): string | null {
    return this.current?.sessionKey ?? this.load()?.sessionKey ?? null;
  }

  /** Clear session data */
  clear(): void {
    this.current = null;
    localStorage.removeItem(SESSION_KEY);
  }
}
