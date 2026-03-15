#!/bin/bash
set -e

# ============================================
#  ProxyForge Node Agent — Installation Script
#  Usage: bash <(curl -Ls https://panel.domain.com/install-node.sh) --token=NODE_TOKEN --api=https://panel.domain.com
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[ProxyForge Node]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Parse args
TOKEN=""
API_URL=""
for arg in "$@"; do
    case $arg in
        --token=*) TOKEN="${arg#*=}" ;;
        --api=*) API_URL="${arg#*=}" ;;
    esac
done

if [[ -z "$TOKEN" || -z "$API_URL" ]]; then
    error "Usage: $0 --token=NODE_TOKEN --api=https://panel.domain.com"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ProxyForge Node Agent Installer    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check root
[[ $EUID -ne 0 ]] && error "Run as root"

# Install dependencies
log "Installing dependencies..."
apt-get update -qq
apt-get install -y -qq curl wget unzip jq

# Create directories
INSTALL_DIR="/opt/proxyforge-node"
mkdir -p $INSTALL_DIR/{xray,singbox,configs,logs,certs}

# Install Xray-core
log "Installing Xray-core..."
XRAY_VERSION=$(curl -s https://api.github.com/repos/XTLS/Xray-core/releases/latest | jq -r '.tag_name')
XRAY_URL="https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-linux-64.zip"
wget -q -O /tmp/xray.zip "$XRAY_URL"
unzip -qo /tmp/xray.zip -d $INSTALL_DIR/xray/
chmod +x $INSTALL_DIR/xray/xray
rm /tmp/xray.zip
log "Xray-core ${XRAY_VERSION} installed"

# Install Sing-box
log "Installing Sing-box..."
SB_VERSION=$(curl -s https://api.github.com/repos/SagerNet/sing-box/releases/latest | jq -r '.tag_name' | sed 's/v//')
SB_URL="https://github.com/SagerNet/sing-box/releases/download/v${SB_VERSION}/sing-box-${SB_VERSION}-linux-amd64.tar.gz"
wget -q -O /tmp/singbox.tar.gz "$SB_URL"
tar -xzf /tmp/singbox.tar.gz -C /tmp/
cp /tmp/sing-box-${SB_VERSION}-linux-amd64/sing-box $INSTALL_DIR/singbox/
chmod +x $INSTALL_DIR/singbox/sing-box
rm -rf /tmp/singbox* /tmp/sing-box*
log "Sing-box ${SB_VERSION} installed"

# Create agent config
cat > $INSTALL_DIR/agent.json << EOF
{
    "api_url": "${API_URL}",
    "agent_token": "${TOKEN}",
    "heartbeat_interval": 30,
    "xray_path": "${INSTALL_DIR}/xray/xray",
    "xray_config": "${INSTALL_DIR}/configs/xray.json",
    "singbox_path": "${INSTALL_DIR}/singbox/sing-box",
    "singbox_config": "${INSTALL_DIR}/configs/singbox.json",
    "log_dir": "${INSTALL_DIR}/logs",
    "cert_dir": "${INSTALL_DIR}/certs"
}
EOF

# Create systemd services
cat > /etc/systemd/system/proxyforge-xray.service << EOF
[Unit]
Description=ProxyForge Xray-core
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/xray/xray run -config ${INSTALL_DIR}/configs/xray.json
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/proxyforge-singbox.service << EOF
[Unit]
Description=ProxyForge Sing-box
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/singbox/sing-box run -config ${INSTALL_DIR}/configs/singbox.json
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Create minimal initial configs
cat > $INSTALL_DIR/configs/xray.json << 'EOF'
{
    "log": {"loglevel": "warning"},
    "inbounds": [],
    "outbounds": [{"protocol": "freedom", "tag": "direct"}],
    "routing": {"rules": []}
}
EOF

cat > $INSTALL_DIR/configs/singbox.json << 'EOF'
{
    "log": {"level": "warn"},
    "inbounds": [],
    "outbounds": [{"type": "direct", "tag": "direct"}]
}
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable proxyforge-xray proxyforge-singbox
systemctl start proxyforge-xray proxyforge-singbox

# Register with panel
log "Registering with panel..."
RESPONSE=$(curl -s -X POST "${API_URL}/api/node/heartbeat" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "cpu_usage": 0,
        "ram_usage": 0,
        "bandwidth_up": 0,
        "bandwidth_down": 0,
        "active_connections": 0,
        "xray_running": true,
        "singbox_running": true,
        "xray_version": "'$(${INSTALL_DIR}/xray/xray version | head -1 | awk '{print $2}')'",
        "singbox_version": "'$(${INSTALL_DIR}/singbox/sing-box version | head -1 | awk '{print $3}')'   "
    }' 2>&1)

if echo "$RESPONSE" | jq -e '.status' &>/dev/null; then
    log "Node registered successfully!"
else
    warn "Could not register with panel. Check the API URL and token."
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Node Agent installed successfully!        ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC} Install dir: $INSTALL_DIR"
echo -e "${GREEN}║${NC} Xray:   systemctl status proxyforge-xray"
echo -e "${GREEN}║${NC} Singbox: systemctl status proxyforge-singbox"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
