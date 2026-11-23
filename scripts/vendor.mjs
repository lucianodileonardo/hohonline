/**
 * Copies third-party browser files from node_modules into vendor/ so the site
 * is fully self-hosted (no CDN, no Google Fonts): better privacy, no
 * third-party code at runtime, and a strict Content-Security-Policy.
 *
 * Runs automatically before `npm start`, `npm run build`, etc.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NM = path.join(ROOT, "node_modules");
const VENDOR = path.join(ROOT, "vendor");

const FILES = [
  ["leaflet/dist/leaflet.js", "leaflet/leaflet.js"],
  ["leaflet/dist/leaflet.css", "leaflet/leaflet.css"],
  ["leaflet/dist/images", "leaflet/images"],
  ["@fontsource/nunito/files/nunito-latin-400-normal.woff2", "fonts/nunito-400.woff2"],
  ["@fontsource/nunito/files/nunito-latin-400-italic.woff2", "fonts/nunito-400-italic.woff2"],
  ["@fontsource/nunito/files/nunito-latin-600-normal.woff2", "fonts/nunito-600.woff2"],
  ["@fontsource/nunito/files/nunito-latin-800-normal.woff2", "fonts/nunito-800.woff2"],
  ["@fontsource/mountains-of-christmas/files/mountains-of-christmas-latin-700-normal.woff2", "fonts/mountains-of-christmas-700.woff2"],
];

try {
  await stat(NM);
} catch {
  console.error("✖ node_modules is missing — run `npm install` first.");
  process.exit(1);
}

await rm(VENDOR, { recursive: true, force: true });
for (const [from, to] of FILES) {
  const dest = path.join(VENDOR, to);
  await mkdir(path.dirname(dest), { recursive: true });
  await cp(path.join(NM, from), dest, { recursive: true });
}
console.log(`✔ Vendor files ready (${FILES.length} entries in vendor/)`);
