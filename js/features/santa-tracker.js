/**
 * Feature: Santa Tracker
 * Before Christmas Eve: Santa is preparing (countdown to takeoff).
 * On Christmas Eve: Santa flies west, arriving in each city at local midnight.
 * Afterwards: Santa is back home resting.
 * "Preview Christmas Eve" replays the whole night in about a minute.
 */
(function () {
  const U = SantaUtils;
  const HOUR = 3600000;
  const DEMO_MS = 75000;
  const NORTH_POLE = { name: "North Pole", flag: "🎅", lat: 84, lon: 0 };

  // [name, flag, lat, lon, UTC offset in December]
  const CITIES = [
    ["Kiritimati", "🇰🇮", 1.87, -157.4, 14],
    ["Auckland", "🇳🇿", -36.85, 174.76, 13],
    ["Suva", "🇫🇯", -18.14, 178.44, 12],
    ["Sydney", "🇦🇺", -33.87, 151.21, 11],
    ["Brisbane", "🇦🇺", -27.47, 153.03, 10],
    ["Tokyo", "🇯🇵", 35.68, 139.69, 9],
    ["Seoul", "🇰🇷", 37.57, 126.98, 9],
    ["Manila", "🇵🇭", 14.6, 120.98, 8],
    ["Beijing", "🇨🇳", 39.9, 116.4, 8],
    ["Jakarta", "🇮🇩", -6.2, 106.85, 7],
    ["Bangkok", "🇹🇭", 13.76, 100.5, 7],
    ["New Delhi", "🇮🇳", 28.61, 77.21, 5.5],
    ["Dubai", "🇦🇪", 25.2, 55.27, 4],
    ["Nairobi", "🇰🇪", -1.29, 36.82, 3],
    ["Moscow", "🇷🇺", 55.76, 37.62, 3],
    ["Cairo", "🇪🇬", 30.04, 31.24, 2],
    ["Athens", "🇬🇷", 37.98, 23.73, 2],
    ["Cape Town", "🇿🇦", -33.92, 18.42, 2],
    ["Berlin", "🇩🇪", 52.52, 13.4, 1],
    ["Rome", "🇮🇹", 41.9, 12.5, 1],
    ["Lagos", "🇳🇬", 6.52, 3.38, 1],
    ["Paris", "🇫🇷", 48.86, 2.35, 1],
    ["London", "🇬🇧", 51.51, -0.13, 0],
    ["Reykjavík", "🇮🇸", 64.15, -21.94, 0],
    ["Rio de Janeiro", "🇧🇷", -22.91, -43.17, -3],
    ["Buenos Aires", "🇦🇷", -34.6, -58.38, -3],
    ["Toronto", "🇨🇦", 43.65, -79.38, -5],
    ["New York", "🇺🇸", 40.71, -74.01, -5],
    ["Chicago", "🇺🇸", 41.88, -87.63, -6],
    ["Mexico City", "🇲🇽", 19.43, -99.13, -6],
    ["Denver", "🇺🇸", 39.74, -104.99, -7],
    ["Los Angeles", "🇺🇸", 34.05, -118.24, -8],
    ["Anchorage", "🇺🇸", 61.22, -149.9, -9],
    ["Honolulu", "🇺🇸", 21.31, -157.86, -10],
    ["Pago Pago", "🇦🇸", -14.28, -170.7, -11],
  ];

  const TOTAL_GIFTS = 2_200_000_000;

  const PREP_MESSAGES = [
    "🧝 The elves are painting toy trains in the workshop.",
    "🦌 The reindeer are doing their flying practice.",
    "📜 Santa is checking his list (twice!).",
    "🍪 Mrs. Claus is baking cookies for the long trip.",
    "🛷 The sleigh is getting a fresh coat of polish.",
    "🎁 The wrapping department is running out of ribbon!",
    "🗺️ Santa is studying the map of the world.",
    "🥕 Rudolph is eating extra carrots for energy.",
  ];

  let els = {};
  let map = null;
  let santaMarker = null;
  let routeLine = null;
  let cityMarkers = [];
  let timer = null;
  let demo = null; // { realStart, simStart, speed }
  let prepIndex = 0;
  let lastPhase = null;

  function init() {
    els = {
      phase: document.getElementById("tracker-phase"),
      text: document.getElementById("tracker-text"),
      stat1: document.getElementById("tracker-stat1"),
      stat1Label: document.getElementById("tracker-stat1-label"),
      stat2: document.getElementById("tracker-stat2"),
      stat2Label: document.getElementById("tracker-stat2-label"),
      mapEl: document.getElementById("tracker-map"),
      follow: document.getElementById("tracker-follow"),
      demoBtn: document.getElementById("tracker-demo"),
      hint: document.getElementById("tracker-hint"),
    };
    els.demoBtn.addEventListener("click", () => (demo ? stopDemo() : startDemo()));
  }

  /** Builds this year's route: stops sorted by arrival time (local midnight). */
  function buildRoute(year) {
    const midnightUTC = Date.UTC(year, 11, 25);
    const groups = new Map();
    for (const [name, flag, lat, lon, offset] of CITIES) {
      const t = midnightUTC - offset * HOUR;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t).push({ name, flag, lat, lon });
    }
    const stops = [];
    for (const [t, cities] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      // Several cities in the same time zone: visit east → west within the hour.
      cities.sort((a, b) => b.lon - a.lon);
      cities.forEach((c, i) => stops.push({ ...c, time: t + (i * HOUR) / cities.length }));
    }
    const takeoff = stops[0].time - HOUR;
    const landing = stops[stops.length - 1].time + HOUR;
    return {
      takeoff,
      landing,
      points: [{ ...NORTH_POLE, time: takeoff }, ...stops, { ...NORTH_POLE, time: landing }],
    };
  }

  function now() {
    if (!demo) return Date.now();
    return demo.simStart + (Date.now() - demo.realStart) * demo.speed;
  }

  function routeFor(t) {
    // Use this year's Christmas; once it's over (after Dec 25), stay "back home" until Jan 1.
    return buildRoute(new Date(t).getUTCFullYear());
  }

  // ---------- Map ----------
  function ensureMap() {
    if (map || !window.L) {
      if (!window.L) {
        const msg = document.createElement("p");
        msg.className = "tracker-map__error";
        msg.textContent = "🗺️ The map couldn't load. Santa's status above still works!";
        els.mapEl.replaceChildren(msg);
      }
      return;
    }
    map = L.map(els.mapEl, { worldCopyJump: true, minZoom: 1, maxZoom: 7, zoomSnap: 0.5 }).setView([25, 10], 1.5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 7,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const route = routeFor(now());
    cityMarkers = route.points.slice(1, -1).map((p) =>
      L.circleMarker([p.lat, p.lon], { radius: 5, color: "#fff", weight: 2, fillColor: "#9aa7bd", fillOpacity: 1 })
        .bindTooltip(`${p.flag} ${p.name}`)
        .addTo(map)
    );
    L.marker([NORTH_POLE.lat, NORTH_POLE.lon], {
      icon: L.divIcon({ className: "tracker-pole", html: "🏠", iconSize: [28, 28] }),
    }).bindTooltip("Santa's Workshop, North Pole").addTo(map);

    routeLine = L.polyline([], { color: "#f8b229", weight: 3, dashArray: "6 8" }).addTo(map);
    santaMarker = L.marker([NORTH_POLE.lat, NORTH_POLE.lon], {
      icon: L.divIcon({ className: "tracker-santa", html: "🎅🛷", iconSize: [72, 36], iconAnchor: [36, 18] }),
      zIndexOffset: 1000,
    }).addTo(map);
  }

  // ---------- Update loop ----------
  function update() {
    const t = now();
    const route = routeFor(t);
    const pts = route.points;

    if (demo && t >= route.landing + 30 * 60000) {
      stopDemo();
      return;
    }

    let phase, pos, visited = 0, lastStop = null, nextStop = null;

    if (t < route.takeoff) {
      phase = "preparing";
      pos = NORTH_POLE;
    } else if (t >= route.landing) {
      phase = "home";
      pos = NORTH_POLE;
      visited = pts.length - 2;
    } else {
      phase = "flying";
      let i = 0;
      while (i < pts.length - 1 && pts[i + 1].time <= t) i++;
      const a = pts[i];
      const b = pts[Math.min(i + 1, pts.length - 1)];
      const k = b.time === a.time ? 1 : (t - a.time) / (b.time - a.time);
      pos = interpolate(a, b, k);
      visited = Math.max(0, Math.min(i, pts.length - 2));
      lastStop = i > 0 ? a : null;
      nextStop = b;
    }

    if (phase !== lastPhase) {
      lastPhase = phase;
      if (map) map.setView(phase === "flying" ? [pos.lat, pos.lon] : [25, 10], phase === "flying" ? 3 : 1.5);
    }

    renderStatus(phase, t, route, visited, lastStop, nextStop);
    renderMap(phase, pos, visited, route);
  }

  function interpolate(a, b, k) {
    let dLon = b.lon - a.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    let lon = a.lon + dLon * k;
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;
    return { lat: a.lat + (b.lat - a.lat) * k, lon };
  }

  function renderStatus(phase, t, route, visited, lastStop, nextStop) {
    const progress = Math.max(0, Math.min(1, (t - route.takeoff) / (route.landing - route.takeoff)));

    if (phase === "preparing") {
      els.phase.textContent = "🏠 Preparing at the North Pole";
      els.phase.dataset.phase = "preparing";
      if (Math.floor(t / 6000) !== prepIndex) {
        prepIndex = Math.floor(t / 6000);
        els.text.textContent = PREP_MESSAGES[prepIndex % PREP_MESSAGES.length];
      }
      els.stat1Label.textContent = "Takeoff in";
      els.stat1.textContent = countdown(route.takeoff - t);
      els.stat2Label.textContent = "Toys ready";
      const yearStart = Date.UTC(new Date(t).getUTCFullYear(), 0, 1);
      els.stat2.textContent = Math.min(99, Math.floor(((t - yearStart) / (route.takeoff - yearStart)) * 100)) + "%";
    } else if (phase === "flying") {
      els.phase.textContent = "🛷 Santa is flying!";
      els.phase.dataset.phase = "flying";
      if (nextStop && nextStop.name === NORTH_POLE.name) {
        els.text.textContent = "All the presents are delivered! Santa is flying back home to the North Pole. 🏠";
      } else if (lastStop) {
        els.text.textContent = `Santa just visited ${lastStop.flag} ${lastStop.name}. Next stop: ${nextStop.flag} ${nextStop.name} in ${countdown(nextStop.time - t)}.`;
      } else {
        els.text.textContent = `Santa has taken off! First stop: ${nextStop.flag} ${nextStop.name} in ${countdown(nextStop.time - t)}.`;
      }
      els.stat1Label.textContent = "Presents delivered";
      els.stat1.textContent = Math.floor(TOTAL_GIFTS * easeProgress(progress)).toLocaleString("en-US");
      els.stat2Label.textContent = "Cities visited";
      els.stat2.textContent = `${visited} / ${route.points.length - 2}`;
    } else {
      els.phase.textContent = "😴 Back home";
      els.phase.dataset.phase = "home";
      els.text.textContent = "Santa delivered every present and is now resting by the fire with Mrs. Claus. See you next Christmas!";
      els.stat1Label.textContent = "Presents delivered";
      els.stat1.textContent = TOTAL_GIFTS.toLocaleString("en-US");
      els.stat2Label.textContent = "Next Christmas in";
      els.stat2.textContent = `${U.daysUntilChristmas(new Date(t))} days`;
    }

    els.hint.textContent = demo
      ? `▶️ Preview mode — replaying Christmas Eve at super speed (${new Date(t).toUTCString().slice(17, 22)} UTC).`
      : "Santa leaves the North Pole on December 24 and reaches each city at midnight, local time.";
  }

  function easeProgress(p) {
    // Gifts are delivered during the flight between first and last city.
    const start = 1 / 28, end = 1 - 1 / 28;
    return Math.max(0, Math.min(1, (p - start) / (end - start)));
  }

  function renderMap(phase, pos, visited, route) {
    if (!map) return;
    santaMarker.setLatLng([pos.lat, pos.lon]);
    cityMarkers.forEach((m, i) => {
      const done = phase === "home" || (phase === "flying" && i < visited);
      m.setStyle({ fillColor: done ? "#f8b229" : "#9aa7bd" });
    });
    if (phase === "flying") {
      const path = route.points.slice(0, visited + 1).map((p) => [p.lat, p.lon]);
      path.push([pos.lat, pos.lon]);
      routeLine.setLatLngs(unwrap(path));
      if (els.follow.checked) map.panTo([pos.lat, pos.lon], { animate: !demo });
    } else {
      routeLine.setLatLngs(phase === "home" ? unwrap(route.points.map((p) => [p.lat, p.lon])) : []);
    }
  }

  /**
   * Avoids lines jumping across the whole map at the date line, and shifts the
   * path so its newest point sits on the main map copy (where the markers are).
   */
  function unwrap(latlngs) {
    let offset = 0;
    const out = latlngs.map(([lat, lon], i) => {
      if (i > 0) {
        const prev = latlngs[i - 1][1];
        if (lon - prev > 180) offset -= 360;
        if (lon - prev < -180) offset += 360;
      }
      return [lat, lon + offset];
    });
    const last = out.length ? out[out.length - 1][1] : 0;
    const shift = -Math.round(last / 360) * 360;
    return out.map(([lat, lon]) => [lat, lon + shift]);
  }

  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${String(sec).padStart(2, "0")}s`;
  }

  // ---------- Demo ----------
  function startDemo() {
    const year = new Date().getUTCFullYear();
    const route = buildRoute(year);
    demo = {
      realStart: Date.now(),
      simStart: route.takeoff - 5 * 60000,
      speed: (route.landing - route.takeoff + 35 * 60000) / DEMO_MS,
    };
    els.demoBtn.textContent = "⏹️ Stop preview";
    lastPhase = null;
    restartLoop(250);
  }

  function stopDemo() {
    demo = null;
    els.demoBtn.textContent = "▶️ Preview Christmas Eve";
    lastPhase = null;
    restartLoop(1000);
  }

  function restartLoop(ms) {
    if (timer) clearInterval(timer);
    timer = setInterval(update, ms);
    update();
  }

  function onShow() {
    ensureMap();
    if (map) setTimeout(() => map.invalidateSize(), 50);
    lastPhase = null;
    restartLoop(demo ? 250 : 1000);
  }

  function onHide() {
    if (timer) clearInterval(timer);
    timer = null;
    if (demo) {
      demo = null;
      els.demoBtn.textContent = "▶️ Preview Christmas Eve";
    }
  }

  SantaFeatures.register({
    id: "santa-tracker",
    icon: "🛷",
    title: "Santa Tracker",
    shortTitle: "Tracker",
    description: "Follow Santa's sleigh around the world on Christmas Eve.",
    init,
    onShow,
    onHide,
  });
})();
