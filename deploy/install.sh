#!/bin/bash
set -e

# ============================================
#  ProxyForge — Installation Script
#  Optimized for: Debian 12, 1GB RAM, 1 CPU
#  Usage: bash install.sh (from repo root)
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[ProxyForge]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║         ProxyForge Installer          ║"
echo "  ║      VPN Management Panel v1.0        ║"
echo "  ║    Optimized for 1GB RAM servers      ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (sudo)"
fi

# Check OS
if [[ ! -f /etc/os-release ]]; then
    error "Unsupported operating system"
fi
source /etc/os-release
log "OS: $PRETTY_NAME"

# Check RAM
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [[ $TOTAL_RAM -lt 800 ]]; then
    error "Minimum 1GB RAM required. You have ${TOTAL_RAM}MB"
fi
log "RAM: ${TOTAL_RAM}MB"

# ==== Step 1: System update ====
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release

# ==== Step 2: Create swap (for 1GB RAM servers) ====
if [[ $TOTAL_RAM -lt 2000 ]]; then
    if [[ ! -f /swapfile ]]; then
        log "Creating 1GB swap file (needed for 1GB RAM)..."
        fallocate -l 1G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        # Optimize swap for low-RAM server
        sysctl vm.swappiness=10
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        log "Swap created: 1GB"
    else
        log "Swap already exists"
    fi
fi

# ==== Step 3: Install Docker ====
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    log "Docker installed: $(docker --version)"
else
    log "Docker already installed: $(docker --version)"
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
    log "Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
fi
log "Docker Compose: $(docker compose version)"

# ==== Step 4: Setup directory ====
INSTALL_DIR="/opt/proxyforge"
log "Project directory: $INSTALL_DIR"

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    log "Cloning ProxyForge repository..."
    git clone https://github.com/Ankodo/Chacha-poom.git $INSTALL_DIR
fi
cd $INSTALL_DIR

# ==== Step 5: Generate secrets ====
generate_secret() { openssl rand -hex 32; }

DB_PASS=$(generate_secret)
JWT_SECRET=$(generate_secret)
NODE_SECRET=$(generate_secret)

# ==== Step 6: Interactive config ====
echo ""
log "=== Configuration ==="
echo ""

read -p "Panel domain (e.g., panel.example.com): " PANEL_DOMAIN
[[ -z "$PANEL_DOMAIN" ]] && error "Domain is required"

read -p "Sub-link domain [sub.${PANEL_DOMAIN#panel.}]: " SUB_DOMAIN
SUB_DOMAIN=${SUB_DOMAIN:-"sub.${PANEL_DOMAIN#panel.}"}

read -p "Telegram Bot token (or Enter to skip): " BOT_TOKEN

read -p "Admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Admin password (min 8 chars): " ADMIN_PASS
echo ""
[[ ${#ADMIN_PASS} -lt 8 ]] && error "Password must be at least 8 characters"

# ==== Step 7: Create .env ====
cat > .env << ENVFILE
# ProxyForge — Generated $(date +%Y-%m-%d)
APP_NAME=ProxyForge
DEBUG=false

POSTGRES_DB=proxyforge
POSTGRES_USER=proxyforge
POSTGRES_PASSWORD=${DB_PASS}

JWT_SECRET=${JWT_SECRET}
NODE_AGENT_SECRET=${NODE_SECRET}

CORS_ORIGINS=["https://${PANEL_DOMAIN}"]
PANEL_DOMAIN=${PANEL_DOMAIN}
SUB_DOMAIN=${SUB_DOMAIN}
CLIENT_DOMAIN=${PANEL_DOMAIN#panel.}

BOT_TOKEN=${BOT_TOKEN}

YUKASSA_SHOP_ID=
YUKASSA_SECRET_KEY=
CRYPTOBOT_TOKEN=

SUPERADMIN_USERNAME=${ADMIN_USER}
SUPERADMIN_PASSWORD=${ADMIN_PASS}
ENVFILE

chmod 600 .env
log ".env created"

# ==== Step 8: Build & Start ====
log "Building Docker images (this may take 3-5 minutes)..."
cd deploy
docker compose build

log "Starting services..."
docker compose up -d

# Wait for DB to be healthy
log "Waiting for database to start..."
for i in {1..30}; do
    if docker compose exec -T db pg_isready -U proxyforge &>/dev/null; then
        break
    fi
    sleep 2
done

# ==== Step 9: Run migrations ====
log "Running database migrations..."
docker compose exec -T backend alembic upgrade head 2>&1 || warn "Migrations may need manual run"

# ==== Step 10: Create superadmin ====
log "Creating superadmin..."
docker compose exec -T backend python -m src.scripts.create_superadmin 2>&1 || warn "SuperAdmin creation needs manual check"

# ==== Done! ====
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ProxyForge installed successfully!        ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Panel:     https://${PANEL_DOMAIN}${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Sub-link:  https://${SUB_DOMAIN}${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Admin:     ${ADMIN_USER}${GREEN}║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Memory usage breakdown:                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    Backend:  ~256MB  |  PostgreSQL: ~256MB         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    Redis:    ~64MB   |  Caddy:      ~64MB          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    TG Bot:   ~128MB  |  Swap:       1GB            ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
log "Commands:"
echo "  cd $INSTALL_DIR/deploy"
echo "  docker compose logs -f          # View logs"
echo "  docker compose restart backend  # Restart backend"
echo "  docker compose down             # Stop all"
echo "  docker compose up -d            # Start all"
