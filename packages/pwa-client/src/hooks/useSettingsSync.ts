import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { pushSettings } from '@/lib/settings-sync';

const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL;

export function useSettingsSync() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }

    // Subscribe to settings changes and push to server
    unsubRef.current = useSettingsStore.subscribe((state) => {
      pushSettings(AUTH_WORKER_URL, sessionToken, {
        theme: state.theme,
        defaultSignalingUrl: state.defaultSignalingUrl,
        defaultRoomId: state.defaultRoomId,
        voiceEnabled: state.voiceEnabled,
        voiceProvider: state.voiceProvider,
        deepgramApiKey: state.deepgramApiKey,
      });
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [isAuthenticated, sessionToken]);
}
