/**
 * Feature: Which Reindeer Are You?
 * Each answer gives points to one or more reindeer; the highest score wins.
 */
(function () {
  const U = SantaUtils;

  const { t } = I18n;

  const EMOJI = {
    rudolph: "🦌🔴", dasher: "🦌💨", dancer: "🦌💃", prancer: "🦌✨", vixen: "🦌🦊",
    comet: "🦌☄️", cupid: "🦌💖", donner: "🦌💪", blitzen: "🦌⚡",
  };

  // Which reindeer each answer scores for: SCORING[question][answer]. The texts are in
  // I18n "quiz.questions", in the same order.
  const SCORING = [
    [["dasher", "blitzen"], ["dancer", "prancer"], ["rudolph", "donner"], ["vixen", "blitzen"]],
    [["cupid", "rudolph"], ["dasher", "vixen"], ["comet", "cupid"], ["prancer", "donner"]],
    [["rudolph", "blitzen"], ["dasher", "comet"], ["cupid", "dancer"], ["vixen", "donner"]],
    [["rudolph"], ["comet", "dasher"], ["dancer", "cupid"], ["donner", "prancer"]],
    [["rudolph", "prancer"], ["comet", "blitzen"], ["cupid", "dancer"], ["vixen", "dasher"]],
    [["cupid", "donner"], ["dancer", "prancer"], ["comet", "rudolph"], ["dasher", "vixen", "blitzen"]],
  ];

  let els = {};
  let step = 0;
  let scores = {};

  function init() {
    els = {
      start: document.getElementById("quiz-start"),
      body: document.getElementById("quiz-body"),
      bar: document.getElementById("quiz-bar"),
      count: document.getElementById("quiz-count"),
      question: document.getElementById("quiz-question"),
      answers: document.getElementById("quiz-answers"),
      result: document.getElementById("quiz-result"),
    };
    document.getElementById("quiz-begin").addEventListener("click", begin);
    document.getElementById("quiz-again").addEventListener("click", begin);
  }

  function begin() {
    step = 0;
    scores = Object.fromEntries(Object.keys(EMOJI).map((k) => [k, 0]));
    els.start.hidden = true;
    els.result.hidden = true;
    els.body.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const { q, a } = t("quiz.questions")[step];
    els.bar.style.width = (step / SCORING.length) * 100 + "%";
    els.count.textContent = t("quiz.count", { n: step + 1, total: SCORING.length });
    els.question.textContent = q;
    U.restartAnimation(els.question);
    els.answers.replaceChildren(
      ...a.map((label, i) => {
        const deer = SCORING[step][i];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz__answer";
        btn.textContent = label;
        btn.addEventListener("click", () => answer(deer));
        return btn;
      })
    );
    els.answers.querySelector("button").focus({ preventScroll: true });
  }

  function answer(deer) {
    deer.forEach((d) => { scores[d] += 1; });
    step += 1;
    if (step < SCORING.length) renderQuestion();
    else showResult();
  }

  function showResult() {
    const best = Math.max(...Object.values(scores));
    const winners = Object.keys(scores).filter((k) => scores[k] === best);
    const id = U.pick(winners);
    const r = t("quiz.reindeer")[id];
    els.bar.style.width = "100%";
    els.body.hidden = true;
    document.getElementById("quiz-result-emoji").textContent = EMOJI[id];
    document.getElementById("quiz-result-name").textContent = r.name + "!";
    document.getElementById("quiz-result-tagline").textContent = r.tagline;
    document.getElementById("quiz-result-desc").textContent = r.desc;
    els.result.hidden = false;
    U.celebrate(25);
  }

  SantaFeatures.register({
    id: "reindeer-quiz",
    icon: "🦌",
    title: t("features.quiz.title"),
    shortTitle: t("features.quiz.short"),
    description: t("features.quiz.desc"),
    init,
  });
})();
