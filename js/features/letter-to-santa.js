/**
 * Feature: Letter to Santa
 * Write a letter with a wish list, "send" it to the North Pole,
 * and receive a personal reply from Santa that can be printed.
 */
(function () {
  const { pick, formatName, celebrate, playSteps, restartAnimation } = SantaUtils;

  const MAX_WISHES = 10;

  const SENDING_STEPS = [
    "Folding your letter…",
    "Sealing the envelope with a candy cane stamp…",
    "Handing it to the reindeer post…",
    "Flying over the snowy mountains…",
    "Delivered to the North Pole! 🎅",
  ];

  const OPENINGS = [
    "Thank you so much for your wonderful letter! I read it by the fireplace with a cup of hot cocoa.",
    "What a joy to find your letter in my mailbag today! Mrs. Claus and I read it together.",
    "Your letter just arrived at the North Pole, and it made me smile from ear to ear!",
  ];

  const WISH_LINES = [
    "The elves have pinned your wish list on the big board in the workshop.",
    "I've passed your wish list to my most careful elves.",
    "Your wish list is now safely tucked in my big red book.",
  ];

  const CLOSINGS = [
    "Keep being kind, help the people around you, and don't forget to leave a carrot for Rudolph!",
    "Remember: the best gifts are the kindness we share. Keep shining!",
    "Stay warm, be good to your family and friends, and I'll see you on Christmas Eve!",
  ];

  function init() {
    const form = document.getElementById("letter-form");
    const nameInput = document.getElementById("letter-name");
    const ageInput = document.getElementById("letter-age");
    const wishInput = document.getElementById("letter-wish");
    const addWishBtn = document.getElementById("letter-add-wish");
    const wishList = document.getElementById("letter-wishes");
    const wishHint = document.getElementById("letter-wish-hint");
    const messageInput = document.getElementById("letter-message");
    const promiseInput = document.getElementById("letter-promise");
    const errorEl = document.getElementById("letter-error");

    const sending = document.getElementById("letter-sending");
    const sendingText = document.getElementById("letter-sending-text");
    const envelope = sending.querySelector(".envelope");

    const reply = document.getElementById("letter-reply");
    const replyBody = document.getElementById("letter-reply-body");
    const original = document.getElementById("letter-original");
    const printBtn = document.getElementById("letter-print");
    const againBtn = document.getElementById("letter-again");

    let wishes = [];

    // ---------- Wish list ----------
    function renderWishes() {
      wishList.replaceChildren();
      wishes.forEach((wish, i) => {
        const li = document.createElement("li");
        li.className = "wish-chip";
        const text = document.createElement("span");
        text.textContent = "🎁 " + wish;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "wish-chip__remove";
        remove.setAttribute("aria-label", `Remove ${wish}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          wishes.splice(i, 1);
          renderWishes();
          wishInput.focus();
        });
        li.append(text, remove);
        wishList.appendChild(li);
      });
      const full = wishes.length >= MAX_WISHES;
      wishInput.disabled = full;
      addWishBtn.disabled = full;
      wishHint.textContent = full
        ? `That's ${MAX_WISHES} wishes — the sleigh is full!`
        : `${wishes.length}/${MAX_WISHES} wishes`;
    }

    function addWish() {
      const wish = wishInput.value.trim().replace(/\s+/g, " ");
      if (!wish || wishes.length >= MAX_WISHES) return;
      wishes.push(wish);
      wishInput.value = "";
      renderWishes();
      wishInput.focus();
    }

    addWishBtn.addEventListener("click", addWish);
    wishInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addWish();
      }
    });

    // ---------- Send ----------
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // A wish typed but not yet added still counts.
      if (wishInput.value.trim()) addWish();

      const letter = {
        name: formatName(nameInput.value),
        age: parseInt(ageInput.value, 10) || null,
        wishes: wishes.slice(),
        message: messageInput.value.trim(),
        promised: promiseInput.checked,
      };

      const error = validate(letter);
      errorEl.textContent = error;
      errorEl.hidden = !error;
      if (error) return;

      form.hidden = true;
      sending.hidden = false;
      restartAnimation(envelope);
      sending.scrollIntoView({ behavior: "smooth", block: "center" });

      playSteps(sendingText, SENDING_STEPS, 800, () => {
        sending.hidden = true;
        renderReply(letter);
        reply.hidden = false;
        reply.scrollIntoView({ behavior: "smooth", block: "start" });
        celebrate();
      });
    });

    function validate(letter) {
      if (!letter.name) {
        nameInput.focus();
        return "Santa needs to know your name to write back!";
      }
      if (!letter.wishes.length && !letter.message) {
        wishInput.focus();
        return "Add at least one wish or write a message for Santa.";
      }
      return "";
    }

    // ---------- Reply ----------
    function renderReply(letter) {
      const paragraphs = [];

      let opening = pick(OPENINGS);
      if (letter.age) {
        opening += ` You're ${letter.age} years old now — my, how you've grown since last Christmas!`;
      }
      paragraphs.push(opening);

      if (letter.wishes.length) {
        let wishLine = `${pick(WISH_LINES)} You asked for ${joinList(letter.wishes)}.`;
        if (letter.wishes.length >= 5) {
          wishLine += " That's quite a list — the elves are rolling up their sleeves!";
        } else {
          wishLine += " The elves and I will do our very best.";
        }
        paragraphs.push(wishLine);
      }

      if (letter.message) {
        paragraphs.push("I loved reading what you wrote to me. Letters like yours are what make my workshop so cheerful every December.");
      }

      paragraphs.push(
        letter.promised
          ? "And thank you for promising to be good. I checked my list twice — you're on the Nice List! ⭐"
          : "Oh, and I checked my list twice — you're on the Nice List! ⭐"
      );

      paragraphs.push(pick(CLOSINGS));

      replyBody.replaceChildren(
        el("p", `Dear ${letter.name},`, "letter-paper__greeting"),
        ...paragraphs.map((p) => el("p", p)),
        el("p", "Ho ho ho! With love,", "letter-paper__closing"),
        el("p", "Santa Claus 🎅", "letter-paper__signature"),
      );

      // A copy of the child's own letter, for printing / keepsake.
      const parts = [el("p", "Dear Santa,", "letter-paper__greeting")];
      if (letter.age) parts.push(el("p", `My name is ${letter.name} and I am ${letter.age} years old.`));
      else parts.push(el("p", `My name is ${letter.name}.`));
      if (letter.message) letter.message.split(/\n+/).forEach((line) => parts.push(el("p", line)));
      if (letter.wishes.length) {
        parts.push(el("p", "This year I would like:"));
        const ul = document.createElement("ul");
        letter.wishes.forEach((w) => ul.appendChild(el("li", w)));
        parts.push(ul);
      }
      if (letter.promised) parts.push(el("p", "I promise to be good!"));
      parts.push(el("p", "Love,", "letter-paper__closing"), el("p", letter.name, "letter-paper__signature"));
      original.replaceChildren(...parts);
    }

    printBtn.addEventListener("click", () => window.print());

    // Include the child's own letter when printing (it lives in a <details>).
    const originalWrap = original.closest("details");
    let wasOpen = false;
    window.addEventListener("beforeprint", () => {
      wasOpen = originalWrap.open;
      originalWrap.open = true;
    });
    window.addEventListener("afterprint", () => {
      originalWrap.open = wasOpen;
    });

    againBtn.addEventListener("click", () => {
      form.reset();
      wishes = [];
      renderWishes();
      errorEl.hidden = true;
      reply.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInput.focus({ preventScroll: true });
    });

    renderWishes();
  }

  function el(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function joinList(items) {
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  SantaFeatures.register({
    id: "letter-to-santa",
    icon: "✉️",
    title: "Letter to Santa",
    shortTitle: "Letter",
    description: "Write Santa your wish list and get a personal reply.",
    init,
  });
})();
