/**
 * Feature: Advent Calendar
 * Door N can be opened from December N onwards. Opened doors are remembered
 * in this browser. Add ?preview to the URL to unlock every door (for testing).
 */
(function () {
  const U = SantaUtils;
  const STORAGE_KEY = "north-pole-online:advent-opened";

  const { t } = I18n;

  // The kind of surprise behind each door (1 → 24). Titles and texts: I18n "advent.days".
  // Jokes have two lines; the second (the punchline) is hidden until tapped.
  const TYPES = [
    "joke", "fact", "activity", "kindness", "joke", "recipe", "fact", "song",
    "joke", "activity", "kindness", "fact", "joke", "recipe", "activity", "fact",
    "song", "joke", "kindness", "activity", "fact", "recipe", "activity", "song",
  ];
  const dayContent = (n) => Object.assign({ type: TYPES[n - 1] }, t("advent.days")[n - 1]);

  const ICONS = { joke: "😂", fact: "🧠", activity: "✂️", recipe: "🍪", song: "🎶", kindness: "💝" };
  const COLORS = ["red", "green", "gold", "blue"];
  // Fixed shuffled order so the doors aren't in sequence (like a real calendar).
  const ORDER = [7, 15, 2, 21, 11, 18, 4, 24, 13, 1, 9, 20, 16, 6, 23, 10, 3, 14, 22, 8, 19, 5, 12, 17];

  let grid, banner, hint, dialog, opened;
  const preview = new URLSearchParams(location.search).has("preview");

  function init() {
    grid = document.getElementById("advent-grid");
    banner = document.getElementById("advent-banner");
    hint = document.getElementById("advent-hint");
    dialog = document.getElementById("advent-dialog");
    // Only accept valid door numbers from storage (it may be corrupted or edited).
    const saved = U.storage.get(STORAGE_KEY, []);
    opened = new Set((Array.isArray(saved) ? saved : []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 24));

    ORDER.forEach((day, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `advent-door advent-door--${COLORS[(day * 3 + i) % COLORS.length]}`;
      btn.dataset.day = day;
      const front = document.createElement("span");
      front.className = "advent-door__front";
      front.textContent = String(day);
      const inside = document.createElement("span");
      inside.className = "advent-door__inside";
      inside.setAttribute("aria-hidden", "true");
      inside.textContent = ICONS[TYPES[day - 1]];
      btn.append(front, inside);
      btn.addEventListener("click", () => openDoor(day, btn));
      grid.appendChild(btn);
    });

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close(); // click on backdrop
    });

    refresh();
  }

  /** Highest door number that may be opened today (0 = none). */
  function unlockedUpTo() {
    if (preview) return 24;
    const now = new Date();
    if (now.getMonth() !== 11) return 0;
    return Math.min(now.getDate(), 24);
  }

  function refresh() {
    const upTo = unlockedUpTo();
    const now = new Date();

    for (const btn of grid.children) {
      const day = Number(btn.dataset.day);
      const isOpen = opened.has(day);
      const isLocked = day > upTo;
      btn.classList.toggle("is-open", isOpen);
      btn.classList.toggle("is-locked", isLocked);
      btn.classList.toggle("is-today", day === upTo && !isOpen && !preview && now.getMonth() === 11 && now.getDate() <= 24);
      btn.setAttribute("aria-label", isLocked ? t("advent.doorLocked", { day }) : isOpen ? t("advent.doorOpened", { day, title: dayContent(day).title }) : t("advent.doorReady", { day }));
    }

    if (preview) {
      banner.textContent = t("advent.preview");
    } else if (now.getMonth() !== 11) {
      const firstDec = new Date(now.getFullYear(), 11, 1);
      const days = Math.ceil((firstDec - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      banner.textContent = now.getMonth() < 11
        ? I18n.plural("advent.opensIn", days)
        : t("advent.opensDec");
    } else if (now.getDate() <= 24) {
      banner.textContent = opened.has(now.getDate())
        ? t("advent.doneToday", { day: now.getDate() })
        : t("advent.waiting", { day: now.getDate() });
    } else {
      banner.textContent = t("advent.christmas");
    }
  }

  function openDoor(day, btn) {
    hint.textContent = "";
    if (day > unlockedUpTo()) {
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
      hint.textContent = t("advent.noPeek", { day });
      return;
    }

    const first = !opened.has(day);
    opened.add(day);
    U.storage.set(STORAGE_KEY, [...opened]);
    refresh();
    show(day);
    if (first) U.celebrate(20);
  }

  function show(n) {
    const item = dayContent(n);
    document.getElementById("advent-dialog-day").textContent = t("advent.dayTitle", { day: n });
    document.getElementById("advent-dialog-icon").textContent = ICONS[item.type];
    document.getElementById("advent-dialog-title").textContent = item.title;
    const body = document.getElementById("advent-dialog-body");
    body.replaceChildren(
      ...item.body.map((text, i) => {
        // Jokes: hide the punchline until tapped.
        if (item.type === "joke" && i === 1) {
          const reveal = document.createElement("button");
          reveal.type = "button";
          reveal.className = "btn btn--green btn--small";
          reveal.textContent = t("advent.showAnswer");
          reveal.addEventListener("click", () => {
            const p = document.createElement("p");
            p.className = "advent-dialog__punchline";
            p.textContent = text;
            reveal.replaceWith(p);
          });
          return reveal;
        }
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      })
    );
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  SantaFeatures.register({
    id: "advent-calendar",
    icon: "📅",
    title: t("features.advent.title"),
    shortTitle: t("features.advent.short"),
    description: t("features.advent.desc"),
    init,
    onShow: refresh,
    onHide: () => { if (dialog.open) dialog.close(); },
  });
})();
