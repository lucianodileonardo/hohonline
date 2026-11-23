/**
 * Feature: Which Reindeer Are You?
 * Each answer gives points to one or more reindeer; the highest score wins.
 */
(function () {
  const U = SantaUtils;

  const REINDEER = {
    rudolph: {
      name: "Rudolph", emoji: "🦌🔴",
      tagline: "The Brave Guide",
      desc: "You shine brightest when things get tough! Just like Rudolph, you're kind to everyone, you never give up, and you light the way for your friends — even on the foggiest Christmas Eve.",
    },
    dasher: {
      name: "Dasher", emoji: "🦌💨",
      tagline: "The Speedy Star",
      desc: "Ready, set, go! You're full of energy and always first in line for an adventure. Dasher is the fastest reindeer on the team, and with you around, nothing is ever boring.",
    },
    dancer: {
      name: "Dancer", emoji: "🦌💃",
      tagline: "The Joyful Mover",
      desc: "You can't stay still when the music plays! Like Dancer, you bring joy and rhythm everywhere you go, and you make everyone around you smile.",
    },
    prancer: {
      name: "Prancer", emoji: "🦌✨",
      tagline: "The Confident Showstopper",
      desc: "You've got style and confidence! Prancer loves to put on a show, and so do you. You're not afraid to be yourself — and that's a great gift.",
    },
    vixen: {
      name: "Vixen", emoji: "🦌🦊",
      tagline: "The Clever Trickster",
      desc: "Smart, playful and a little bit mischievous! Like Vixen, you love jokes and clever ideas — and you always find a way to solve a puzzle.",
    },
    comet: {
      name: "Comet", emoji: "🦌☄️",
      tagline: "The Dreamer",
      desc: "You have your head in the stars! Comet loves to explore and imagine, and you're curious about everything. Your big dreams make the world more magical.",
    },
    cupid: {
      name: "Cupid", emoji: "🦌💖",
      tagline: "The Loving Friend",
      desc: "Your heart is as big as the North Pole! Like Cupid, you care about everyone, give the best hugs, and always know how to make a friend feel better.",
    },
    donner: {
      name: "Donner", emoji: "🦌💪",
      tagline: "The Strong Protector",
      desc: "Strong, loyal and dependable! Donner is the one everyone counts on, and so are you. Your friends know you'll always have their back.",
    },
    blitzen: {
      name: "Blitzen", emoji: "🦌⚡",
      tagline: "The Bold Adventurer",
      desc: "Lightning-fast and full of courage! Like Blitzen, you love a challenge and you're never afraid to try something new.",
    },
  };

  const QUESTIONS = [
    {
      q: "What's your favorite thing to do on a snowy day?",
      a: [
        ["🛷 Race down the hill on a sled", ["dasher", "blitzen"]],
        ["💃 Dance to Christmas songs", ["dancer", "prancer"]],
        ["🤝 Help a neighbor shovel snow", ["rudolph", "donner"]],
        ["❄️ Ambush friends with snowballs", ["vixen", "blitzen"]],
      ],
    },
    {
      q: "Pick a Christmas treat:",
      a: [
        ["🍪 Cookies to share with everyone", ["cupid", "rudolph"]],
        ["🍬 A candy cane — quick and sweet", ["dasher", "vixen"]],
        ["☕ Hot cocoa while watching the stars", ["comet", "cupid"]],
        ["🎂 A giant fancy cake", ["prancer", "donner"]],
      ],
    },
    {
      q: "Your friends say you are…",
      a: [
        ["🦸 Brave", ["rudolph", "blitzen"]],
        ["⚡ Super fast", ["dasher", "comet"]],
        ["💕 Super kind", ["cupid", "dancer"]],
        ["🧠 Super clever", ["vixen", "donner"]],
      ],
    },
    {
      q: "What would be your job on Santa's sleigh team?",
      a: [
        ["🔦 Leading the way in the dark", ["rudolph"]],
        ["🗺️ Finding the fastest route", ["comet", "dasher"]],
        ["🎶 Keeping everyone cheerful", ["dancer", "cupid"]],
        ["🎁 Carrying the heaviest presents", ["donner", "prancer"]],
      ],
    },
    {
      q: "Pick a superpower:",
      a: [
        ["✨ Making things glow", ["rudolph", "prancer"]],
        ["🌠 Flying to the stars", ["comet", "blitzen"]],
        ["🫶 Making anyone feel happy", ["cupid", "dancer"]],
        ["🕵️ Being invisible", ["vixen", "dasher"]],
      ],
    },
    {
      q: "What's the best part of Christmas?",
      a: [
        ["👨‍👩‍👧 Being with family and friends", ["cupid", "donner"]],
        ["🎉 The parties and music", ["dancer", "prancer"]],
        ["🌟 The magic and the lights", ["comet", "rudolph"]],
        ["🎁 Unwrapping presents super fast", ["dasher", "vixen", "blitzen"]],
      ],
    },
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
    scores = Object.fromEntries(Object.keys(REINDEER).map((k) => [k, 0]));
    els.start.hidden = true;
    els.result.hidden = true;
    els.body.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const { q, a } = QUESTIONS[step];
    els.bar.style.width = (step / QUESTIONS.length) * 100 + "%";
    els.count.textContent = `Question ${step + 1} of ${QUESTIONS.length}`;
    els.question.textContent = q;
    U.restartAnimation(els.question);
    els.answers.replaceChildren(
      ...a.map(([label, deer]) => {
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
    if (step < QUESTIONS.length) renderQuestion();
    else showResult();
  }

  function showResult() {
    const best = Math.max(...Object.values(scores));
    const winners = Object.keys(scores).filter((k) => scores[k] === best);
    const r = REINDEER[U.pick(winners)];
    els.bar.style.width = "100%";
    els.body.hidden = true;
    document.getElementById("quiz-result-emoji").textContent = r.emoji;
    document.getElementById("quiz-result-name").textContent = r.name + "!";
    document.getElementById("quiz-result-tagline").textContent = r.tagline;
    document.getElementById("quiz-result-desc").textContent = r.desc;
    els.result.hidden = false;
    U.celebrate(25);
  }

  SantaFeatures.register({
    id: "reindeer-quiz",
    icon: "🦌",
    title: "Which Reindeer Are You?",
    shortTitle: "Reindeer Quiz",
    description: "Take the quiz and find out which of Santa's reindeer you are.",
    init,
  });
})();
