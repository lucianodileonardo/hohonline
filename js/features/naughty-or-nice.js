/**
 * Feature: Have I been good? (Naughty or Nice)
 * Santa checks his list — and the answer is always NICE.
 */
(function () {
  const { pick, formatName, celebrate, playSteps, restartAnimation } = SantaUtils;

  const { t } = I18n;

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

      playSteps(checkingText, t("non.steps"), 700, () => {
        checking.hidden = true;
        lastName = name;
        resultTitle.textContent = t("non.yes", { name });
        resultMsg.textContent = pick(t("non.messages"));
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
    title: t("features.non.title"),
    shortTitle: t("features.non.short"),
    description: t("features.non.desc"),
    init,
  });
})();
