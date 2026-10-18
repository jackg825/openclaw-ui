---
paths:
  - "packages/sidecar-proxy/**"
  - "packages/pwa-client/src/lib/webrtc/chunker.ts"
  - "packages/pwa-client/src/stores/settings.ts"
---

# Sidecar proxy and DataChannel chunking

- `pnpm dev:sidecar` uses the same device file as an installed sidecar (`~/.openclaw-sidecar/device.json`; see `scripts/install-sidecar.sh`), and it overwrites that file when a browser registers the device. For local runs, set `DEVICE_CONFIG_PATH` to an absolute path outside the repo, such as `/tmp/openclaw-sidecar-dev/device.json`. That keeps the user's paired device token, and it keeps the token out of git, since `device.json` is not gitignored. A bare filename makes registration fail silently, because `saveDeviceConfig` calls `mkdirSync('')` and `index.ts` swallows the error.
- Without `SIGNALING_URL`, the sidecar uses the local Worker (`http://localhost:8787`, from `pnpm dev:worker`). The PWA defaults to production signaling (`defaultSignalingUrl` in `packages/pwa-client/src/stores/settings.ts`). Point both at the same server; otherwise pairing fails, because each server only knows its own codes. Change the PWA side on the Settings page or in the pairing dialog, not by editing the code default. The code default is the production URL, and the setting persists in localStorage (`openclaw-settings`), so existing browsers ignore a changed default anyway.
- `MessageChunker` has two copies: `packages/sidecar-proxy/src/chunker.ts` and `packages/pwa-client/src/lib/webrtc/chunker.ts`. Only the `ChunkEnvelope` type comes from `shared-types`, so make chunking logic changes in both files.
