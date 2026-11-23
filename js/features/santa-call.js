/**
 * Feature: Call from Santa
 * A pretend video call. Santa speaks a personal message using the browser's
 * built-in speech synthesis (with subtitles, so it also works without sound).
 */
(function () {
  const U = SantaUtils;

  const RING_MS = 4200;

  const MIDDLE_LINES = [
    "Mrs. Claus says hello, and Rudolph sends you a big reindeer hug!",
    "The elves told me you have been very helpful at home. That makes me so happy!",
    "I heard you have been sharing with your friends. That is the true Christmas spirit!",
    "Dasher and Dancer are practicing their flying every day, just for Christmas Eve!",
  ];

  function buildScript(name) {
    const days = U.daysUntilChristmas();
    const countdown =
      days === 0 ? "Today is Christmas Day! I hope you love your presents!" :
      days === 1 ? "Christmas is tomorrow! The sleigh is packed and ready to go!" :
      days > 300 ? "Christmas was just a few days ago, and I'm already planning for next year!" :
      `There are only ${days} days left until Christmas, and the elves are working very hard in the workshop.`;

    return [
      `Ho ho ho! Hello ${name}! It's Santa Claus, calling all the way from the North Pole!`,
      "I wanted to tell you something very special.",
      "I checked my list, and I checked it twice... and you have been really, really good this year!",
      `That's why your name is on my Nice List, ${name}!`,
      U.pick(MIDDLE_LINES),
      countdown,
      "Remember to be kind, listen to your family, and go to bed early on Christmas Eve.",
      `I have to go now, the reindeer are waiting for their carrots. Merry Christmas, ${name}! Ho ho ho!`,
    ];
  }

  let els = {};
  let call = null; // { id, name, startedAt, connectedAt, timers: [], ring }
  let callCounter = 0;
  let muted = false;
  let lastName = "";

  const speechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  function init() {
    els = {
      form: document.getElementById("call-form"),
      input: document.getElementById("call-name"),
      phone: document.getElementById("call-phone"),
      screen: document.getElementById("call-screen"),
      status: document.getElementById("call-status"),
      timer: document.getElementById("call-timer"),
      avatar: document.getElementById("call-avatar"),
      subtitle: document.getElementById("call-subtitle"),
      mute: document.getElementById("call-mute"),
      hangup: document.getElementById("call-hangup"),
      ended: document.getElementById("call-ended"),
      endedText: document.getElementById("call-ended-text"),
    };

    if (speechSupported) {
      // Some browsers load voices asynchronously.
      speechSynthesis.getVoices();
      speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
    }

    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = U.formatName(els.input.value);
      if (!name) return els.input.focus();
      startCall(name);
    });

    els.hangup.addEventListener("click", () => endCall(true));

    els.mute.addEventListener("click", () => {
      muted = !muted;
      els.mute.setAttribute("aria-pressed", String(muted));
      els.mute.textContent = muted ? "🔇" : "🔊";
      els.mute.title = muted ? "Unmute Santa's voice" : "Mute Santa's voice";
      if (muted && speechSupported) speechSynthesis.cancel();
      if (muted && call && call.ring) call.ring.stop();
    });

    document.getElementById("call-again").addEventListener("click", () => startCall(lastName));
    document.getElementById("call-new").addEventListener("click", () => {
      els.ended.hidden = true;
      els.form.hidden = false;
      els.input.value = "";
      els.input.focus();
    });

    if (!speechSupported) {
      els.mute.hidden = true;
    }
  }

  function startCall(name) {
    lastName = name;
    const id = ++callCounter;
    call = { id, name, startedAt: Date.now(), connectedAt: null, timers: [], ring: null };

    els.form.hidden = true;
    els.ended.hidden = true;
    els.phone.hidden = false;
    els.screen.classList.add("is-ringing");
    els.screen.classList.remove("is-connected", "is-speaking");
    els.status.textContent = "Calling the North Pole…";
    els.timer.textContent = "";
    els.subtitle.textContent = "";

    if (!muted) call.ring = ringTone();

    later(() => {
      if (call.ring) call.ring.stop();
      els.screen.classList.remove("is-ringing");
      els.screen.classList.add("is-connected");
      els.status.textContent = "🔴 Connected · North Pole";
      call.connectedAt = Date.now();
      tickTimer();
      playLines(buildScript(name), 0, id);
    }, RING_MS);
  }

  function later(fn, ms) {
    if (!call) return;
    const id = call.id;
    call.timers.push(setTimeout(() => { if (call && call.id === id) fn(); }, ms));
  }

  function tickTimer() {
    if (!call || !call.connectedAt) return;
    els.timer.textContent = formatDuration(Date.now() - call.connectedAt);
    later(tickTimer, 1000);
  }

  function playLines(lines, index, id) {
    if (!call || call.id !== id) return;
    if (index >= lines.length) {
      later(() => endCall(false), 1200);
      return;
    }

    const text = lines[index];
    els.subtitle.textContent = text;
    els.screen.classList.add("is-speaking");

    let done = false;
    const next = () => {
      if (done || !call || call.id !== id) return;
      done = true;
      els.screen.classList.remove("is-speaking");
      later(() => playLines(lines, index + 1, id), 450);
    };

    if (speechSupported && !muted) {
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) utter.voice = voice;
      utter.lang = voice ? voice.lang : "en-US";
      utter.pitch = 0.6;
      utter.rate = 0.88;
      utter.onend = next;
      utter.onerror = next;
      speechSynthesis.speak(utter);
      // Safety net in case the browser never fires "end".
      later(next, 1500 + text.length * 110);
    } else {
      later(next, 1200 + text.length * 55);
    }
  }

  function pickVoice() {
    const voices = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
    if (!voices.length) return null;
    const preferred = /(male|daniel|george|arthur|david|fred|alex|guy|ryan|thomas|james|google uk english male)/i;
    return voices.find((v) => preferred.test(v.name) && !/female/i.test(v.name)) || voices[0];
  }

  function endCall(byUser) {
    if (!call) return;
    const c = call;
    call = null;
    c.timers.forEach(clearTimeout);
    if (c.ring) c.ring.stop();
    if (speechSupported) speechSynthesis.cancel();

    els.phone.hidden = true;
    els.ended.hidden = false;
    if (!c.connectedAt) {
      els.endedText.textContent = "You hung up before Santa answered. He's probably feeding the reindeer — try again!";
    } else {
      const duration = formatDuration(Date.now() - c.connectedAt);
      els.endedText.textContent = byUser
        ? `You talked with Santa for ${duration}. He says: "Ho ho ho, talk soon!"`
        : `You talked with Santa for ${duration}. Merry Christmas, ${c.name}! 🎄`;
      if (!byUser) U.celebrate(30);
    }
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /** A gentle phone ring made with the Web Audio API. */
  function ringTone() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return { stop() {} };
    let ctx;
    try { ctx = new Ctx(); } catch (e) { return { stop() {} }; }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    [440, 480].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
    });
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = t0 + i * 2;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.05);
      gain.gain.setValueAtTime(0.08, start + 1);
      gain.gain.linearRampToValueAtTime(0, start + 1.05);
    }
    return { stop() { ctx.close().catch(() => {}); } };
  }

  SantaFeatures.register({
    id: "santa-call",
    icon: "📞",
    title: "Call from Santa",
    shortTitle: "Call",
    description: "Santa calls you on a magic video call and talks to you by name.",
    init,
    onHide: () => endCall(true),
  });
})();
