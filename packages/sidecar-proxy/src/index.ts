import { PeerConnection } from 'node-datachannel';
import type { WsServerMessage, TurnCredentials } from '@openclaw/shared-types';
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

async function reconnectWithToken(signalingUrl: string, deviceToken: string): Promise<string> {
  const res = await fetch(`${signalingUrl}/reconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceToken }),
  });
  if (!res.ok) throw new Error(`Reconnect failed: ${res.status}`);
  const data = await res.json() as { stableRoomId: string };
  return data.stableRoomId;
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
      const stableRoomId = await reconnectWithToken(config.signalingUrl, existingDevice.deviceToken);
      config.roomId = stableRoomId;
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

    console.log('');
    console.log('  ┌──────────────────────────────────────────────────┐');
    console.log(`  │  Pairing code:  ${pairingCode}                        │`);
    console.log('  │                                                  │');
    console.log('  │  Open the OpenClaw PWA in your browser and       │');
    console.log(`  │  enter this code to connect.                     │`);
    console.log('  └──────────────────────────────────────────────────┘');
    console.log('');
  }

  console.log(`[sidecar] Room:      ${config.roomId}`);

  // ── Signaling + WebRTC setup ──
  const signaling = new WsSidecarSignaling(config.signalingUrl, config.roomId, config.peerId, existingDevice?.deviceToken);
  await signaling.join();
  console.log('[sidecar] Connected via WebSocket signaling');

  const bridge = new Bridge(config.gatewayUrl);

  // Get TURN credentials
  let turnServers: TurnCredentials['iceServers'] = [];
  try {
    const creds = await signaling.getTurnCredentials();
    if (creds.iceServers) {
      turnServers = creds.iceServers;
      console.debug('[sidecar] TURN servers received', { count: turnServers.length, urls: turnServers.flatMap(s => s.urls) });
    }
  } catch (err) {
    console.warn(`[sidecar] TURN not available: ${(err as Error).message}`);
  }

  // Create PeerConnection (answering peer)
  const turnUrls = turnServers.flatMap((s) => s.urls);
  const pc = new PeerConnection('sidecar', {
    iceServers: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      ...turnUrls,
    ],
  });

  // Send ICE candidates via signaling
  pc.onLocalCandidate((candidate, mid) => {
    console.debug('[sidecar] Local ICE candidate', { mid, candidate: candidate.slice(0, 50) + '...' });
    signaling.sendIceCandidate({ candidate, sdpMid: mid }).catch(() => {});
  });

  pc.onStateChange((state) => {
    console.log(`[sidecar] Connection state: ${state}`);
  });

  // Handle incoming DataChannel — single dc.onMessage to avoid setter overwrite
  pc.onDataChannel((dc) => {
    console.log(`[sidecar] DataChannel opened: ${dc.getLabel()}`);
    bridge.attach(dc);

    dc.onMessage((raw) => {
      const size = typeof raw === 'string' ? raw.length : (raw as Buffer).length;
      console.debug('[sidecar] DC message received', { size });
      const consumed = bridge.handleDataChannelMessage(raw);
      if (!consumed && needsRegistrationListener) {
        // Internal message not forwarded to gateway — check for device registration
        try {
          const text = typeof raw === 'string'
            ? raw
            : raw instanceof Buffer
              ? raw.toString('utf-8')
              : new TextDecoder().decode(raw as ArrayBuffer);
          const msg = JSON.parse(text);
          if (msg.type === 'device-registration' && msg.deviceToken) {
            const deviceCfg: DeviceConfig = {
              deviceToken: msg.deviceToken,
              stableRoomId: msg.stableRoomId || config.roomId,
              signalingUrl: config.signalingUrl,
              registeredAt: new Date().toISOString(),
            };
            saveDeviceConfig(config.deviceConfigPath, deviceCfg);
            console.log('[sidecar] Device registered! Future connections will be automatic.');
            dc.sendMessage(JSON.stringify({ type: 'device-registration-ack' }));
          }
        } catch {
          // Not a valid registration message
        }
      }
    });
  });

  // Listen for signaling messages (offers and ICE from browser)
  signaling.onMessage((msg: WsServerMessage) => {
    console.debug('[sidecar] Signaling message routed', { type: msg.type });
    switch (msg.type) {
      case 'offer':
        console.log('[sidecar] Received offer');
        pc.setRemoteDescription(msg.sdp, 'offer');
        const answer = pc.localDescription();
        if (answer) {
          signaling.sendAnswer(answer.sdp).catch((err: Error) => {
            console.error('[sidecar] Failed to send answer:', err.message);
          });
        }
        break;
      case 'ice':
        pc.addRemoteCandidate(
          msg.candidate.candidate ?? '',
          msg.candidate.sdpMid ?? '0',
        );
        break;
    }
  });

  console.log('[sidecar] Waiting for browser connection...');

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[sidecar] Shutting down...');
    signaling.close();
    bridge.close();
    pc.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[sidecar] Fatal error:', err);
  process.exit(1);
});
