#!/usr/bin/env bash
#
# B.A.Y.D — one-shot server provisioning + hardening for a Kamal deploy target.
# Target: a FRESH Ubuntu 22.04/24.04 (or Debian 12) box, run as root.
#
# What it does:
#   • base updates, timezone, swap
#   • a non-root `deploy` user with your SSH key (used by Kamal)
#   • SSH hardening (no root login, no passwords, key-only)
#   • UFW firewall (SSH + 80/443 only)
#   • fail2ban (SSH brute-force protection)
#   • unattended security upgrades
#   • kernel / sysctl hardening
#   • Docker CE (Kamal ships containers here) with log rotation
#   • persistent Active Storage directory (for the Kamal volume)
#   • OPTIONAL: PostgreSQL + PostGIS on the same box
#
# Usage (edit the vars or pass them inline):
#   SSH_PUBKEY="ssh-ed25519 AAAA... you@laptop" \
#   INSTALL_POSTGRES=true PG_PASSWORD='a-strong-password' \
#   bash server-setup.sh
#
set -euo pipefail

# ── Configuration (override via environment) ─────────────────────────────────
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PORT="${SSH_PORT:-22}"
SSH_PUBKEY="${SSH_PUBKEY:-}"                       # deploy user's public key (REQUIRED — deploy is key-only)
PASSWORD_LOGIN_USER="${PASSWORD_LOGIN_USER:-}"     # your existing personal user allowed to log in by password
TIMEZONE="${TIMEZONE:-America/Toronto}"
SWAP_SIZE="${SWAP_SIZE:-2G}"                       # empty string to skip swap
APP_STORAGE_DIR="${APP_STORAGE_DIR:-/var/lib/bayd/storage}"
CONTAINER_UID="${CONTAINER_UID:-1000}"             # uid of the `rails` user in the image

INSTALL_WEB_STACK="${INSTALL_WEB_STACK:-true}"     # nginx + certbot (public front door + TLS)
INSTALL_POSTGRES="${INSTALL_POSTGRES:-false}"      # true to install PG+PostGIS here
PG_VERSION="${PG_VERSION:-16}"
PG_DB="${PG_DB:-bayd_production}"
PG_USER="${PG_USER:-bayd}"
PG_PASSWORD="${PG_PASSWORD:-}"                      # required if INSTALL_POSTGRES=true
DOCKER_BRIDGE_GW="172.17.0.1"                       # host address containers use for the DB
DOCKER_SUBNETS="172.16.0.0/12"                      # docker bridge networks (incl. kamal net)

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Run as root (sudo -i)."
[[ -r /etc/os-release ]] && . /etc/os-release
[[ "${ID:-}" == "ubuntu" || "${ID:-}" == "debian" || "${ID_LIKE:-}" == *debian* ]] \
  || die "This script targets Ubuntu/Debian."
# SSH_PUBKEY is optional: if omitted, we generate the deploy keypair on the
# server and print the private key at the end.
if [[ -n "$PASSWORD_LOGIN_USER" ]] && ! id "$PASSWORD_LOGIN_USER" &>/dev/null; then
  die "PASSWORD_LOGIN_USER='$PASSWORD_LOGIN_USER' doesn't exist on this box — create it (with a password) first."
fi
if [[ "$INSTALL_POSTGRES" == "true" && -z "$PG_PASSWORD" ]]; then
  die "INSTALL_POSTGRES=true requires PG_PASSWORD."
fi
export DEBIAN_FRONTEND=noninteractive
CODENAME="${VERSION_CODENAME:-$(lsb_release -cs 2>/dev/null || echo stable)}"

# ── 1. Base system ───────────────────────────────────────────────────────────
log "Updating base system"
dpkg --configure -a 2>/dev/null || true   # repair any interrupted package state
apt-get update -y
apt-get -f install -y                       # fix broken deps before upgrading
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg ufw fail2ban unattended-upgrades \
  chrony git jq apt-transport-https

log "Setting timezone to ${TIMEZONE}"
timedatectl set-timezone "$TIMEZONE" || true
systemctl enable --now chrony >/dev/null 2>&1 || true

# ── 2. Swap (helps small boxes not OOM during builds/deploys) ────────────────
if [[ -n "$SWAP_SIZE" && ! -f /swapfile ]]; then
  log "Creating ${SWAP_SIZE} swap"
  fallocate -l "$SWAP_SIZE" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
fi

# ── 3. Deploy user + SSH key (before we disable passwords!) ──────────────────
log "Creating deploy user '${DEPLOY_USER}' (key-only)"
id "$DEPLOY_USER" &>/dev/null || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG sudo "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"

# No key supplied → generate the deploy keypair here on the server.
GENERATED_KEY=""
if [[ -z "$SSH_PUBKEY" ]]; then
  KEYFILE="/home/${DEPLOY_USER}/.ssh/bayd_deploy"
  [[ -f "$KEYFILE" ]] || sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -C "bayd-deploy" -f "$KEYFILE"
  SSH_PUBKEY="$(cat "${KEYFILE}.pub")"
  GENERATED_KEY="$KEYFILE"
fi

KEYS="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "$KEYS"
grep -qF "$SSH_PUBKEY" "$KEYS" || echo "$SSH_PUBKEY" >> "$KEYS"
chmod 600 "$KEYS"
chown "$DEPLOY_USER:$DEPLOY_USER" "$KEYS"

# ── 4. SSH hardening (drop-in; Ubuntu/Debian include sshd_config.d) ──────────
# Global: key-only, no root. Only PASSWORD_LOGIN_USER (if set) may use a password.
ALLOW_USERS="$DEPLOY_USER"
[[ -n "$PASSWORD_LOGIN_USER" ]] && ALLOW_USERS="$PASSWORD_LOGIN_USER $DEPLOY_USER"
log "Hardening SSH (port ${SSH_PORT}, no root, key-only${PASSWORD_LOGIN_USER:+; password for ${PASSWORD_LOGIN_USER}})"
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
Port ${SSH_PORT}
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
UsePAM yes
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
MaxAuthTries 3
MaxSessions 10
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers ${ALLOW_USERS}
EOF
if [[ -n "$PASSWORD_LOGIN_USER" ]]; then
  cat >> /etc/ssh/sshd_config.d/99-hardening.conf <<EOF

# Password login for the personal user only; ${DEPLOY_USER} stays key-only.
Match User ${PASSWORD_LOGIN_USER}
    PasswordAuthentication yes
    KbdInteractiveAuthentication yes
Match all
EOF
fi
install -d -m 0755 /run/sshd   # privilege-separation dir sshd -t/reload requires
sshd -t || die "sshd config test failed — not reloading (your current session is safe)."
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true

# ── 5. Firewall (UFW) ────────────────────────────────────────────────────────
log "Configuring UFW firewall"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
[[ "$INSTALL_POSTGRES" == "true" ]] && ufw allow from "$DOCKER_SUBNETS" to any port 5432 proto tcp comment 'Postgres (docker only)'
ufw --force enable
warn "Note: Docker publishes container ports via its own iptables rules, so 80/443 (kamal-proxy) are reachable regardless of UFW. Don't publish the DB port to 0.0.0.0."

# ── 6. fail2ban ──────────────────────────────────────────────────────────────
log "Configuring fail2ban for SSH"
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 4
backend  = systemd

[sshd]
enabled = true
port    = ${SSH_PORT}
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# ── 7. Automatic security updates ───────────────────────────────────────────
log "Enabling unattended security upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/51unattended-reboot <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF

# ── 8. Kernel / sysctl hardening ─────────────────────────────────────────────
log "Applying sysctl hardening"
cat > /etc/sysctl.d/99-hardening.conf <<'EOF'
# Network
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.log_martians = 1
# Memory / process
kernel.randomize_va_space = 2
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.suid_dumpable = 0
# Keep IPv4 forwarding on — Docker needs it
net.ipv4.ip_forward = 1
EOF
sysctl --system >/dev/null

# ── 9. Docker (Kamal's runtime) ──────────────────────────────────────────────
log "Installing Docker CE"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Hardening Docker daemon (log rotation, live-restore)"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "no-new-privileges": true
}
EOF
systemctl enable --now docker
systemctl restart docker
usermod -aG docker "$DEPLOY_USER"   # Kamal runs docker as the deploy user

# ── 10. Persistent Active Storage directory (Kamal volume target) ────────────
log "Creating persistent storage dir at ${APP_STORAGE_DIR}"
mkdir -p "$APP_STORAGE_DIR"
chown -R "${CONTAINER_UID}:${CONTAINER_UID}" "$APP_STORAGE_DIR"
chmod 750 "$APP_STORAGE_DIR"

# ── 11. Web stack: nginx (front door) + certbot + Node (frontend) ────────────
if [[ "$INSTALL_WEB_STACK" == "true" ]]; then
  log "Installing nginx + certbot (public front door + TLS)"
  apt-get install -y nginx python3-certbot-nginx
  systemctl enable --now nginx
  # The frontend runs as a Docker container (CI builds + runs it via the docker
  # group), so no Node / git / source on the server.
  warn "nginx is the front door on :80/:443. Install deploy/nginx.conf.example,"
  warn "then run certbot (see that file's header)."
fi

# ── 12. Optional: PostgreSQL + PostGIS ───────────────────────────────────────
if [[ "$INSTALL_POSTGRES" == "true" ]]; then
  log "Installing PostgreSQL ${PG_VERSION} + PostGIS"
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/pgdg.gpg
  echo "deb [signed-by=/etc/apt/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt ${CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y "postgresql-${PG_VERSION}" "postgresql-${PG_VERSION}-postgis-3"

  PGCONF="/etc/postgresql/${PG_VERSION}/main"
  # Listen on localhost + the docker bridge gateway only (never the public IP).
  cat > "${PGCONF}/conf.d/10-bayd.conf" <<EOF
listen_addresses = 'localhost,${DOCKER_BRIDGE_GW}'
password_encryption = scram-sha-256
EOF
  # Allow only docker containers (kamal net) to connect with a password.
  HBA_LINE="host  all  ${PG_USER}  ${DOCKER_SUBNETS}  scram-sha-256"
  grep -qF "$HBA_LINE" "${PGCONF}/pg_hba.conf" || echo "$HBA_LINE" >> "${PGCONF}/pg_hba.conf"

  systemctl enable postgresql
  systemctl restart postgresql

  log "Creating role + database + PostGIS extensions"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$do\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE ROLE ${PG_USER} LOGIN CREATEDB PASSWORD '${PG_PASSWORD}';
  ELSE
    ALTER ROLE ${PG_USER} WITH LOGIN CREATEDB PASSWORD '${PG_PASSWORD}';
  END IF;
END \$do\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 \
    || sudo -u postgres createdb -O "$PG_USER" "$PG_DB"
  sudo -u postgres psql -d "$PG_DB" -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
fi

# ── Done ─────────────────────────────────────────────────────────────────────
IP="$(hostname -I | awk '{print $1}')"
printf '\n\033[1;32m✔ Server ready.\033[0m\n'

if [[ -n "${GENERATED_KEY:-}" ]]; then
  printf '\n\033[1;33m▶ Deploy PRIVATE key — paste this into GitHub secret SSH_PRIVATE_KEY\n'
  printf '  (and into ~/.ssh on your laptop if you deploy manually). Then it can be deleted from the server.\033[0m\n\n'
  cat "$GENERATED_KEY"
  printf '\n'
fi
cat <<EOF

Next steps (nginx = front door; API + frontend both run as containers):
  1. Confirm SSH on port ${SSH_PORT} works from your laptop:
       ssh -p ${SSH_PORT} ${DEPLOY_USER}@${IP}
  2. DNS → ${IP}:   api.baydspa.ca   baydspa.ca   www.baydspa.ca
  3. nginx + TLS (one time, on this box):
       sudo cp <repo>/deploy/nginx.conf.example /etc/nginx/sites-available/baydspa.ca
       sudo ln -sf /etc/nginx/sites-available/baydspa.ca /etc/nginx/sites-enabled/
       sudo rm -f /etc/nginx/sites-enabled/default
       sudo certbot --nginx -d baydspa.ca -d www.baydspa.ca -d api.baydspa.ca \\
            --agree-tos -m admin@baydspa.ca --redirect
       sudo nginx -t && sudo systemctl reload nginx
  4. Everything else is GitHub Actions: add repo secrets + SSH_PORT=${SSH_PORT} variable,
     then run the Deploy workflow with "bootstrap" ticked. It deploys the API
     (Kamal) + the frontend (container on 127.0.0.1:3001). No git/node on this box.
EOF

if [[ "$INSTALL_POSTGRES" == "true" ]]; then
cat <<EOF
  6. Database is on this box. Use these in Kamal env/secrets:
       DB_HOST=${DOCKER_BRIDGE_GW}
       DB_PORT=5432
       DB_USERNAME=${PG_USER}
       DB_PASSWORD=(the PG_PASSWORD you set)
     (db:prepare will create the cache/queue databases on first boot.)
EOF
else
cat <<EOF
  6. No local DB installed. Use a managed Postgres (with PostGIS enabled) or a
     Kamal 'postgis/postgis' accessory, and set DB_HOST/DB_USERNAME/DB_PASSWORD.
EOF
fi

printf '\n\033[1;33mReboot recommended to apply kernel updates:  reboot\033[0m\n'
