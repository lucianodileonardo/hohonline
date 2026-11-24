/** Small helpers shared by all features. */
window.SantaUtils = (function () {
  const CONFETTI = ["⭐", "🎁", "❄️", "🎄", "✨", "🔔"];
  const DAY_MS = 86400000;

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function formatName(raw) {
    const trimmed = String(raw || "").trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function celebrate(count = 40) {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "confetti";
      el.textContent = pick(CONFETTI);
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDuration = 2.5 + Math.random() * 2 + "s";
      el.style.animationDelay = Math.random() * 0.6 + "s";
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
  }

  /** Runs `steps` text updates on `el`, one every `ms`, then calls `done`. */
  function playSteps(el, steps, ms, done) {
    steps.forEach((text, i) => {
      setTimeout(() => { el.textContent = text; }, i * ms);
    });
    setTimeout(done, steps.length * ms + 300);
  }

  /** Restarts a CSS animation on an element. */
  function restartAnimation(el) {
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }

  /** Stable 32-bit hash of a string (same input → same number). */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Deterministic pseudo-random generator from a seed (mulberry32). */
  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** The year of the upcoming (or current) Christmas. */
  function christmasYear(now = new Date()) {
    return now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
  }

  /** Whole days until Christmas Day (0 on Christmas Day). */
  function daysUntilChristmas(now = new Date()) {
    const xmas = new Date(christmasYear(now), 11, 25);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((xmas - today) / DAY_MS);
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString(window.I18n ? I18n.locale : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  /** Waits for the web fonts used on canvases (never rejects). */
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 40px "Mountains of Christmas"'),
      document.fonts.load('800 20px "Nunito"'),
      document.fonts.load('400 20px "Nunito"'),
    ]).catch(() => {});
  }

  /** Saves a canvas as a PNG file. */
  function downloadCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  /** Makes a safe file name from a person's name. */
  function slug(text) {
    return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "santa";
  }

  // One-time migration of data saved before the site was renamed.
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith("contact-santa:")) continue;
      const newKey = "north-pole-online:" + key.slice("contact-santa:".length);
      if (localStorage.getItem(newKey) == null) localStorage.setItem(newKey, localStorage.getItem(key));
      localStorage.removeItem(key);
    }
  } catch (e) { /* storage unavailable */ }

  /** localStorage that never throws (private mode, blocked storage…). */
  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  /** Canvas helper: text that shrinks to fit `maxWidth`. */
  function fitText(ctx, text, x, y, maxWidth, size, fontTemplate) {
    let s = size;
    do {
      ctx.font = fontTemplate.replace("{size}", s + "px");
      if (ctx.measureText(text).width <= maxWidth) break;
      s -= 2;
    } while (s > 12);
    ctx.fillText(text, x, y);
  }

  /** Canvas helper: rounded rectangle path. */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return {
    pick, formatName, reducedMotion, celebrate, playSteps, restartAnimation,
    hashString, seededRandom, christmasYear, daysUntilChristmas, formatDate,
    fontsReady, downloadCanvas, slug, storage, fitText, roundRect,
  };
})();
