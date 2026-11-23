/** Gentle falling snow on a full-screen canvas. */
(function () {
  const canvas = document.getElementById("snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let flakes = [];
  let w, h;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(160, Math.round((w * h) / 9000));
    flakes = Array.from({ length: count }, () => makeFlake(true));
  }

  function makeFlake(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: 1 + Math.random() * 2.8,
      speed: 0.4 + Math.random() * 1.2,
      drift: Math.random() * Math.PI * 2,
      opacity: 0.4 + Math.random() * 0.6,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.opacity})`;
      ctx.fill();
    }
  }

  function tick() {
    for (const f of flakes) {
      f.drift += 0.01;
      f.y += f.speed;
      f.x += Math.sin(f.drift) * 0.4;
      if (f.y > h + 10) Object.assign(f, makeFlake(false));
    }
    draw();
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  if (reduced) draw();
  else tick();
})();
