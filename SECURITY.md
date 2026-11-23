# Security — North Pole Online

Last assessment: 2026-11-23

## Threat model

North Pole Online is a **static, client-side site**:

- No backend, no database, no accounts, no cookies, no analytics.
- Nothing typed by visitors leaves their browser (letters, names, wishes are processed locally).
- The only data stored is in the visitor's own `localStorage` (decorated tree, opened advent doors).
- The only external service contacted at runtime is **OpenStreetMap** (map tiles on the Santa Tracker page).

Main risks are therefore: script injection (XSS), third-party / supply-chain code, clickjacking,
misconfigured hosting, and the container runtime.

## Controls in place

| Area | Control |
|---|---|
| XSS | All user input is rendered with `textContent` or drawn on `<canvas>`; no `innerHTML`, `eval` or inline handlers anywhere in the code. |
| Content-Security-Policy | `script-src 'self'`, `style-src 'self'`, no inline scripts/styles, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`. Sent by nginx and as a `<meta>` tag (for other hosts). |
| Third-party code | Leaflet and fonts are **self-hosted** from pinned npm versions (`scripts/vendor.mjs`). No CDN, no Google Fonts (also avoids sending visitor IPs to Google — GDPR). |
| Local storage | Data read from `localStorage` is validated (types, ranges, allow-listed ids) before use; corrupted data is ignored. |
| Routing | Malformed URL hashes cannot crash the app. |
| HTTP headers | CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geolocation… disabled), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` — on **every** response (`security-headers.conf`). |
| nginx | Only `GET`/`HEAD` (others → 405), hidden files (`.git`, `.env`…) → 404, no directory listing, no version in `Server` header, small body limit and short timeouts. |
| Container | Non-root user, files owned by root and read-only, read-only root filesystem, all Linux capabilities dropped, `no-new-privileges`, memory and process limits (`npm run container:run`). |
| Build | `npm ci --ignore-scripts` (no third-party install scripts), only needed files in the image (`.dockerignore`), no runtime npm dependencies. |
| Dev server | `npm start` / `npm run preview` are reachable on the LAN, with directory listings disabled (`serve.json`). Individual project files can still be fetched by exact path, so use the dev server only on trusted networks; use the container for anything public. |
| Dependencies | `npm audit`: 0 known vulnerabilities. The zip packager uses only Node built-ins. |

## Known limitations / accepted risks

- **HTTPS on Apache** uses a certificate signed by a private, name-constrained local CA
  (`deploy/apache/make-cert.sh`). The CA key lives in `/etc/pki/north-pole-online-ca/` (root only) and can
  only sign local names and private IP ranges. Devices must install `north-pole-online-ca.crt` once.
  Re-run `make-cert.sh` before the server certificate expires (397 days) or when the IP changes.
- **No HTTPS in the container.** Serve it behind a TLS reverse proxy (Caddy, Traefik, nginx) before
  exposing it to the internet, then enable the `Strict-Transport-Security` line in `security-headers.conf`.
  Without HTTPS the "Share" button on the Elf page falls back to a message (browser requirement).
- **OpenStreetMap tiles** reveal the visitor's IP to OpenStreetMap when the tracker map is opened.
  Mention it in the privacy notice, or switch to a self-hosted / contracted tile provider.
- **Leaflet tooltips** use HTML internally; only static, hard-coded city names are passed to them.
- `?preview` unlocks all advent doors — intentional (testing), not a security boundary.
- Base images are pinned by tag, not digest. For reproducible builds pin `@sha256:` digests.

## Routine checks

```bash
npm audit                 # dependency vulnerabilities
npm run container:build   # rebuild with latest patched base images
```

Rebuild the container regularly so the nginx/Alpine base image picks up security patches.
