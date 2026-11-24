/**
 * Checks the translations before every build (npm run build runs it; also: npm run check:i18n).
 *
 *   - en.js and it.js have exactly the same keys
 *   - every text keeps the same {placeholders} in both languages
 *   - lists of items (advent days, quiz questions, elf jobs…) have the same length/shape
 *   - every data-i18n / data-i18n-attr key used in index.html exists
 *
 * Exits with an error message listing every problem found.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "it"];
const problems = [];

async function load(file, sandbox) {
  vm.runInNewContext(await readFile(path.join(ROOT, file), "utf8"), sandbox, { filename: file });
  return sandbox;
}

const dicts = {};
for (const lang of LANGS) {
  await load(`js/i18n/${lang}.js`, { I18n: { add: (code, d) => { dicts[code] = d; } } });
  if (!dicts[lang]) problems.push(`js/i18n/${lang}.js does not call I18n.add("${lang}", …)`);
}

const kind = (v) => (Array.isArray(v) ? "list" : v === null ? "null" : typeof v);
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

function compare(a, b, where) {
  if (kind(a) !== kind(b)) {
    problems.push(`${where}: ${kind(a)} in en, ${kind(b)} in it`);
    return;
  }
  if (typeof a === "string") {
    if (placeholders(a) !== placeholders(b)) problems.push(`${where}: placeholders differ (en {${placeholders(a)}} / it {${placeholders(b)}})`);
    if (!b.trim()) problems.push(`${where}: empty in it`);
    return;
  }
  if (Array.isArray(a)) {
    // Lists of plain texts may have different lengths (e.g. elf names); structured lists may not.
    const structured = a.some((x) => typeof x !== "string") || b.some((x) => typeof x !== "string");
    if (structured && a.length !== b.length) problems.push(`${where}: ${a.length} items in en, ${b.length} in it`);
    if (!b.length) problems.push(`${where}: empty list in it`);
    a.forEach((x, i) => { if (i < b.length && (structured || typeof x !== "string")) compare(x, b[i], `${where}[${i}]`); });
    if (!structured) b.forEach((x, i) => { if (!x.trim()) problems.push(`${where}[${i}]: empty text in it`); });
    return;
  }
  if (a && typeof a === "object") {
    for (const k of Object.keys(a)) {
      if (!(k in b)) problems.push(`${where}.${k}: missing in it`);
      else compare(a[k], b[k], `${where}.${k}`);
    }
    for (const k of Object.keys(b)) if (!(k in a)) problems.push(`${where}.${k}: missing in en (extra key in it)`);
  }
}
if (dicts.en && dicts.it) compare(dicts.en, dicts.it, "dict");

// Fixed sizes the code relies on.
const expect = (cond, msg) => { if (!cond) problems.push(msg); };
for (const lang of LANGS) {
  const d = dicts[lang];
  if (!d) continue;
  expect(d.advent?.days?.length === 24, `${lang}: advent.days must have 24 days`);
  expect(d.quiz?.questions?.length === 6 && d.quiz.questions.every((q) => q.a?.length === 4),
    `${lang}: quiz.questions must have 6 questions with 4 answers (scoring is in reindeer-quiz.js)`);
  expect(d.elf?.jobs?.every((j) => Array.isArray(j) && j.length === 2), `${lang}: elf.jobs must be [job, department] pairs`);
}

// Keys used by the HTML.
const lookup = (obj, key) => key.split(".").reduce((o, k) => (o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
const html = await readFile(path.join(ROOT, "index.html"), "utf8");
const htmlKeys = [
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) => m[1].split(";").map((p) => p.split(":")[1]?.trim())),
];
for (const key of htmlKeys) {
  if (!key) { problems.push("index.html: malformed data-i18n-attr"); continue; }
  if (typeof lookup(dicts.en, key) !== "string") problems.push(`index.html uses "${key}", which is not a text in en.js`);
}

if (problems.length) {
  console.error(`✖ Translation check failed (${problems.length} problem${problems.length === 1 ? "" : "s"}):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`✔ Translations OK (${LANGS.join(", ")}; ${htmlKeys.length} keys used in index.html)`);
