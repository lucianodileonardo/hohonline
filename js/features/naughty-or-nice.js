/**
 * Feature: Have I been good? (Naughty or Nice)
 * Santa checks his list — and the answer is always NICE.
 */
(function () {
  const { pick, formatName, celebrate, playSteps, restartAnimation } = SantaUtils;

  const CHECKING_STEPS = [
    "Santa is unrolling his list…",
    "Checking it once…",
    "Checking it twice…",
    "Asking the elves for a second opinion…",
  ];

  const MESSAGES = [
    "You've been wonderfully kind this year. The elves can't stop talking about it!",
    "Your good deeds made Rudolph's nose glow extra bright. Keep it up!",
    "I checked twice, and you're right at the top of the Nice List!",
    "Mrs. Claus says you've been a real star this year. I agree!",
    "Even the reindeer voted for you. That's a Nice List record!",
    "Your kindness has been spreading Christmas cheer all year long.",
  ];

  function init() {
    const form = document.getElementById("non-form");
    const input = document.getElementById("non-name");
    const checking = document.getElementById("non-checking");
    const checkingText = document.getElementById("non-checking-text");
    const result = document.getElementById("non-result");
    const resultTitle = document.getElementById("non-result-title");
    const resultMsg = document.getElementById("non-result-msg");
    const againBtn = document.getElementById("non-again");
    const certBtn = document.getElementById("non-certificate");
    let lastName = "";

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = formatName(input.value);
      if (!name) {
        input.focus();
        return;
      }

      form.hidden = true;
      result.hidden = true;
      checking.hidden = false;
      restartAnimation(checking.querySelector(".scroll__paper"));

      playSteps(checkingText, CHECKING_STEPS, 700, () => {
        checking.hidden = true;
        lastName = name;
        resultTitle.textContent = `Yes, ${name}, you've been GOOD! 🎉`;
        resultMsg.textContent = pick(MESSAGES);
        result.hidden = false;
        celebrate();
      });
    });

    certBtn.addEventListener("click", () => {
      SantaRouter.go("nice-certificate", { name: lastName });
    });

    againBtn.addEventListener("click", () => {
      result.hidden = true;
      form.hidden = false;
      input.value = "";
      input.focus();
    });
  }

  SantaFeatures.register({
    id: "naughty-or-nice",
    icon: "📜",
    title: "Have I Been Good?",
    shortTitle: "Good or Bad?",
    description: "Ask Santa if you're on the Naughty or Nice list.",
    init,
  });
})();
