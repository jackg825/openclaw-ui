import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

export interface SidecarConfig {
  gatewayUrl: string;
  signalingUrl: string;
  roomId: string;
  peerId: string;
  deviceConfigPath: string;
}

export interface DeviceConfig {
  deviceToken: string;
  stableRoomId: string;
  signalingUrl: string;
  registeredAt: string;
}

export function loadDeviceConfig(configPath: string): DeviceConfig | null {
  try {
    if (!existsSync(configPath)) {
      console.debug('[config] No device config at', configPath);
      return null;
    }
    const data = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data) as DeviceConfig;
    console.debug('[config] Loaded device config', { token: config.deviceToken.slice(0, 8) + '...', registeredAt: config.registeredAt });
    return config;
  } catch {
    console.debug('[config] Failed to parse device config at', configPath);
    return null;
  }
}

export function saveDeviceConfig(configPath: string, config: DeviceConfig): void {
  const dir = configPath.substring(0, configPath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.debug('[config] Saved device config to', configPath);
}

export function parseConfig(args: string[]): SidecarConfig {
  const config: SidecarConfig = {
    gatewayUrl: process.env.GATEWAY_URL ?? 'ws://127.0.0.1:18789',
    signalingUrl: process.env.SIGNALING_URL ?? 'http://localhost:8787',
    roomId: process.env.ROOM_ID ?? '',
    peerId: crypto.randomUUID(),
    deviceConfigPath: process.env.DEVICE_CONFIG_PATH ?? join(homedir(), '.openclaw-sidecar', 'device.json'),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--gateway-url':
        if (next) { config.gatewayUrl = next; i++; }
        break;
      case '--signaling-url':
        if (next) { config.signalingUrl = next; i++; }
        break;
      case '--room-id':
        if (next) { config.roomId = next; i++; }
        break;
      case '--device-config':
        if (next) { config.deviceConfigPath = next; i++; }
        break;
    }
  }

  console.debug('[config] Parsed config', {
    gatewayUrl: config.gatewayUrl,
    signalingUrl: config.signalingUrl,
    roomId: config.roomId || '(none)',
  });

  return config;
}
