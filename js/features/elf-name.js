/**
 * Feature: Elf Name Generator
 * The same real name always gives the same elf name, job and ID card.
 */
(function () {
  const U = SantaUtils;

  const FIRST = [
    "Jingle", "Twinkle", "Sparkle", "Tinsel", "Buddy", "Pepper", "Sugarplum", "Snowy",
    "Merry", "Cocoa", "Holly", "Ginger", "Frosty", "Poppy", "Candy", "Bell",
    "Sprinkle", "Noel", "Cookie", "Marshmallow", "Pudding", "Starla", "Nutmeg", "Clove",
  ];

  const LAST = [
    "Sparkletoes", "McJingles", "Snowflake", "Candycane", "Gumdrop", "Mistletoe",
    "Fizzlewick", "Plumpudding", "Tinseltoes", "Peppermint", "Frostbottom", "Glitterboots",
    "Cinnamon", "Sleighbell", "Twinkletoes", "Hollyberry", "Jollybean", "Snowdrop",
    "Gingersnap", "Merrywhistle",
  ];

  const JOBS = [
    ["Chief Cookie Taster", "Kitchen & Bakery"],
    ["Head of Wrapping Paper", "Wrapping Department"],
    ["Reindeer Hairstylist", "Reindeer Stables"],
    ["Toy Quality Inspector", "Toy Workshop"],
    ["Sleigh Polisher", "Sleigh Garage"],
    ["Snowball Engineer", "Research & Snow Development"],
    ["Bell Tuner", "Music Department"],
    ["Candy Cane Striper", "Candy Factory"],
    ["Letter Reader", "Santa's Mailroom"],
    ["Hot Cocoa Barista", "Kitchen & Bakery"],
    ["Chimney Measurement Expert", "Delivery Planning"],
    ["Ribbon Curler", "Wrapping Department"],
    ["Teddy Bear Stuffer", "Toy Workshop"],
    ["Snow Globe Shaker", "Toy Workshop"],
    ["Sleigh Map Navigator", "Delivery Planning"],
    ["Nice List Keeper", "Santa's Office"],
    ["Carrot Supplier for Rudolph", "Reindeer Stables"],
    ["Christmas Light Untangler", "Decorations Department"],
  ];

  const TREATS = ["Gingerbread", "Candy canes", "Hot cocoa", "Sugar cookies", "Marshmallows", "Fruitcake", "Peppermint bark", "Chocolate coins"];
  const AVATARS = ["🧝", "🧝‍♀️", "🧝‍♂️", "🧝🏻", "🧝🏽", "🧝🏿", "🧝🏻‍♀️", "🧝🏾‍♀️", "🧝🏼‍♂️", "🧝🏿‍♂️"];

  const W = 1000;
  const H = 630;

  let canvas, ctx, form, input, result, reveal, shareHint;
  let current = null;

  function makeElf(name) {
    const rand = U.seededRandom(U.hashString(name.toLowerCase()));
    const at = (list) => list[Math.floor(rand() * list.length)];
    const [job, department] = at(JOBS);
    return {
      realName: name,
      elfName: `${at(FIRST)} ${at(LAST)}`,
      job,
      department,
      treat: at(TREATS),
      avatar: at(AVATARS),
      years: 1 + Math.floor(rand() * 300),
      id: "ELF-" + String(Math.floor(rand() * 1e6)).padStart(6, "0"),
      barcode: Array.from({ length: 46 }, () => 1 + Math.floor(rand() * 4)),
    };
  }

  function init() {
    form = document.getElementById("elf-form");
    input = document.getElementById("elf-input");
    result = document.getElementById("elf-result");
    reveal = document.getElementById("elf-reveal");
    shareHint = document.getElementById("elf-share-hint");
    canvas = document.getElementById("elf-canvas");
    ctx = canvas.getContext("2d");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = U.formatName(input.value);
      if (!name) return input.focus();
      current = makeElf(name);
      await U.fontsReady();
      draw(current);
      reveal.textContent = `${name}, your elf name is ${current.elfName}!`;
      shareHint.textContent = "";
      form.hidden = true;
      result.hidden = false;
      U.celebrate(25);
    });

    document.getElementById("elf-download").addEventListener("click", () => {
      if (current) U.downloadCanvas(canvas, `elf-id-${U.slug(current.elfName)}.png`);
    });

    document.getElementById("elf-share").addEventListener("click", share);

    document.getElementById("elf-again").addEventListener("click", () => {
      result.hidden = true;
      form.hidden = false;
      input.value = "";
      input.focus();
    });
  }

  async function share() {
    if (!current) return;
    const text = `🧝 My elf name is ${current.elfName}, ${current.job} at the North Pole! Find your elf name:`;
    const url = location.href.split("#")[0] + "#elf-name";
    try {
      if (navigator.share) {
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        const file = blob && new File([blob], "elf-id.png", { type: "image/png" });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text: `${text} ${url}`, files: [file] });
        } else {
          await navigator.share({ text, url });
        }
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      shareHint.textContent = "✅ Copied! Paste it to your friends.";
    } catch (e) {
      if (e && e.name === "AbortError") return;
      shareHint.textContent = "Sharing isn't available here — download the card instead!";
    }
  }

  function draw(elf) {
    // Card background
    ctx.clearRect(0, 0, W, H);
    U.roundRect(ctx, 0, 0, W, H, 36);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.save();
    ctx.clip();

    // Header band
    const header = ctx.createLinearGradient(0, 0, W, 0);
    header.addColorStop(0, "#146b3a");
    header.addColorStop(1, "#1e8f4f");
    ctx.fillStyle = header;
    ctx.fillRect(0, 0, W, 120);
    // Candy stripe under header
    for (let x = -40; x < W + 40; x += 40) {
      ctx.fillStyle = (x / 40) % 2 === 0 ? "#c8102e" : "#fff";
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x + 20, 120);
      ctx.lineTo(x + 40, 136);
      ctx.lineTo(x + 20, 136);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = '700 54px "Mountains of Christmas", serif';
    ctx.fillText("North Pole · Official Elf ID", 40, 62);
    ctx.font = "56px serif";
    ctx.textAlign = "right";
    ctx.fillText("🎄", W - 40, 62);

    // Photo frame
    const px = 50, py = 180, pw = 250, ph = 300;
    U.roundRect(ctx, px, py, pw, ph, 20);
    const photo = ctx.createLinearGradient(0, py, 0, py + ph);
    photo.addColorStop(0, "#dff1ff");
    photo.addColorStop(1, "#bfe0f5");
    ctx.fillStyle = photo;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#f8b229";
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "190px serif";
    ctx.fillText(elf.avatar, px + pw / 2, py + ph / 2 + 10);

    // Details
    const tx = 340;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#c8102e";
    U.fitText(ctx, elf.elfName, tx, 240, W - tx - 40, 76, '700 {size} "Mountains of Christmas", serif');

    ctx.fillStyle = "#7a6250";
    U.fitText(ctx, `a.k.a. ${elf.realName}`, tx, 285, W - tx - 40, 28, 'italic 400 {size} "Nunito", sans-serif');

    const rows = [
      ["JOB", elf.job],
      ["DEPARTMENT", elf.department],
      ["FAVORITE TREAT", elf.treat],
      ["YEARS OF SERVICE", String(elf.years)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 340 + i * 56;
      ctx.fillStyle = "#146b3a";
      ctx.font = '800 18px "Nunito", sans-serif';
      ctx.fillText(label, tx, y);
      ctx.fillStyle = "#2a1a12";
      U.fitText(ctx, value, tx, y + 28, W - tx - 40, 28, '600 {size} "Nunito", sans-serif');
    });

    // Footer: ID number, barcode, signature
    ctx.fillStyle = "#2a1a12";
    ctx.font = '800 24px "Nunito", sans-serif';
    ctx.fillText(elf.id, 50, 530);

    let bx = 50;
    ctx.fillStyle = "#2a1a12";
    elf.barcode.forEach((w, i) => {
      if (i % 2 === 0) ctx.fillRect(bx, 545, w * 2, 50);
      bx += w * 2 + 2;
    });

    ctx.textAlign = "right";
    ctx.fillStyle = "#c8102e";
    ctx.font = '700 48px "Mountains of Christmas", serif';
    ctx.fillText("Santa Claus", W - 50, 570);
    ctx.strokeStyle = "#2a1a12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 320, 582);
    ctx.lineTo(W - 50, 582);
    ctx.stroke();
    ctx.fillStyle = "#7a6250";
    ctx.font = '400 18px "Nunito", sans-serif';
    ctx.fillText("Approved by Santa", W - 50, 606);

    ctx.restore();

    // Outer border
    U.roundRect(ctx, 3, 3, W - 6, H - 6, 34);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#146b3a";
    ctx.stroke();
  }

  SantaFeatures.register({
    id: "elf-name",
    icon: "🧝",
    title: "Elf Name Generator",
    shortTitle: "Elf Name",
    description: "Discover your elf name and North Pole job — with an official Elf ID card.",
    init,
  });
})();
