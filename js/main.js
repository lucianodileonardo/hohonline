/**
 * App bootstrap: builds nav + feature cards from the registry, starts each
 * feature, and shows one feature at a time based on the URL hash (#feature-id).
 */
window.SantaRouter = (function () {
  const nav = document.getElementById("nav");
  const grid = document.getElementById("feature-grid");
  const home = [document.getElementById("home"), document.querySelector(".features")];
  const features = SantaFeatures.all();
  const live = features.filter((f) => !f.comingSoon);
  let current = null;
  let pendingData = null;

  /** Builds a feature card with DOM APIs (no HTML strings → no injection risk). */
  function makeCard(f, tag) {
    const card = document.createElement(tag);
    card.className = "feature-card";
    const icon = document.createElement("div");
    icon.className = "feature-card__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = f.icon;
    const title = document.createElement("div");
    title.className = "feature-card__title";
    title.textContent = f.title;
    const desc = document.createElement("p");
    desc.className = "feature-card__desc";
    desc.textContent = f.description;
    card.append(icon, title, desc);
    return card;
  }

  for (const f of live) {
    const card = makeCard(f, "a");
    card.href = "#" + f.id;
    grid.appendChild(card);

    const link = document.createElement("a");
    link.href = "#" + f.id;
    link.textContent = f.icon + " " + (f.shortTitle || f.title);
    link.dataset.id = f.id;
    nav.appendChild(link);

    const panel = panelFor(f.id);
    if (panel) {
      const back = document.createElement("a");
      back.href = "#";
      back.className = "back-link no-print";
      back.textContent = "← All features";
      panel.prepend(back);
      panel.hidden = true;
    }

    if (typeof f.init === "function") f.init();
  }
  // Teasers go last.
  features.filter((f) => f.comingSoon).forEach((f) => {
    const card = makeCard(f, "div");
    card.classList.add("feature-card--soon");
    const tag = document.createElement("span");
    tag.className = "feature-card__tag";
    tag.textContent = "Coming soon";
    card.appendChild(tag);
    grid.appendChild(card);
  });

  function panelFor(id) {
    return document.querySelector(`.feature-panel[data-feature="${id}"]`);
  }

  function route() {
    let id = "";
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (e) {
      id = ""; // malformed hash like "#%E0" → just show the home page
    }
    const next = live.find((f) => f.id === id) || null;

    if (current && current !== next && typeof current.onHide === "function") current.onHide();

    home.forEach((el) => { el.hidden = !!next; });
    for (const f of live) {
      const panel = panelFor(f.id);
      if (panel) panel.hidden = f !== next;
    }
    for (const link of nav.querySelectorAll("a")) {
      if (next && link.dataset.id === next.id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }

    document.title = next ? `${next.title} · North Pole Online` : "North Pole Online";
    window.scrollTo(0, 0);

    const data = pendingData;
    pendingData = null;
    current = next;
    if (next && typeof next.onShow === "function") next.onShow(data || {});

    // Keep the active link visible in the (horizontally scrollable) nav.
    const active = nav.querySelector('[aria-current="page"]');
    if (active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }

  window.addEventListener("hashchange", route);
  route();

  // Christmas countdown.
  const countdown = document.getElementById("countdown");
  function updateCountdown() {
    const days = SantaUtils.daysUntilChristmas();
    countdown.textContent =
      days === 0 ? "🎄 Merry Christmas! 🎄" :
      days === 1 ? "🎄 Christmas is tomorrow!" :
      `🎄 ${days} days until Christmas`;
  }
  updateCountdown();
  setInterval(updateCountdown, 60 * 60 * 1000);

  return {
    /** Opens a feature, optionally passing data to its onShow(data). */
    go(id, data) {
      pendingData = data || null;
      if (location.hash === "#" + id) route();
      else location.hash = id;
    },
  };
})();
