import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GoogleUser } from '@shared/webrtc-signaling';

interface AuthState {
  user: GoogleUser | null;
  sessionToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (user: GoogleUser, token: string, expiresAt: number) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setSession: (user, sessionToken, tokenExpiresAt) =>
        set({
          user,
          sessionToken,
          tokenExpiresAt,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      clearSession: () =>
        set({
          user: null,
          sessionToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        return !tokenExpiresAt || Date.now() > tokenExpiresAt;
      },
    }),
    {
      name: 'openclaw-auth',
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
