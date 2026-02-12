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
    role: 'operator',
    scopes: ['agent', 'skill', 'exec'],
    auth: token ? { deviceToken: token } : undefined,
    device: {
      name: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
      platform: navigator.platform,
      version: '0.1.0',
    },
    minProtocol: 1,
    maxProtocol: 1,
  };
}
