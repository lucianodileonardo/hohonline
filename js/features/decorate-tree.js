/**
 * Feature: Decorate the Tree
 * A canvas tree. Pick a decoration and tap to place it; drag to move;
 * eraser to remove. The tree is saved in this browser and can be downloaded.
 */
(function () {
  const U = SantaUtils;
  const STORAGE_KEY = "north-pole-online:tree";
  const W = 800;
  const H = 900;
  const MAX_ITEMS = 150;

  // Balls are drawn; everything else is an emoji.
  const DECORATIONS = [
    { id: "ball-red", kind: "ball", color: "#d7263d" },
    { id: "ball-gold", kind: "ball", color: "#f2b632" },
    { id: "ball-blue", kind: "ball", color: "#2e86de" },
    { id: "ball-silver", kind: "ball", color: "#c9d1d9" },
    { id: "ball-purple", kind: "ball", color: "#8e44ad" },
    { id: "bell", kind: "emoji", char: "🔔" },
    { id: "bow", kind: "emoji", char: "🎀" },
    { id: "candy", kind: "emoji", char: "🍬" },
    { id: "lolly", kind: "emoji", char: "🍭" },
    { id: "star", kind: "emoji", char: "⭐" },
    { id: "snowflake", kind: "emoji", char: "❄️" },
    { id: "cookie", kind: "emoji", char: "🍪" },
    { id: "bear", kind: "emoji", char: "🧸" },
    { id: "deer", kind: "emoji", char: "🦌" },
    { id: "angel", kind: "emoji", char: "👼" },
    { id: "gift", kind: "emoji", char: "🎁" },
  ];
  const BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(DECORATIONS.map((d) => [d.id, d]))));

  const BALL_R = 24;
  const EMOJI_SIZE = 54;
  const LIGHT_COLORS = ["#ff4d4d", "#ffd23f", "#4dd2ff", "#7dff6b", "#ff8cf0"];

  let canvas, ctx, palette;
  let state = { items: [], lights: false, topStar: false };
  let history = [];
  let selected = DECORATIONS[0].id;
  let eraser = false;
  let drag = null; // { item, dx, dy, moved, before }
  let lightPhase = 0;
  let lightTimer = null;
  let background = null;

  function init() {
    canvas = document.getElementById("tree-canvas");
    ctx = canvas.getContext("2d");
    palette = document.getElementById("tree-palette");

    // Validate saved data strictly: storage may be corrupted or edited by hand.
    const saved = U.storage.get(STORAGE_KEY, null);
    if (saved && typeof saved === "object" && Array.isArray(saved.items)) {
      const valid = (n, max) => Number.isFinite(n) && n >= 0 && n <= max;
      state = {
        items: saved.items
          .filter((i) => i && typeof i === "object" && Object.prototype.hasOwnProperty.call(BY_ID, i.type) && valid(i.x, W) && valid(i.y, H))
          .slice(0, MAX_ITEMS)
          .map((i) => ({ type: i.type, x: Math.round(i.x), y: Math.round(i.y) })),
        lights: saved.lights === true,
        topStar: saved.topStar === true,
      };
    }

    buildPalette();
    background = buildBackground();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const eraserBtn = document.getElementById("tree-eraser");
    eraserBtn.addEventListener("click", () => {
      eraser = !eraser;
      eraserBtn.setAttribute("aria-pressed", String(eraser));
      canvas.classList.toggle("is-erasing", eraser);
      updatePalette();
    });

    toggleButton("tree-lights", "lights", () => syncLights());
    toggleButton("tree-star", "topStar");

    document.getElementById("tree-undo").addEventListener("click", () => {
      if (!history.length) return;
      state = history.pop();
      syncButtons();
      syncLights();
      save();
      draw();
    });

    document.getElementById("tree-clear").addEventListener("click", () => {
      if (!state.items.length && !state.topStar && !state.lights) return;
      pushHistory();
      state = { items: [], lights: false, topStar: false };
      syncButtons();
      syncLights();
      save();
      draw();
    });

    document.getElementById("tree-download").addEventListener("click", () => {
      U.downloadCanvas(canvas, I18n.t("tree.file"));
    });

    syncButtons();
    draw();
  }

  function toggleButton(id, key, after) {
    const btn = document.getElementById(id);
    btn.addEventListener("click", () => {
      pushHistory();
      state[key] = !state[key];
      syncButtons();
      if (after) after();
      save();
      draw();
    });
  }

  function syncButtons() {
    document.getElementById("tree-lights").setAttribute("aria-pressed", String(state.lights));
    document.getElementById("tree-star").setAttribute("aria-pressed", String(state.topStar));
  }

  function buildPalette() {
    DECORATIONS.forEach((d) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tree-swatch";
      btn.setAttribute("role", "radio");
      const label = I18n.t(`tree.items.${d.id}`);
      btn.setAttribute("aria-label", label);
      btn.title = label;
      btn.dataset.id = d.id;
      if (d.kind === "ball") {
        const dot = document.createElement("span");
        dot.className = "tree-swatch__ball";
        dot.style.setProperty("--ball", d.color);
        btn.appendChild(dot);
      } else {
        btn.textContent = d.char;
      }
      btn.addEventListener("click", () => {
        selected = d.id;
        if (eraser) document.getElementById("tree-eraser").click();
        updatePalette();
      });
      palette.appendChild(btn);
    });
    updatePalette();
  }

  function updatePalette() {
    for (const btn of palette.children) {
      const on = !eraser && btn.dataset.id === selected;
      btn.setAttribute("aria-checked", String(on));
    }
  }

  // ---------- Pointer handling ----------
  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function hitTest(p) {
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      const r = BY_ID[it.type].kind === "ball" ? BALL_R + 6 : EMOJI_SIZE / 2 + 4;
      if ((p.x - it.x) ** 2 + (p.y - it.y) ** 2 <= r * r) return it;
    }
    return null;
  }

  function onDown(e) {
    const p = toCanvas(e);
    const hit = hitTest(p);

    if (eraser) {
      if (hit) {
        pushHistory();
        state.items = state.items.filter((i) => i !== hit);
        save();
        draw();
      }
      return;
    }

    if (hit) {
      // Bring to front and start dragging.
      const before = snapshot();
      state.items = state.items.filter((i) => i !== hit).concat(hit);
      drag = { item: hit, dx: p.x - hit.x, dy: p.y - hit.y, moved: false, before };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("is-dragging");
      draw();
      return;
    }

    if (state.items.length >= MAX_ITEMS) return;
    pushHistory();
    state.items.push({ type: selected, x: Math.round(p.x), y: Math.round(p.y) });
    save();
    draw();
  }

  function onMove(e) {
    if (!drag) return;
    const p = toCanvas(e);
    drag.item.x = Math.round(Math.max(0, Math.min(W, p.x - drag.dx)));
    drag.item.y = Math.round(Math.max(0, Math.min(H, p.y - drag.dy)));
    drag.moved = true;
    draw();
  }

  function onUp() {
    if (!drag) return;
    if (drag.moved) {
      history.push(drag.before);
      trimHistory();
      save();
    }
    drag = null;
    canvas.classList.remove("is-dragging");
  }

  // ---------- State ----------
  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }
  function pushHistory() {
    history.push(snapshot());
    trimHistory();
  }
  function trimHistory() {
    if (history.length > 50) history.shift();
  }
  function save() {
    U.storage.set(STORAGE_KEY, state);
  }

  function syncLights() {
    const panelVisible = !document.querySelector('[data-feature="decorate-tree"]').hidden;
    if (state.lights && panelVisible && !U.reducedMotion()) {
      if (!lightTimer) {
        lightTimer = setInterval(() => {
          lightPhase = (lightPhase + 1) % LIGHT_COLORS.length;
          draw();
        }, 600);
      }
    } else if (lightTimer) {
      clearInterval(lightTimer);
      lightTimer = null;
    }
  }

  // ---------- Drawing ----------
  const TIERS = [
    // [top y, bottom y, half width at bottom]
    [130, 360, 170],
    [260, 540, 250],
    [420, 730, 330],
  ];

  function buildBackground() {
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const c = off.getContext("2d");

    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0b1a33");
    sky.addColorStop(1, "#1f3b6e");
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);

    // Stars & snow (same every time)
    const rand = U.seededRandom(1225);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
      c.beginPath();
      c.arc(rand() * W, rand() * H * 0.85, 0.8 + rand() * 2.2, 0, Math.PI * 2);
      c.fill();
    }

    // Snowy ground
    c.fillStyle = "#eef5ff";
    c.beginPath();
    c.moveTo(0, 790);
    c.quadraticCurveTo(W * 0.25, 760, W * 0.5, 785);
    c.quadraticCurveTo(W * 0.75, 810, W, 775);
    c.lineTo(W, H);
    c.lineTo(0, H);
    c.closePath();
    c.fill();

    // Trunk
    c.fillStyle = "#6b4226";
    c.fillRect(W / 2 - 38, 720, 76, 80);
    c.fillStyle = "#553219";
    c.fillRect(W / 2 + 10, 720, 28, 80);

    // Tiers (bottom first so upper tiers overlap)
    [...TIERS].reverse().forEach(([top, bottom, half], idx) => {
      const g = c.createLinearGradient(W / 2 - half, 0, W / 2 + half, 0);
      g.addColorStop(0, "#0f5a30");
      g.addColorStop(0.5, "#1e8f4f");
      g.addColorStop(1, "#0d4a27");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(W / 2, top);
      // Wavy bottom edge
      c.lineTo(W / 2 + half, bottom);
      const scallops = 6 + idx;
      for (let s = 1; s <= scallops; s++) {
        const x = W / 2 + half - (2 * half * s) / scallops;
        const cx = x + half / scallops;
        c.quadraticCurveTo(cx, bottom + 22, x, bottom);
      }
      c.closePath();
      c.fill();
    });

    // Presents under the tree
    drawPresent(c, 175, 735, 110, 75, "#c8102e", "#f8b229");
    drawPresent(c, 520, 745, 95, 65, "#2e86de", "#fff");
    drawPresent(c, 610, 765, 70, 50, "#f8b229", "#c8102e");
    return off;
  }

  function drawPresent(c, x, y, w, h, color, ribbon) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
    c.fillStyle = ribbon;
    c.fillRect(x + w / 2 - 7, y, 14, h);
    c.fillRect(x, y + h / 2 - 6, w, 12);
    c.beginPath();
    c.ellipse(x + w / 2 - 14, y - 6, 14, 8, -0.4, 0, Math.PI * 2);
    c.ellipse(x + w / 2 + 14, y - 6, 14, 8, 0.4, 0, Math.PI * 2);
    c.fill();
  }

  function draw() {
    ctx.drawImage(background, 0, 0);
    if (state.lights) drawLights();
    for (const it of state.items) drawItem(it);
    if (state.topStar) drawTopStar();
  }

  function drawLights() {
    // Garlands of bulbs draped across each tier.
    const garlands = [[200, 300, 105], [340, 470, 175], [480, 640, 250], [600, 700, 300]];
    let n = 0;
    garlands.forEach(([y1, y2, half]) => {
      ctx.strokeStyle = "rgba(20, 30, 20, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - half, y1);
      ctx.quadraticCurveTo(W / 2, y2 + 20, W / 2 + half, y1 + (y2 - y1) * 0.4);
      ctx.stroke();
      const bulbs = 9;
      for (let i = 0; i <= bulbs; i++) {
        const t = i / bulbs;
        const x = (1 - t) ** 2 * (W / 2 - half) + 2 * (1 - t) * t * (W / 2) + t * t * (W / 2 + half);
        const y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (y2 + 20) + t * t * (y1 + (y2 - y1) * 0.4);
        const color = LIGHT_COLORS[(n + lightPhase) % LIGHT_COLORS.length];
        n++;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawItem(it) {
    const d = BY_ID[it.type];
    if (d.kind === "ball") {
      // Hook + cap
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(it.x, it.y - BALL_R - 6);
      ctx.lineTo(it.x, it.y - BALL_R - 16);
      ctx.stroke();
      ctx.fillStyle = "#b8a067";
      ctx.fillRect(it.x - 7, it.y - BALL_R - 8, 14, 9);
      const g = ctx.createRadialGradient(it.x - 8, it.y - 8, 3, it.x, it.y, BALL_R);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.25, d.color);
      g.addColorStop(1, shade(d.color, -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(it.x, it.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `${EMOJI_SIZE}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.char, it.x, it.y);
    }
  }

  function drawTopStar() {
    const x = W / 2, y = 115, outer = 62, inner = 26;
    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 80, 0.9)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#d99a12";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + v * amount)));
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  }

  SantaFeatures.register({
    id: "decorate-tree",
    icon: "🎄",
    title: I18n.t("features.tree.title"),
    shortTitle: I18n.t("features.tree.short"),
    description: I18n.t("features.tree.desc"),
    init,
    onShow: () => { syncLights(); draw(); },
    onHide: () => {
      if (lightTimer) {
        clearInterval(lightTimer);
        lightTimer = null;
      }
    },
  });
})();
