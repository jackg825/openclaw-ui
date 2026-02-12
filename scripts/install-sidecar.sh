#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# OpenClaw Sidecar Proxy — One-line installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ui/main/scripts/install-sidecar.sh | bash
#
# Or with options:
#   curl -fsSL ... | bash -s -- --signaling-url https://your-worker.workers.dev
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[openclaw]${NC} $*"; }
warn() { echo -e "${YELLOW}[openclaw]${NC} $*"; }
err()  { echo -e "${RED}[openclaw]${NC} $*" >&2; }

INSTALL_DIR="${OPENCLAW_INSTALL_DIR:-$HOME/.openclaw-sidecar}"
REPO_URL="https://github.com/jackg825/openclaw-ui.git"
SIGNALING_URL="${SIGNALING_URL:-https://openclaw-signaling.jackg825.workers.dev}"
GATEWAY_URL="${GATEWAY_URL:-ws://127.0.0.1:18789}"

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case "$1" in
    --signaling-url) SIGNALING_URL="$2"; shift 2 ;;
    --gateway-url)   GATEWAY_URL="$2"; shift 2 ;;
    --install-dir)   INSTALL_DIR="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: install-sidecar.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --signaling-url URL   CF Worker signaling URL (default: https://openclaw-signaling.jackg825.workers.dev)"
      echo "  --gateway-url URL     Local OpenClaw gateway URL (default: ws://127.0.0.1:18789)"
      echo "  --install-dir PATH    Installation directory (default: ~/.openclaw-sidecar)"
      echo ""
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "${BOLD}${CYAN}"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │       OpenClaw Sidecar Proxy Installer       │"
echo "  └─────────────────────────────────────────────┘"
echo -e "${NC}"

# ── Check prerequisites ──
log "Checking prerequisites..."

# Node.js
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node.js 22+ first:"
  err "  https://nodejs.org/ or: curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  err "Node.js $NODE_VERSION found, but 20+ is required (22+ recommended)"
  exit 1
fi
log "  Node.js $(node -v) ✓"

# pnpm
if ! command -v pnpm &>/dev/null; then
  log "  pnpm not found — installing via corepack..."
  corepack enable 2>/dev/null || npm install -g pnpm@9
fi
log "  pnpm $(pnpm -v) ✓"

# git
if ! command -v git &>/dev/null; then
  err "git not found. Please install git first."
  exit 1
fi
log "  git ✓"

# ── Clone / update ──
if [[ -d "$INSTALL_DIR/.git" ]]; then
  log "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  log "Cloning repository to $INSTALL_DIR..."
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

# ── Install dependencies ──
log "Installing dependencies..."
cd "$INSTALL_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── Build ──
log "Building shared-types..."
pnpm --filter @openclaw/shared-types build

log "Building sidecar-proxy..."
pnpm --filter @openclaw/sidecar-proxy build

# ── Pairing setup ──
echo ""
echo -e "${BOLD}How would you like to pair with the browser?${NC}"
echo ""
echo "  1) Enter a pairing code from browser (recommended for new users)"
echo "  2) Generate a pairing URL (recommended for advanced users)"
echo "  3) Skip — I'll set up pairing later"
echo ""
read -rp "Choice [1/2/3]: " PAIRING_CHOICE

case "$PAIRING_CHOICE" in
  1)
    read -rp "Enter pairing code (e.g., H4KR-7N2M): " PAIRING_CODE
    if [[ ! "$PAIRING_CODE" =~ ^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$ ]]; then
      err "Invalid pairing code format. Expected: XXXX-XXXX"
      exit 1
    fi
    SIDECAR_ARGS="--room-id $PAIRING_CODE"
    ;;
  2)
    SIDECAR_ARGS=""
    log "Sidecar will generate a pairing URL when started."
    ;;
  *)
    SIDECAR_ARGS=""
    log "Skipping pairing. Run the sidecar manually to pair later."
    ;;
esac

# ── Create run script ──
RUN_SCRIPT="$INSTALL_DIR/run-sidecar.sh"
cat > "$RUN_SCRIPT" << 'SCRIPT'
#!/usr/bin/env bash
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"
exec node packages/sidecar-proxy/dist/index.js \
  --signaling-url "${SIGNALING_URL:-https://openclaw-signaling.jackg825.workers.dev}" \
  --gateway-url "${GATEWAY_URL:-ws://127.0.0.1:18789}" \
  "$@"
SCRIPT
chmod +x "$RUN_SCRIPT"

# ── Create systemd service (Linux only) ──
if [[ "$(uname)" == "Linux" ]] && command -v systemctl &>/dev/null; then
  SERVICE_FILE="$INSTALL_DIR/openclaw-sidecar.service"
  cat > "$SERVICE_FILE" << SERVICE
[Unit]
Description=OpenClaw Sidecar Proxy
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node $INSTALL_DIR/packages/sidecar-proxy/dist/index.js --signaling-url $SIGNALING_URL --gateway-url $GATEWAY_URL
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE
  log "Systemd service file generated at: $SERVICE_FILE"
  log "To install as a service:"
  log "  sudo cp $SERVICE_FILE /etc/systemd/system/"
  log "  sudo systemctl enable --now openclaw-sidecar"
fi

# ── Create launchd plist (macOS only) ──
if [[ "$(uname)" == "Darwin" ]]; then
  PLIST_FILE="$INSTALL_DIR/com.openclaw.sidecar.plist"
  NODE_PATH=$(which node)
  cat > "$PLIST_FILE" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.openclaw.sidecar</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_PATH</string>
    <string>$INSTALL_DIR/packages/sidecar-proxy/dist/index.js</string>
    <string>--signaling-url</string>
    <string>$SIGNALING_URL</string>
    <string>--gateway-url</string>
    <string>$GATEWAY_URL</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$INSTALL_DIR/sidecar.log</string>
  <key>StandardErrorPath</key>
  <string>$INSTALL_DIR/sidecar.error.log</string>
</dict>
</plist>
PLIST
  log "launchd plist generated at: $PLIST_FILE"
  log "To install as a service:"
  log "  cp $PLIST_FILE ~/Library/LaunchAgents/"
  log "  launchctl load ~/Library/LaunchAgents/com.openclaw.sidecar.plist"
fi

# ── Done ──
echo ""
echo -e "${BOLD}${GREEN}  ✓ Installation complete!${NC}"
echo ""
echo -e "  ${BOLD}Signaling:${NC}    $SIGNALING_URL"
echo -e "  ${BOLD}Gateway:${NC}      $GATEWAY_URL"
echo -e "  ${BOLD}Install dir:${NC}  $INSTALL_DIR"
echo ""
if [[ "$PAIRING_CHOICE" == "1" ]]; then
  echo -e "  ${BOLD}Starting sidecar with pairing code...${NC}"
  exec "$RUN_SCRIPT" $SIDECAR_ARGS
elif [[ "$PAIRING_CHOICE" == "2" ]]; then
  echo -e "  ${BOLD}Starting sidecar (will display pairing URL)...${NC}"
  exec "$RUN_SCRIPT"
else
  echo -e "  ${BOLD}Quick start:${NC}"
  echo "    $RUN_SCRIPT"
  echo ""
  echo -e "  ${BOLD}Once paired, reconnection is automatic!${NC}"
fi
