import type { WsServerMessage } from '@openclaw/shared-types';
import { parseConfig, loadDeviceConfig, saveDeviceConfig, type DeviceConfig } from './config.js';
import { WsSidecarSignaling } from './ws-signaling.js';
import { Bridge } from './bridge.js';

const SHORT_CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

// ── HTTP helpers ──

async function createRoom(signalingUrl: string): Promise<{ roomId: string; pairingCode: string }> {
  const res = await fetch(`${signalingUrl}/create-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return res.json() as Promise<{ roomId: string; pairingCode: string }>;
}

async function resolveShortCode(signalingUrl: string, code: string): Promise<string> {
  const res = await fetch(`${signalingUrl}/resolve?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`Resolve code failed: ${res.status}`);
  const data = await res.json() as { roomId: string };
  return data.roomId;
}

interface ReconnectResult {
  stableRoomId: string;
  pairingCode?: string;
}

async function reconnectWithToken(signalingUrl: string, deviceToken: string): Promise<ReconnectResult> {
  const res = await fetch(`${signalingUrl}/reconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceToken }),
  });
  if (!res.ok) throw new Error(`Reconnect failed: ${res.status}`);
  return res.json() as Promise<ReconnectResult>;
}

function displayPairingCode(code: string): void {
  console.log('');
  console.log('  ┌──────────────────────────────────────────────────┐');
  console.log(`  │  Pairing code:  ${code}                        │`);
  console.log('  │                                                  │');
  console.log('  │  Open the OpenClaw PWA in your browser and       │');
  console.log('  │  enter this code to connect.                     │');
  console.log('  └──────────────────────────────────────────────────┘');
  console.log('');
}

// ── Main ──

async function main(): Promise<void> {
  const config = parseConfig(process.argv.slice(2));

  console.log('[sidecar] Starting OpenClaw Sidecar Proxy');
  console.log(`[sidecar] Gateway:   ${config.gatewayUrl}`);
  console.log(`[sidecar] Signaling: ${config.signalingUrl}`);

  // ── Determine startup mode ──
  let needsRegistrationListener = false;

  const existingDevice = loadDeviceConfig(config.deviceConfigPath);

  if (existingDevice && existingDevice.deviceToken && !config.roomId) {
    // Mode A: Quick Reconnect
    console.log('[sidecar] Reconnecting with registered device...');
    try {
      const result = await reconnectWithToken(config.signalingUrl, existingDevice.deviceToken);
      config.roomId = result.stableRoomId;
      if (result.pairingCode) displayPairingCode(result.pairingCode);
    } catch (err) {
      console.warn(`[sidecar] Reconnect failed: ${(err as Error).message}`);
      console.log('[sidecar] Falling back to new pairing session...');
      // Fall through to Mode C
    }
  }

  if (config.roomId && SHORT_CODE_RE.test(config.roomId)) {
    // Mode B: Browser-First (short code provided)
    console.log(`[sidecar] Resolving pairing code ${config.roomId}...`);
    const resolvedId = await resolveShortCode(config.signalingUrl, config.roomId);
    config.roomId = resolvedId;
    console.log(`[sidecar] Resolved pairing code -> roomId`);
    needsRegistrationListener = true;
  }

  if (!config.roomId) {
    // Mode C: Sidecar URL Sign-in
    console.log('[sidecar] No room ID — creating pairing session...');
    const { roomId, pairingCode } = await createRoom(config.signalingUrl);
    config.roomId = roomId;
    needsRegistrationListener = true;

    displayPairingCode(pairingCode);
  }

  console.log(`[sidecar] Room:      ${config.roomId}`);

  // ── WebSocket relay setup ──
  const signaling = new WsSidecarSignaling(config.signalingUrl, config.roomId, config.peerId, existingDevice?.deviceToken);
  await signaling.join();
  console.log('[sidecar] Connected via WebSocket relay');

  const bridge = new Bridge(config.gatewayUrl);
  bridge.attach(signaling);

  // Handle relay messages from browser (via DO)
  signaling.onMessage((msg: WsServerMessage) => {
    switch (msg.type) {
      case 'relay': {
        console.debug('[sidecar] Relay message received', { size: msg.data.length });
        const consumed = bridge.handleRelayMessage(msg.data);
        if (!consumed && needsRegistrationListener) {
          // Internal message not forwarded to gateway — check for device registration
          try {
            // Reassemble may have already happened inside handleRelayMessage,
            // but internal messages are small enough to be single-chunk
            const parsed = JSON.parse(msg.data);
            if (parsed.type === 'device-registration' && parsed.deviceToken) {
              const deviceCfg: DeviceConfig = {
                deviceToken: parsed.deviceToken,
                stableRoomId: parsed.stableRoomId || config.roomId,
                signalingUrl: config.signalingUrl,
                registeredAt: new Date().toISOString(),
              };
              saveDeviceConfig(config.deviceConfigPath, deviceCfg);
              console.log('[sidecar] Device registered! Future connections will be automatic.');
              signaling.sendRelay(JSON.stringify({ type: 'device-registration-ack' }));
            }
          } catch {
            // Not a valid registration message
          }
        }
        break;
      }
      case 'peer-joined':
        console.log(`[sidecar] Peer joined: ${msg.role} (${msg.peerId})`);
        break;
      case 'peer-left':
        console.log(`[sidecar] Peer left: ${msg.peerId}`);
        break;
    }
  });

  console.log('[sidecar] Waiting for browser connection...');

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[sidecar] Shutting down...');
    signaling.close();
    bridge.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[sidecar] Fatal error:', err);
  process.exit(1);
});
