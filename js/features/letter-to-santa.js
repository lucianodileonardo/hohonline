/**
 * Feature: Letter to Santa
 * Write a letter with a wish list, "send" it to the North Pole,
 * and receive a personal reply from Santa that can be printed.
 */
(function () {
  const { pick, formatName, celebrate, playSteps, restartAnimation } = SantaUtils;

  const MAX_WISHES = 10;

  const { t } = I18n;

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
        remove.setAttribute("aria-label", t("letter.removeWish", { wish }));
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
        ? t("letter.full", { max: MAX_WISHES })
        : t("letter.count", { n: wishes.length, max: MAX_WISHES });
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

      playSteps(sendingText, t("letter.steps"), 800, () => {
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
        return t("letter.errName");
      }
      if (!letter.wishes.length && !letter.message) {
        wishInput.focus();
        return t("letter.errEmpty");
      }
      return "";
    }

    // ---------- Reply ----------
    function renderReply(letter) {
      const paragraphs = [];

      let opening = pick(t("letter.openings"));
      if (letter.age) opening += " " + t("letter.age", { age: letter.age });
      paragraphs.push(opening);

      if (letter.wishes.length) {
        let wishLine = `${pick(t("letter.wishLines"))} ${t("letter.asked", { wishes: I18n.list(letter.wishes) })}`;
        wishLine += " " + t(letter.wishes.length >= 5 ? "letter.bigList" : "letter.smallList");
        paragraphs.push(wishLine);
      }

      if (letter.message) {
        paragraphs.push(t("letter.readMessage"));
      }

      paragraphs.push(
        t(letter.promised ? "letter.promised" : "letter.notPromised")
      );

      paragraphs.push(pick(t("letter.closings")));

      replyBody.replaceChildren(
        el("p", t("letter.dear", { name: letter.name }), "letter-paper__greeting"),
        ...paragraphs.map((p) => el("p", p)),
        el("p", t("letter.closing"), "letter-paper__closing"),
        el("p", t("letter.signature"), "letter-paper__signature"),
      );

      // A copy of the child's own letter, for printing / keepsake.
      const parts = [el("p", t("letter.greeting"), "letter-paper__greeting")];
      if (letter.age) parts.push(el("p", t("letter.childNameAge", { name: letter.name, age: letter.age })));
      else parts.push(el("p", t("letter.childName", { name: letter.name })));
      if (letter.message) letter.message.split(/\n+/).forEach((line) => parts.push(el("p", line)));
      if (letter.wishes.length) {
        parts.push(el("p", t("letter.childWishes")));
        const ul = document.createElement("ul");
        letter.wishes.forEach((w) => ul.appendChild(el("li", w)));
        parts.push(ul);
      }
      if (letter.promised) parts.push(el("p", t("letter.childPromise")));
      parts.push(el("p", t("letter.childLove"), "letter-paper__closing"), el("p", letter.name, "letter-paper__signature"));
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

  SantaFeatures.register({
    id: "letter-to-santa",
    icon: "✉️",
    title: t("features.letter.title"),
    shortTitle: t("features.letter.short"),
    description: t("features.letter.desc"),
    init,
  });
})();
