/**
 * Feature: Advent Calendar
 * Door N can be opened from December N onwards. Opened doors are remembered
 * in this browser. Add ?preview to the URL to unlock every door (for testing).
 */
(function () {
  const U = SantaUtils;
  const STORAGE_KEY = "north-pole-online:advent-opened";

  // type: joke | fact | activity | recipe | song | kindness
  const DAYS = [
    { type: "joke", title: "Snowman joke", body: ["What do snowmen eat for breakfast?", "Frosted Flakes! ❄️"] },
    { type: "fact", title: "Did you know?", body: ["Santa's reindeer are all girls! Male reindeer lose their antlers in winter, but female reindeer keep theirs until spring."] },
    { type: "activity", title: "Paper snowflakes", body: ["Fold a square of paper into a triangle three times, cut little shapes along the edges, then unfold. Every snowflake is unique — just like you!"] },
    { type: "kindness", title: "Kindness mission", body: ["Make someone smile today: give a compliment, hold the door, or share a toy. Santa's elves are watching! 😉"] },
    { type: "joke", title: "Reindeer joke", body: ["What do you call a reindeer with no eyes?", "No idea! (no-eye-deer) 🦌"] },
    { type: "recipe", title: "Hot cocoa", body: ["Warm a cup of milk (ask a grown-up!), stir in 2 spoons of cocoa and 1 spoon of sugar, and top it with marshmallows. Cozy!"] },
    { type: "fact", title: "Did you know?", body: ["The first Christmas trees were decorated with apples, nuts and candles — not lights!"] },
    { type: "song", title: "Sing along", body: ["Sing \"Jingle Bells\" as loud as you can! Bonus points if you add sleigh-bell noises. 🔔"] },
    { type: "joke", title: "Elf joke", body: ["Why was the elf sent to the principal's office?", "He had a lot of elf-titude! 🧝"] },
    { type: "activity", title: "Draw Santa's sleigh", body: ["Grab some crayons and draw Santa's sleigh full of presents. What would your dream sleigh look like?"] },
    { type: "kindness", title: "Kindness mission", body: ["Write a thank-you note to someone who helps you — a teacher, a neighbor, or a family member."] },
    { type: "fact", title: "Did you know?", body: ["Rudolph first appeared in 1939 in a little booklet given away at a department store in Chicago."] },
    { type: "joke", title: "Christmas tree joke", body: ["What did one Christmas tree say to the other?", "Lighten up! 🎄"] },
    { type: "recipe", title: "Snowman snacks", body: ["Stack three marshmallows on a stick, add chocolate chip eyes and buttons, and a tiny carrot slice for the nose. Yum!"] },
    { type: "activity", title: "Count the stars", body: ["Tonight, look out of the window with a grown-up. How many stars can you count? Make a wish on the brightest one! ⭐"] },
    { type: "fact", title: "Did you know?", body: ["Santa has many names around the world: Père Noël in France, Babbo Natale in Italy, Weihnachtsmann in Germany and Papá Noel in Spain."] },
    { type: "song", title: "Musical game", body: ["Play \"Christmas freeze dance\": dance to a Christmas song and freeze when the music stops! 💃"] },
    { type: "joke", title: "Santa joke", body: ["What do you call Santa when he takes a break?", "Santa Pause! 🎅"] },
    { type: "kindness", title: "Kindness mission", body: ["Pick a toy or a book you don't use anymore and donate it to a child who needs it."] },
    { type: "activity", title: "Make a paper chain", body: ["Cut strips of colored paper, loop them into rings and glue them together. Hang your chain on the tree!"] },
    { type: "fact", title: "Did you know?", body: ["Santa travels about 510 million km on Christmas Eve to visit every home. That's a lot of carrots for the reindeer!"] },
    { type: "recipe", title: "Cookies for Santa", body: ["Mix 200g flour, 100g butter, 70g sugar and 1 egg. Cut out shapes, bake at 180°C for 10 minutes with a grown-up. Save one for Santa! 🍪"] },
    { type: "activity", title: "Get ready!", body: ["Tomorrow is Christmas Eve! Prepare a plate for Santa's cookies and a carrot for Rudolph. 🥕"] },
    { type: "song", title: "Christmas Eve!", body: ["Tonight's the night! Go to bed early — Santa only comes when everyone is asleep. Merry Christmas! 🎁✨"] },
  ];

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
      inside.textContent = ICONS[DAYS[day - 1].type];
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
      btn.setAttribute("aria-label", isLocked ? `Door ${day}, locked` : isOpen ? `Door ${day}, opened: ${DAYS[day - 1].title}` : `Door ${day}, ready to open`);
    }

    if (preview) {
      banner.textContent = "👀 Preview mode: all doors are unlocked.";
    } else if (now.getMonth() !== 11) {
      const firstDec = new Date(now.getFullYear(), 11, 1);
      const days = Math.ceil((firstDec - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      banner.textContent = now.getMonth() < 11
        ? `🔒 The calendar opens on December 1st — ${days} ${days === 1 ? "day" : "days"} to go!`
        : "🔒 The calendar opens on December 1st.";
    } else if (now.getDate() <= 24) {
      banner.textContent = opened.has(now.getDate())
        ? `✅ You've opened today's door (${now.getDate()}). Come back tomorrow!`
        : `🎁 Door ${now.getDate()} is waiting for you today!`;
    } else {
      banner.textContent = "🎄 Merry Christmas! All 24 doors are open for you to enjoy again.";
    }
  }

  function openDoor(day, btn) {
    hint.textContent = "";
    if (day > unlockedUpTo()) {
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
      hint.textContent = `🤫 No peeking! Door ${day} opens on December ${day}.`;
      return;
    }

    const first = !opened.has(day);
    opened.add(day);
    U.storage.set(STORAGE_KEY, [...opened]);
    refresh();
    show(day);
    if (first) U.celebrate(20);
  }

  function show(day) {
    const item = DAYS[day - 1];
    document.getElementById("advent-dialog-day").textContent = `December ${day}`;
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
          reveal.textContent = "Show the answer";
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
    title: "Advent Calendar",
    shortTitle: "Advent",
    description: "Open a new surprise every day from December 1st to Christmas Eve.",
    init,
    onShow: refresh,
    onHide: () => { if (dialog.open) dialog.close(); },
  });
})();
