#!/bin/bash
set -e

# ============================================
#  ProxyForge — One-Line Installation Script
#  Usage: bash <(curl -Ls https://raw.githubusercontent.com/yourrepo/proxyforge/main/deploy/install.sh)
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
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    warn "Recommended OS: Ubuntu 22.04+. You're running $PRETTY_NAME"
fi

# Check RAM
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [[ $TOTAL_RAM -lt 1800 ]]; then
    error "Minimum 2GB RAM required. You have ${TOTAL_RAM}MB"
fi
log "System check passed: ${TOTAL_RAM}MB RAM, $PRETTY_NAME"

# Install Docker if not present
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    log "Docker installed successfully"
else
    log "Docker already installed: $(docker --version)"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &>/dev/null; then
    log "Installing Docker Compose plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi

# Setup directory
INSTALL_DIR="/opt/proxyforge"
log "Installing to $INSTALL_DIR"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone or update repo
if [[ -d ".git" ]]; then
    log "Updating existing installation..."
    git pull --ff-only
else
    log "Cloning ProxyForge..."
    git clone https://github.com/yourrepo/proxyforge.git .
fi

# Generate secrets
generate_secret() {
    openssl rand -hex 32
}

# Interactive setup
echo ""
log "=== Configuration ==="
echo ""

# Domain
read -p "Enter your panel domain (e.g., panel.example.com): " PANEL_DOMAIN
if [[ -z "$PANEL_DOMAIN" ]]; then
    error "Domain is required"
fi

# Sub-link domain
read -p "Enter sub-link domain (e.g., sub.example.com) [sub.${PANEL_DOMAIN#panel.}]: " SUB_DOMAIN
SUB_DOMAIN=${SUB_DOMAIN:-"sub.${PANEL_DOMAIN#panel.}"}

# Telegram bot token
read -p "Enter Telegram Bot token (or press Enter to skip): " BOT_TOKEN

# Admin credentials
read -p "Admin username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Admin password: " ADMIN_PASS
echo ""
if [[ ${#ADMIN_PASS} -lt 8 ]]; then
    error "Password must be at least 8 characters"
fi

# Generate .env
DB_PASS=$(generate_secret)
JWT_SECRET=$(generate_secret)
NODE_SECRET=$(generate_secret)

cat > .env << ENVFILE
# ProxyForge — Generated $(date +%Y-%m-%d)
POSTGRES_DB=proxyforge
POSTGRES_USER=proxyforge
POSTGRES_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
NODE_AGENT_SECRET=${NODE_SECRET}
DEBUG=false
CORS_ORIGINS=["https://${PANEL_DOMAIN}"]
PANEL_DOMAIN=${PANEL_DOMAIN}
SUB_DOMAIN=${SUB_DOMAIN}
BOT_TOKEN=${BOT_TOKEN}
YUKASSA_SHOP_ID=
YUKASSA_SECRET_KEY=
CRYPTOBOT_TOKEN=
SUPERADMIN_USERNAME=${ADMIN_USER}
SUPERADMIN_PASSWORD=${ADMIN_PASS}
ENVFILE

chmod 600 .env
log ".env created with generated secrets"

# Build and start
log "Building containers (this may take a few minutes)..."
cd deploy
docker compose build --no-cache
docker compose up -d

# Wait for DB
log "Waiting for database..."
sleep 5

# Run migrations
log "Running database migrations..."
docker compose exec -T backend alembic upgrade head

# Create superadmin
log "Creating superadmin account..."
docker compose exec -T backend python -c "
import asyncio
from src.core.database import async_session
from src.core.security import hash_password
from src.models.admin import Admin
async def create_admin():
    async with async_session() as db:
        admin = Admin(
            username='${ADMIN_USER}',
            password_hash=hash_password('${ADMIN_PASS}'),
            role='superadmin',
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print('SuperAdmin created')
asyncio.run(create_admin())
" 2>/dev/null || warn "SuperAdmin may already exist"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       ProxyForge installed successfully!      ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC} Panel:    https://${PANEL_DOMAIN}              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC} Sub-link: https://${SUB_DOMAIN}               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC} Admin:    ${ADMIN_USER}                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC} API Docs: https://${PANEL_DOMAIN}/api/docs    ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
log "Manage with: cd $INSTALL_DIR/deploy && docker compose [up|down|logs|restart]"
