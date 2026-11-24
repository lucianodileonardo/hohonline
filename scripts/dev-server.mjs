/**
 * Development server for `npm start`: serves the site straight from the source files.
 *
 * Only the public parts of the project are served (index.html, css/, js/, vendor/, images/,
 * fonts/). Everything else — .git, scripts, node_modules, config files — answers 404, because the server listens on the LAN.
 *
 *   node scripts/dev-server.mjs [port]      (default 3000, or the PORT environment variable)
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC = /^\/(?:index\.html|(?:css|js|vendor|images|fonts)\/[^]+)$/;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
};

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname); } catch { return notFound(res); }
  if (urlPath === "/") urlPath = "/index.html";
  // Allow-list only, and no "..", hidden files or backslashes anywhere in the path.
  if (!PUBLIC.test(urlPath) || /(^|\/)\.|\\|\0/.test(urlPath)) return notFound(res);

  const file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT + path.sep)) return notFound(res);
  let info;
  try { info = await stat(file); } catch { return notFound(res); }
  if (!info.isFile()) return notFound(res);

  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => {
  console.log(`North Pole Online (development) → http://localhost:${PORT}  (listening on ${HOST}:${PORT})`);
});
