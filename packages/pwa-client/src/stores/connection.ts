import { create } from 'zustand';
import type { ConnectResult } from '@shared/openclaw-protocol';
import type { WsErrorCode } from '@shared/webrtc-signaling';

export type ConnectionStatus =
  | 'disconnected'
  | 'pairing'
  | 'signaling'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'failed';

interface ConnectionState {
  status: ConnectionStatus;
  deviceToken: string | null;
  gatewayInfo: ConnectResult['gateway'] | null;
  error: string | null;
  errorCode: WsErrorCode | null;
  latency: number | null;
  transport: 'ws-relay' | null;
  pairingCode: string | null;
  pairingExpiresAt: string | null;

  setStatus: (status: ConnectionStatus) => void;
  setDeviceToken: (token: string) => void;
  setGatewayInfo: (info: ConnectResult['gateway']) => void;
  setError: (error: string | null, code?: WsErrorCode) => void;
  setLatency: (ms: number) => void;
  setTransport: (transport: 'ws-relay') => void;
  setPairingCode: (code: string | null) => void;
  setPairingExpiresAt: (expiresAt: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  deviceToken: null,
  gatewayInfo: null,
  error: null,
  errorCode: null as WsErrorCode | null,
  latency: null,
  transport: null,
  pairingCode: null,
  pairingExpiresAt: null,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setStatus: (status) => {
    console.debug('[connection-store] Status change', { to: status });
    set({ status, error: status === 'failed' ? undefined : null });
  },
  setDeviceToken: (deviceToken) => {
    console.debug('[connection-store] Device token set', { token: deviceToken.slice(0, 8) + '...' });
    set({ deviceToken });
  },
  setGatewayInfo: (gatewayInfo) => set({ gatewayInfo }),
  setError: (error, code) => {
    console.debug('[connection-store] Error', { error, code });
    set({ error, errorCode: code ?? null, status: 'failed' });
  },
  setLatency: (latency) => set({ latency }),
  setTransport: (transport) => {
    console.debug('[connection-store] Transport', { transport });
    set({ transport });
  },
  setPairingCode: (pairingCode) => set({ pairingCode }),
  setPairingExpiresAt: (pairingExpiresAt) => set({ pairingExpiresAt }),
  reset: () => {
    console.debug('[connection-store] Reset');
    set(initialState);
  },
}));
