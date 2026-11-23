# ---------- Stage 1: build the static site ----------
# For fully reproducible builds, pin images by digest, e.g.
#   FROM docker.io/library/node:22-alpine@sha256:<digest>
FROM docker.io/library/node:22-alpine AS build
WORKDIR /app

# Install dependencies first (cached unless package files change).
# --ignore-scripts: never run install scripts from third-party packages.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# Build the optimized site into dist/.
COPY index.html ./
COPY css ./css
COPY js ./js
COPY scripts ./scripts
RUN npm run build \
 && find dist -type d -exec chmod 755 {} + \
 && find dist -type f -exec chmod 644 {} +

# ---------- Stage 2: serve it with nginx ----------
# Unprivileged image: runs as a non-root user and listens on 8080,
# which works well with rootless Podman.
FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine

COPY --chown=root:root --chmod=644 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=root:root --chmod=644 security-headers.conf /etc/nginx/snippets/security-headers.conf
# Site files are owned by root and read-only for the nginx user.
COPY --from=build --chown=root:root /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
