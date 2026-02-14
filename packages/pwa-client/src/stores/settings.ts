import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  theme: Theme;
  defaultSignalingUrl: string;
  defaultRoomId: string;
  userToken: string | null;
  stableRoomId: string | null;
  voiceEnabled: boolean;
  voiceProvider: 'web-speech' | 'deepgram';
  deepgramApiKey: string | null;

  setTheme: (theme: Theme) => void;
  setDefaultSignalingUrl: (url: string) => void;
  setDefaultRoomId: (roomId: string) => void;
  setUserToken: (token: string | null) => void;
  setStableRoomId: (roomId: string | null) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceProvider: (provider: 'web-speech' | 'deepgram') => void;
  setDeepgramApiKey: (key: string | null) => void;
  mergeFromServer: (serverSettings: Partial<{
    theme: Theme;
    defaultSignalingUrl: string;
    defaultRoomId: string;
    voiceEnabled: boolean;
    voiceProvider: 'web-speech' | 'deepgram';
    deepgramApiKey: string | null;
  }>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      defaultSignalingUrl: 'https://openclaw-signaling.jackg825.workers.dev',
      defaultRoomId: '',
      userToken: null,
      stableRoomId: null,
      voiceEnabled: true,
      voiceProvider: 'web-speech',
      deepgramApiKey: null,

      setTheme: (theme) => set({ theme }),
      setDefaultSignalingUrl: (defaultSignalingUrl) => set({ defaultSignalingUrl }),
      setDefaultRoomId: (defaultRoomId) => set({ defaultRoomId }),
      setUserToken: (userToken) => set({ userToken }),
      setStableRoomId: (stableRoomId) => set({ stableRoomId }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setVoiceProvider: (voiceProvider) => set({ voiceProvider }),
      setDeepgramApiKey: (deepgramApiKey) => set({ deepgramApiKey }),
      mergeFromServer: (serverSettings) =>
        set((state) => ({
          ...state,
          ...serverSettings,
        })),
    }),
    {
      name: 'openclaw-settings',
    },
  ),
);
