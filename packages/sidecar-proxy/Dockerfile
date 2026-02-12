# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /build

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only the packages we need
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src/ ./packages/shared-types/src/

COPY packages/sidecar-proxy/package.json ./packages/sidecar-proxy/
COPY packages/sidecar-proxy/tsconfig.json ./packages/sidecar-proxy/
COPY packages/sidecar-proxy/src/ ./packages/sidecar-proxy/src/

COPY tsconfig.base.json ./

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @openclaw/shared-types build
RUN pnpm --filter @openclaw/sidecar-proxy build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:22-slim
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/openclaw/openclaw-ui"
LABEL org.opencontainers.image.description="OpenClaw Sidecar Proxy — WebRTC-to-WebSocket bridge"

# Copy workspace root for pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/sidecar-proxy/package.json ./packages/sidecar-proxy/

RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=builder /build/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=builder /build/packages/sidecar-proxy/dist/ ./packages/sidecar-proxy/dist/

ENV GATEWAY_URL=ws://127.0.0.1:18789
ENV SIGNALING_URL=https://openclaw-signaling.jackg825.workers.dev

ENTRYPOINT ["node", "packages/sidecar-proxy/dist/index.js"]
