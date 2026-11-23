/**
 * Zips dist/ into release/<name>-<version>.zip
 * Run `npm run build` first (the `package` npm script does both).
 *
 * Uses only Node built-ins (no third-party zip library = smaller supply chain).
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const RELEASE = path.join(ROOT, "release");

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
if (!/^[a-z0-9-]+$/.test(pkg.name) || !/^[0-9A-Za-z.+-]+$/.test(pkg.version)) {
  console.error("✖ Unexpected characters in package name/version.");
  process.exit(1);
}

try {
  await stat(path.join(DIST, "index.html"));
} catch {
  console.error("✖ dist/ is missing — run `npm run build` first.");
  process.exit(1);
}

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else if (entry.isFile()) out.push(full); // symlinks etc. are skipped on purpose
  }
  return out.sort();
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

const files = await listFiles(DIST);
const locals = [];
const centrals = [];
let offset = 0;

for (const file of files) {
  const name = Buffer.from(path.relative(DIST, file).split(path.sep).join("/"), "utf8");
  const data = await readFile(file);
  const deflated = deflateRawSync(data, { level: 9 });
  const useDeflate = deflated.length < data.length;
  const body = useDeflate ? deflated : data;
  const crc = crc32(data);
  const { time, day } = dosDateTime((await stat(file)).mtime);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(useDeflate ? 8 : 0, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(day, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(0x031e, 4); // made by: Unix, v3.0
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(useDeflate ? 8 : 0, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(day, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
  central.writeUInt32LE(offset, 42);

  locals.push(local, name, body);
  centrals.push(central, name);
  offset += local.length + name.length + body.length;
}

const centralDir = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);

await mkdir(RELEASE, { recursive: true });
const out = path.join(RELEASE, `${pkg.name}-${pkg.version}.zip`);
const zip = Buffer.concat([...locals, centralDir, end]);
await writeFile(out, zip);
console.log(`✔ Package ready: ${path.relative(ROOT, out)} (${(zip.length / 1024).toFixed(1)} KB, ${files.length} files)`);
