/**
 * Feature: Nice List Certificate
 * A printable / downloadable certificate drawn on a canvas.
 */
(function () {
  const U = SantaUtils;

  const REASONS = [
    "for outstanding kindness, generosity and Christmas spirit",
    "for being a wonderful friend and a great helper all year long",
    "for sharing, caring and spreading smiles everywhere",
    "for good manners, big hugs and a very kind heart",
    "for being brave, helpful and full of Christmas cheer",
  ];

  const W = 1600;
  const H = 1131;

  let canvas, ctx, form, input, result;
  let currentName = "";

  function init() {
    form = document.getElementById("cert-form");
    input = document.getElementById("cert-name");
    result = document.getElementById("cert-result");
    canvas = document.getElementById("cert-canvas");
    ctx = canvas.getContext("2d");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = U.formatName(input.value);
      if (!name) return input.focus();
      create(name);
    });

    document.getElementById("cert-download").addEventListener("click", () => {
      U.downloadCanvas(canvas, `nice-list-certificate-${U.slug(currentName)}.png`);
    });
    document.getElementById("cert-print").addEventListener("click", () => window.print());
    document.getElementById("cert-again").addEventListener("click", () => {
      result.hidden = true;
      form.hidden = false;
      input.value = "";
      input.focus();
    });
  }

  function onShow(data) {
    if (data && data.name) {
      input.value = data.name;
      create(data.name);
    }
  }

  async function create(name) {
    currentName = name;
    await U.fontsReady();
    draw(name);
    form.hidden = true;
    result.hidden = false;
    U.celebrate(30);
  }

  function draw(name) {
    const year = U.christmasYear();
    const seed = U.hashString(name.toLowerCase());
    const reason = REASONS[seed % REASONS.length];
    const number = `NP-${year}-${String(seed % 100000).padStart(5, "0")}`;
    const cx = W / 2;

    // Background
    const bg = ctx.createRadialGradient(cx, H / 2, 100, cx, H / 2, 900);
    bg.addColorStop(0, "#fffdf6");
    bg.addColorStop(1, "#f6ead0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Candy-cane outer border
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(40, 40, W - 80, H - 80);
    ctx.clip("evenodd");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 22;
    for (let i = -H; i < W + H; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    ctx.restore();

    // Inner frames
    ctx.strokeStyle = "#146b3a";
    ctx.lineWidth = 6;
    ctx.strokeRect(62, 62, W - 124, H - 124);
    ctx.strokeStyle = "#f8b229";
    ctx.lineWidth = 2;
    ctx.strokeRect(76, 76, W - 152, H - 152);

    // Corner decorations
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    [[130, 130], [W - 130, 130], [130, H - 130], [W - 130, H - 130]].forEach(([x, y]) => ctx.fillText("🎄", x, y));

    // Header
    ctx.fillStyle = "#146b3a";
    ctx.font = '800 30px "Nunito", sans-serif';
    ctx.textBaseline = "alphabetic";
    drawSpaced("★  OFFICIAL NORTH POLE DOCUMENT  ★", cx, 180, 6);

    ctx.fillStyle = "#c8102e";
    ctx.font = '700 130px "Mountains of Christmas", serif';
    ctx.fillText("Nice List Certificate", cx, 320);

    ctx.fillStyle = "#5a4636";
    ctx.font = 'italic 400 38px "Nunito", sans-serif';
    ctx.fillText("This is to certify that", cx, 420);

    // Name
    ctx.fillStyle = "#146b3a";
    U.fitText(ctx, name, cx, 560, 1150, 150, '700 {size} "Mountains of Christmas", serif');
    ctx.strokeStyle = "#f8b229";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 480, 595);
    ctx.lineTo(cx + 480, 595);
    ctx.stroke();

    ctx.fillStyle = "#2a1a12";
    ctx.font = '600 38px "Nunito", sans-serif';
    ctx.fillText(`has been officially placed on Santa's Nice List for Christmas ${year}`, cx, 670);
    ctx.fillStyle = "#5a4636";
    ctx.font = 'italic 400 34px "Nunito", sans-serif';
    ctx.fillText(reason + ".", cx, 725);

    // Seal
    drawSeal(cx, 880);

    // Date (left) and signature (right)
    const lineY = 920;
    ctx.strokeStyle = "#2a1a12";
    ctx.lineWidth = 2;
    [[260, 660], [W - 660, W - 260]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a, lineY);
      ctx.lineTo(b, lineY);
      ctx.stroke();
    });
    ctx.fillStyle = "#2a1a12";
    ctx.font = '600 34px "Nunito", sans-serif';
    ctx.fillText(U.formatDate(), 460, lineY - 20);
    ctx.fillStyle = "#c8102e";
    ctx.font = '700 70px "Mountains of Christmas", serif';
    ctx.fillText("Santa Claus", W - 460, lineY - 18);

    ctx.fillStyle = "#7a6250";
    ctx.font = '400 26px "Nunito", sans-serif';
    ctx.fillText("Date · North Pole", 460, lineY + 40);
    ctx.fillText("Santa Claus, Chief of the North Pole", W - 460, lineY + 40);

    ctx.font = '600 22px "Nunito", sans-serif';
    ctx.fillStyle = "#a08a70";
    ctx.fillText(`Certificate No. ${number}`, 460, lineY + 85);
  }

  function drawSpaced(text, x, y, spacing) {
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let pos = x - total / 2;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
      ctx.fillText(c, pos, y);
      pos += widths[i];
    });
    ctx.textAlign = "center";
  }

  function drawSeal(x, y) {
    // Ribbons
    ctx.fillStyle = "#c8102e";
    [[-1], [1]].forEach(([dir]) => {
      ctx.beginPath();
      ctx.moveTo(x + dir * 30, y + 40);
      ctx.lineTo(x + dir * 80, y + 160);
      ctx.lineTo(x + dir * 55, y + 140);
      ctx.lineTo(x + dir * 40, y + 170);
      ctx.lineTo(x + dir * 5, y + 50);
      ctx.closePath();
      ctx.fill();
    });

    // Scalloped gold seal
    const points = 28;
    ctx.beginPath();
    for (let i = 0; i <= points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 105 : 92;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    const gold = ctx.createRadialGradient(x - 30, y - 30, 10, x, y, 110);
    gold.addColorStop(0, "#ffe08a");
    gold.addColorStop(1, "#d99a12");
    ctx.fillStyle = gold;
    ctx.fill();

    ctx.strokeStyle = "rgba(122, 83, 0, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 74, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#7a4a00";
    ctx.textAlign = "center";
    ctx.font = '800 22px "Nunito", sans-serif';
    ctx.fillText("SANTA'S", x, y - 22);
    ctx.font = '800 40px "Nunito", sans-serif';
    ctx.fillText("NICE", x, y + 18);
    ctx.font = '800 22px "Nunito", sans-serif';
    ctx.fillText("★ LIST ★", x, y + 48);
  }

  SantaFeatures.register({
    id: "nice-certificate",
    icon: "🏅",
    title: "Nice List Certificate",
    shortTitle: "Certificate",
    description: "Get an official, printable certificate signed by Santa.",
    init,
    onShow,
  });
})();
