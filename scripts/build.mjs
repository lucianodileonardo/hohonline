/**
 * Builds a production copy of the site into dist/.
 *
 *   - Combines all local <script> files (in page order) into one minified,
 *     content-hashed file: assets/app.<hash>.js
 *   - Minifies css/style.css into assets/style.<hash>.css
 *   - Rewrites index.html to use them
 *   - Copies any extra static files listed in STATIC_DIRS
 *
 * Usage: node scripts/build.mjs
 */
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const STATIC_DIRS = ["vendor", "images", "audio", "fonts"]; // copied as-is if they exist
const STATIC_FILES = ["robots.txt", "favicon.ico"];

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 10);
const exists = (p) => stat(p).then(() => true, () => false);
const kb = (n) => (n / 1024).toFixed(1) + " KB";

async function build() {
  const started = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "assets"), { recursive: true });

  let html = await readFile(path.join(ROOT, "index.html"), "utf8");

  // ---------- JavaScript ----------
  const scriptTag = /^[ \t]*<script src="(?!https?:\/\/|vendor\/)([^"]+)"><\/script>\s*$/gm;
  const localScripts = [...html.matchAll(scriptTag)].map((m) => m[1]);
  if (!localScripts.length) throw new Error("No local <script> tags found in index.html");

  let jsSource = "";
  for (const src of localScripts) {
    const code = await readFile(path.join(ROOT, src), "utf8");
    jsSource += `\n;/* ${src} */\n${code}\n`;
  }
  const js = await transform(jsSource, { minify: true, target: "es2020", charset: "utf8", legalComments: "none" });
  const jsName = `assets/app.${hash(js.code)}.js`;
  await writeFile(path.join(DIST, jsName), js.code);

  // Replace all local script tags with the single bundle (where the first one was).
  let replaced = false;
  html = html.replace(scriptTag, () => {
    if (replaced) return "";
    replaced = true;
    return `  <script src="${jsName}"></script>\n`;
  });

  // ---------- CSS ----------
  const cssHref = "css/style.css";
  const cssSource = await readFile(path.join(ROOT, cssHref), "utf8");
  const css = await transform(cssSource, { loader: "css", minify: true, charset: "utf8", legalComments: "none" });
  const cssName = `assets/style.${hash(css.code)}.css`;
  await writeFile(path.join(DIST, cssName), css.code);
  if (!html.includes(`href="${cssHref}"`)) throw new Error(`index.html does not reference ${cssHref}`);
  html = html.replace(`href="${cssHref}"`, `href="${cssName}"`);

  // ---------- HTML ----------
  html = html
    .replace(/<!--[\s\S]*?-->/g, "") // drop comments
    .replace(/\n\s*\n+/g, "\n"); // drop blank lines
  await writeFile(path.join(DIST, "index.html"), html);

  // ---------- Static files ----------
  for (const dir of STATIC_DIRS) {
    if (await exists(path.join(ROOT, dir))) await cp(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
  }
  for (const file of STATIC_FILES) {
    if (await exists(path.join(ROOT, file))) await cp(path.join(ROOT, file), path.join(DIST, file));
  }

  console.log(`✔ Built dist/ in ${Date.now() - started} ms`);
  console.log(`  index.html          ${kb(Buffer.byteLength(html))}`);
  console.log(`  ${jsName.padEnd(19)} ${kb(Buffer.byteLength(js.code))}  (${localScripts.length} files, from ${kb(Buffer.byteLength(jsSource))})`);
  console.log(`  ${cssName.padEnd(19)} ${kb(Buffer.byteLength(css.code))}  (from ${kb(Buffer.byteLength(cssSource))})`);
}

build().catch((err) => {
  console.error("✖ Build failed:", err.message);
  process.exit(1);
});
