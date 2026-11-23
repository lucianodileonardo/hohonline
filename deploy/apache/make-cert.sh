#!/usr/bin/env bash
# Creates a browser-trusted HTTPS certificate for North Pole Online on Apache.
#
#   sudo bash deploy/apache/make-cert.sh
#
# How it works:
#   1. Creates a private "North Pole Online Local CA" (once, kept in /etc/pki/north-pole-online-ca,
#      readable by root only). The CA is NAME-CONSTRAINED: it can only ever sign certificates for
#      local names and private IP ranges, so even a leaked CA key cannot impersonate real websites.
#   2. Issues a fresh server certificate (valid 397 days) for every name/IP of this machine.
#   3. Adds the CA to this machine's trust store, and to your Chrome and Firefox profiles.
#   4. Publishes the CA certificate (public part only) so other devices can install it:
#        https://<this-ip>/north-pole-online-ca.crt   and   deploy/apache/north-pole-online-ca.crt
#   5. Checks the Apache config and reloads it.
#
# Re-run it any time (e.g. when the IP address changes or before the certificate expires):
# the CA is kept, only the server certificate is renewed.
#
# Options (environment variables):
#   EXTRA_NAMES="nas.lan 10.0.0.5"   additional DNS names / IPs to include
#   NO_INSTALL=1                     only create files (no trust store, no Apache reload)
set -euo pipefail

SITE=north-pole-online
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_DIR="${CA_DIR:-/etc/pki/$SITE-ca}"
CA_KEY="$CA_DIR/ca.key"
CA_CRT="$CA_DIR/ca.crt"
CERT="${CERT:-/etc/pki/tls/certs/$SITE.crt}"
KEY="${KEY:-/etc/pki/tls/private/$SITE.key}"
WEBROOT="${WEBROOT:-/var/www/$SITE}"
CA_NAME="North Pole Online Local CA"
CA_DAYS=3650
CERT_DAYS=397          # browsers reject server certificates valid longer than ~398 days
NO_INSTALL="${NO_INSTALL:-0}"

say()  { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

[[ $NO_INSTALL == 1 || $EUID -eq 0 ]] || die "Run as root: sudo bash $0"
command -v openssl >/dev/null || die "openssl is not installed."

# ---------- Names and addresses of this machine ----------
HOST="$(hostname -s)"
FQDN="$(hostname -f 2>/dev/null || hostname)"
IPS="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' || true)"
NAMES="localhost $HOST $FQDN $HOST.local ${EXTRA_NAMES:-}"
ADDRS="127.0.0.1 $IPS"

SAN=""
add_san() { [[ ",$SAN," == *",$1,"* ]] || SAN="${SAN:+$SAN,}$1"; }
for n in $NAMES; do
  if [[ $n =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then add_san "IP:$n"; else add_san "DNS:$n"; fi
done
for ip in $ADDRS; do add_san "IP:$ip"; done
PRIMARY="$(printf '%s\n' $IPS | head -n1)"
PRIMARY="${PRIMARY:-$HOST}"

# ---------- 1. Local CA (created once) ----------
umask 077
mkdir -p "$CA_DIR"
chmod 700 "$CA_DIR"
if [[ ! -f "$CA_KEY" || ! -f "$CA_CRT" ]]; then
  # The CA may only sign local names and private address ranges.
  CONSTRAINTS="critical,permitted;DNS:localhost,permitted;DNS:$HOST,permitted;DNS:.local,permitted;DNS:.lan,permitted;DNS:.home.arpa,permitted;DNS:.internal"
  [[ $FQDN != "$HOST" && $FQDN == *.* ]] && CONSTRAINTS="$CONSTRAINTS,permitted;DNS:$FQDN"
  for n in ${EXTRA_NAMES:-}; do [[ $n =~ ^[0-9.]+$ ]] || CONSTRAINTS="$CONSTRAINTS,permitted;DNS:$n"; done
  CONSTRAINTS="$CONSTRAINTS,permitted;IP:127.0.0.0/255.0.0.0,permitted;IP:10.0.0.0/255.0.0.0,permitted;IP:172.16.0.0/255.240.0.0,permitted;IP:192.168.0.0/255.255.0.0"

  openssl req -x509 -new -nodes -sha256 -days "$CA_DAYS" \
    -newkey ec -pkeyopt ec_paramgen_curve:P-384 \
    -subj "/CN=$CA_NAME/O=North Pole Online" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "subjectKeyIdentifier=hash" \
    -addext "nameConstraints=$CONSTRAINTS" \
    -keyout "$CA_KEY" -out "$CA_CRT" 2>/dev/null
  chmod 600 "$CA_KEY"; chmod 644 "$CA_CRT"
  say "Created $CA_NAME (valid $((CA_DAYS / 365)) years) in $CA_DIR"
else
  info "Using existing $CA_NAME in $CA_DIR"
fi

# ---------- 2. Server certificate (renewed on every run) ----------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cat > "$WORK/ext.cnf" <<EOF
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
subjectAltName = $SAN
EOF
openssl req -new -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -subj "/CN=$PRIMARY/O=North Pole Online" \
  -keyout "$WORK/server.key" -out "$WORK/server.csr" 2>/dev/null
openssl x509 -req -sha256 -days "$CERT_DAYS" \
  -in "$WORK/server.csr" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
  -extfile "$WORK/ext.cnf" -out "$WORK/server.crt" 2>/dev/null
rm -f "$CA_DIR/ca.srl"

# Sanity check before touching Apache: chain + every name must verify.
openssl verify -CAfile "$CA_CRT" -purpose sslserver "$WORK/server.crt" >/dev/null \
  || die "The new certificate does not verify against the CA."
for ip in $ADDRS; do
  openssl verify -CAfile "$CA_CRT" -purpose sslserver -verify_ip "$ip" "$WORK/server.crt" >/dev/null \
    || die "The new certificate is not valid for $ip."
done

mkdir -p "$(dirname "$CERT")" "$(dirname "$KEY")"
[[ -f "$CERT" ]] && cp -a "$CERT" "$CERT.bak"
[[ -f "$KEY" ]] && cp -a "$KEY" "$KEY.bak"
install -m 600 "$WORK/server.key" "$KEY"
install -m 644 "$WORK/server.crt" "$CERT"
umask 022
say "Issued server certificate (valid $CERT_DAYS days) for: ${SAN//,/ }"

# Public CA certificate for other devices (safe to share: it contains no secret).
install -m 644 "$CA_CRT" "$SCRIPT_DIR/$SITE-ca.crt"
[[ -n "${SUDO_USER:-}" ]] && chown "$SUDO_USER": "$SCRIPT_DIR/$SITE-ca.crt"

[[ $NO_INSTALL == 1 ]] && { say "Files created (NO_INSTALL=1: trust store and Apache untouched)."; exit 0; }

restorecon "$CERT" "$KEY" "$CA_DIR" -R 2>/dev/null || true

# ---------- 3. Trust the CA on this machine ----------
install -m 644 "$CA_CRT" "/etc/pki/ca-trust/source/anchors/$SITE-ca.crt"
update-ca-trust extract
say "CA trusted system-wide (curl, wget and other system apps)"

# Chrome/Chromium (and Firefox profiles) keep their own certificate databases per user.
if [[ -n "${SUDO_USER:-}" ]] && command -v certutil >/dev/null; then
  USER_HOME="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
  DBS=()
  [[ -d "$USER_HOME/.pki/nssdb" ]] && DBS+=("$USER_HOME/.pki/nssdb")
  for d in "$USER_HOME"/.mozilla/firefox/*/ "$USER_HOME"/.var/app/org.mozilla.firefox/.mozilla/firefox/*/; do
    [[ -f "$d/cert9.db" ]] && DBS+=("${d%/}")
  done
  for db in "${DBS[@]}"; do
    sudo -u "$SUDO_USER" certutil -d "sql:$db" -D -n "$CA_NAME" >/dev/null 2>&1 || true
    if sudo -u "$SUDO_USER" certutil -d "sql:$db" -A -t "C,," -n "$CA_NAME" -i "$CA_CRT" 2>/dev/null; then
      info "Trusted in browser profile: ${db/#$USER_HOME/\~}"
    else
      warn "Could not update ${db/#$USER_HOME/\~} (close the browser and re-run)"
    fi
  done
elif [[ -n "${SUDO_USER:-}" ]]; then
  warn "certutil not found (dnf install nss-tools) — Chrome may not trust the CA yet."
fi

# ---------- 4. Offer the CA on the website for phones / other PCs ----------
if [[ -d "$WEBROOT" ]]; then
  install -m 644 "$CA_CRT" "$WEBROOT/$SITE-ca.crt"
  restorecon "$WEBROOT/$SITE-ca.crt" 2>/dev/null || true
fi

# ---------- 5. Reload Apache ----------
if command -v httpd >/dev/null; then
  if httpd -t 2>/dev/null; then
    systemctl reload httpd
    say "Apache reloaded with the new certificate"
  else
    cp -a "$CERT.bak" "$CERT" 2>/dev/null || true
    cp -a "$KEY.bak" "$KEY" 2>/dev/null || true
    die "Apache config test failed — previous certificate restored."
  fi
fi

echo
say "Done. Restart your browsers, then open:"
for ip in $IPS; do info "https://$ip/"; done
info "https://localhost/   https://$HOST.local/"
echo
info "Other devices: download and install the CA certificate (one time):"
info "  https://$PRIMARY/$SITE-ca.crt   (or copy deploy/apache/$SITE-ca.crt)"
info "  Fingerprint: $(openssl x509 -in "$CA_CRT" -noout -fingerprint -sha256 | cut -d= -f2)"
