#!/usr/bin/env bash
# Deploys North Pole Online to the local Apache httpd over HTTPS.
#
#   npm run build                        # as your normal user
#   sudo bash deploy/apache/deploy.sh    # then this, as root
#
# Re-run it after every new build to publish the update. It:
#   1. backs up /etc/httpd/conf/httpd.conf and disables the old <VirtualHost *:443>
#      reverse proxy in it (commented out, not deleted)
#   2. makes sure a browser-trusted certificate exists (runs make-cert.sh the first time)
#   3. copies dist/ to /var/www/north-pole-online (read-only, SELinux-labelled)
#   4. installs /etc/httpd/conf.d/north-pole-online.conf
#   5. checks the config and reloads Apache — restoring the backup if the check fails
set -euo pipefail

SITE=north-pole-online
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST="$PROJECT_DIR/dist"
WEBROOT="/var/www/$SITE"
CONF_SRC="$SCRIPT_DIR/$SITE.conf"
CONF_DST="/etc/httpd/conf.d/$SITE.conf"
MAIN_CONF="/etc/httpd/conf/httpd.conf"
CERT="/etc/pki/tls/certs/$SITE.crt"
KEY="/etc/pki/tls/private/$SITE.key"
STAMP="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
info() { printf '  %s\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root: sudo bash $0"
[[ -f "$DIST/index.html" ]] || die "No build found. Run 'npm run build' first (as your normal user)."
command -v httpd >/dev/null || die "Apache httpd is not installed."

# ---------- Names / addresses this site answers to ----------
HOST="$(hostname)"
IPS="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)"
PRIMARY_IP="$(printf '%s\n' "$IPS" | head -n1)"
SERVER_NAME="${PRIMARY_IP:-$HOST}"
ALIASES="localhost $HOST $(printf '%s ' $IPS)"
info "Server name: $SERVER_NAME (aliases: $ALIASES)"

# ---------- 1. Back up and disable the old 443 reverse proxy ----------
BACKUP_MAIN="$MAIN_CONF.bak-$STAMP"
cp -a "$MAIN_CONF" "$BACKUP_MAIN"
if grep -Eq '^[[:space:]]*<VirtualHost[[:space:]]+\*:443>' "$MAIN_CONF"; then
  awk '
    /^[[:space:]]*<VirtualHost[[:space:]]+\*:443>/ { inblock = 1 }
    inblock { print "# [disabled by north-pole-online deploy] " $0; if ($0 ~ /<\/VirtualHost>/) inblock = 0; next }
    { print }
  ' "$BACKUP_MAIN" > "$MAIN_CONF"
  say "Disabled the old <VirtualHost *:443> proxy in $MAIN_CONF (backup: $BACKUP_MAIN)"
else
  info "No active <VirtualHost *:443> in $MAIN_CONF — nothing to disable."
fi

# ---------- 2. TLS certificate signed by the local CA ----------
CA_CRT="/etc/pki/$SITE-ca/ca.crt"
NEED_CERT=0
if [[ ! -f "$CERT" || ! -f "$KEY" || ! -f "$CA_CRT" ]]; then
  NEED_CERT=1
elif ! openssl verify -CAfile "$CA_CRT" -purpose sslserver "$CERT" >/dev/null 2>&1; then
  NEED_CERT=1   # old self-signed certificate, or expired
else
  for ip in $IPS; do   # IP address changed since the certificate was made?
    openssl verify -CAfile "$CA_CRT" -purpose sslserver -verify_ip "$ip" "$CERT" >/dev/null 2>&1 || NEED_CERT=1
  done
fi
if [[ $NEED_CERT == 1 ]]; then
  info "Creating a trusted certificate (make-cert.sh)…"
  bash "$SCRIPT_DIR/make-cert.sh"
else
  info "Using existing trusted certificate $CERT"
fi

# ---------- 3. Site files ----------
mkdir -p "$WEBROOT"
rsync -a --delete "$DIST/" "$WEBROOT/"
chown -R root:root "$WEBROOT"
find "$WEBROOT" -type d -exec chmod 755 {} +
find "$WEBROOT" -type f -exec chmod 644 {} +
# Keep the CA certificate downloadable for other devices.
[[ -f "$CA_CRT" ]] && install -m 644 "$CA_CRT" "$WEBROOT/$SITE-ca.crt"
restorecon -R "$WEBROOT" 2>/dev/null || true
say "Published $(find "$WEBROOT" -type f | wc -l) files to $WEBROOT"

# ---------- 4. Apache site config ----------
BACKUP_SITE=""
[[ -f "$CONF_DST" ]] && { BACKUP_SITE="$CONF_DST.bak-$STAMP"; cp -a "$CONF_DST" "$BACKUP_SITE"; }
sed -e "s|@SERVER_NAME@|$SERVER_NAME|g" -e "s|@SERVER_ALIASES@|$ALIASES|g" "$CONF_SRC" > "$CONF_DST"
chmod 644 "$CONF_DST"
restorecon "$CONF_DST" 2>/dev/null || true

# ---------- 5. Check and reload ----------
if ! httpd -t 2>/tmp/$SITE-configtest.log; then
  cat /tmp/$SITE-configtest.log >&2
  cp -a "$BACKUP_MAIN" "$MAIN_CONF"
  if [[ -n "$BACKUP_SITE" ]]; then cp -a "$BACKUP_SITE" "$CONF_DST"; else rm -f "$CONF_DST"; fi
  die "Apache config test failed — previous configuration restored, nothing reloaded."
fi
systemctl reload httpd
say "Apache reloaded"

echo
say "North Pole Online is live:"
info "https://localhost/"
for ip in $IPS; do info "https://$ip/"; done
info "Other devices: install https://$SERVER_NAME/$SITE-ca.crt once to get a valid padlock."
