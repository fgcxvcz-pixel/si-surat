#!/usr/bin/env bash
# Setup dependensi SiSurat di VPS Ubuntu 22.04 / Debian 12
# Jalankan dengan sudo dari root project: sudo ./deploy/setup-vps.sh
# Script ini BELUM import schema DB — lihat deploy/README.md langkah 3.

set -euo pipefail

echo "=== SiSurat VPS setup (Ubuntu/Debian) ==="

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Script ini untuk apt-based (Ubuntu/Debian). Untuk RHEL/CentOS lihat deploy/README.md."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] Update paket..."
apt-get update -y
apt-get upgrade -y

echo "[2/7] Install MariaDB, Nginx, Git, unzip..."
apt-get install -y mariadb-server mariadb-client nginx git unzip curl ca-certificates

echo "[3/7] Install Node.js 24 LTS (NodeSource)..."
if ! command -v node >/dev/null 2>&1 || [[ "" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo "Node: v24.14.1  npm: 11.11.0"

echo "[4/7] Install pnpm (optional - recommended for production)..."
npm install -g pnpm@12.5.1
echo "pnpm: 12.5.1"

echo "[5/7] Install PM2 global..."
npm install -g pm2

echo "[6/7] Enable service..."
systemctl enable --now mariadb
systemctl enable --now nginx
systemctl enable --now pm2 || true

echo "[7/7] Setup UFW firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status

echo "[8/8] Selesai (ringkas)..."
echo "  - MariaDB : "
echo "  - Nginx   : "
echo "  - Node    : v24.14.1"
echo "  - pnpm    : 12.5.1"
echo ""
echo "Langkah berikutnya (manual):"
echo "  1. Buat DB + user:  sudo mysql -u root   (lihat deploy/README.md langkah 3)"
echo "  2. Import schema:   sudo mysql -u root sisurat_db < database/schema.sql"
echo "  3. pnpm install && pnpm run build"
echo "  4. cp deploy/.env.example .env  lalu edit"
echo "  5. pm2 start server/index.js --name sisurat-api && pm2 save && pm2 startup"
echo "  6. cp deploy/nginx-sisurat.conf /etc/nginx/sites-available/sisurat"
echo "  7. Edit server_name, nginx -t, reload"
echo "  8. UFW: sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable"
echo ""
echo "Detail lengkap: deploy/README.md"

