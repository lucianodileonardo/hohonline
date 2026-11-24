/**
 * Translations (English and Italian).
 *
 * - Texts live in js/i18n/<lang>.js, registered with I18n.add(lang, dictionary).
 * - In code:  I18n.t("letter.heading"), I18n.t("non.yes", { name }), I18n.plural("advent.daysLeft", n)
 * - In HTML:  <p data-i18n="site.tagline">English fallback</p>
 *             <input data-i18n-attr="placeholder:common.namePlaceholder">
 * - The language comes from ?lang=it|en, then the saved choice, then the browser language.
 *   Switching language saves the choice and reloads the page (keeping the current #feature).
 *
 * Missing Italian texts fall back to English; `npm run build` refuses to build if the two
 * dictionaries don't have the same keys (scripts/check-i18n.mjs).
 */
window.I18n = (function () {
  const LANGS = {
    en: { label: "English", short: "EN", locale: "en-GB" },
    it: { label: "Italiano", short: "IT", locale: "it-IT" },
  };
  const DEFAULT = "en";
  const STORAGE_KEY = "north-pole-online:lang";
  const dicts = Object.create(null);
  const has = (o, k) => o != null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);

  function detect() {
    try {
      const fromUrl = new URLSearchParams(location.search).get("lang");
      if (has(LANGS, fromUrl)) {
        SantaUtils.storage.set(STORAGE_KEY, fromUrl);
        return fromUrl;
      }
    } catch (e) { /* ignore */ }
    const saved = SantaUtils.storage.get(STORAGE_KEY, null);
    if (has(LANGS, saved)) return saved;
    const preferred = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
    for (const tag of preferred) {
      const base = String(tag).toLowerCase().split("-")[0];
      if (has(LANGS, base)) return base;
    }
    return DEFAULT;
  }

  const lang = detect();
  const locale = LANGS[lang].locale;
  document.documentElement.lang = lang;

  function lookup(dict, key) {
    let value = dict;
    for (const part of key.split(".")) {
      if (!has(value, part)) return undefined;
      value = value[part];
    }
    return value;
  }

  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, k) => (has(vars, k) ? String(vars[k]) : m));
  }

  /** The text (or list/object) for `key` in the current language, with {placeholders} filled in. */
  function t(key, vars) {
    let value = lookup(dicts[lang], key);
    if (value === undefined) value = lookup(dicts[DEFAULT], key);
    if (value === undefined) {
      if (window.console) console.warn("[i18n] missing text:", key);
      return key;
    }
    return typeof value === "string" ? fill(value, vars) : value;
  }

  /** `key.one` for 1, `key.other` otherwise; {n} is the formatted number. */
  function plural(key, n, vars) {
    return t(`${key}.${n === 1 ? "one" : "other"}`, Object.assign({ n: number(n) }, vars));
  }

  function number(n) {
    return Number(n).toLocaleString(locale);
  }

  /** "a, b and c" / "a, b e c" */
  function list(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + t("common.and") + items[items.length - 1];
  }

  /** Fills every [data-i18n] / [data-i18n-attr] element below `root`. */
  function applyDom(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      for (const pair of el.getAttribute("data-i18n-attr").split(";")) {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key && !/^on/i.test(attr)) el.setAttribute(attr, t(key));
      }
    });
  }

  function setLang(next) {
    if (!has(LANGS, next) || next === lang) return;
    SantaUtils.storage.set(STORAGE_KEY, next);
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    // Same address (only the #feature differs or nothing) → replace() wouldn't reload.
    if (url.toString() === location.href) location.reload();
    else location.replace(url.toString());
  }

  function add(code, dict) {
    if (has(LANGS, code)) dicts[code] = dict;
  }

  return { lang, locale, langs: LANGS, t, plural, number, list, applyDom, setLang, add };
})();
