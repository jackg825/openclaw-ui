import type { ConnectParams } from '@shared/openclaw-protocol';

const DEVICE_TOKEN_KEY = 'openclaw:deviceToken';

export function storeDeviceToken(token: string): void {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function clearDeviceToken(): void {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
}

export function buildConnectParams(deviceToken?: string): ConnectParams {
  const token = deviceToken ?? getDeviceToken() ?? undefined;

  return {
    minProtocol: 1,
    maxProtocol: 1,
    client: {
      id: 'openclaw-ui',
      displayName: 'OpenClaw Web Client',
      version: '0.1.0',
      platform: navigator.platform,
      mode: 'browser',
      instanceId: crypto.randomUUID(),
    },
    auth: token ? { token } : undefined,
    scopes: ['agent', 'skill', 'exec'],
  };
}
