import { create } from 'zustand';
import type { ConnectResult } from '@shared/openclaw-protocol';

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
  latency: number | null;
  transport: 'p2p' | 'turn' | null;
  pairingCode: string | null;
  pairingExpiresAt: string | null;

  setStatus: (status: ConnectionStatus) => void;
  setDeviceToken: (token: string) => void;
  setGatewayInfo: (info: ConnectResult['gateway']) => void;
  setError: (error: string | null) => void;
  setLatency: (ms: number) => void;
  setTransport: (transport: 'p2p' | 'turn') => void;
  setPairingCode: (code: string | null) => void;
  setPairingExpiresAt: (expiresAt: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'disconnected' as ConnectionStatus,
  deviceToken: null,
  gatewayInfo: null,
  error: null,
  latency: null,
  transport: null,
  pairingCode: null,
  pairingExpiresAt: null,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setStatus: (status) =>
    set({ status, error: status === 'failed' ? undefined : null }),
  setDeviceToken: (deviceToken) => set({ deviceToken }),
  setGatewayInfo: (gatewayInfo) => set({ gatewayInfo }),
  setError: (error) => set({ error, status: 'failed' }),
  setLatency: (latency) => set({ latency }),
  setTransport: (transport) => set({ transport }),
  setPairingCode: (pairingCode) => set({ pairingCode }),
  setPairingExpiresAt: (pairingExpiresAt) => set({ pairingExpiresAt }),
  reset: () => set(initialState),
}));
