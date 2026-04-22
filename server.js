const express = require("express");
const cheerio = require("cheerio");
const sharp = require("sharp");
const stirlitzJokes = require("./stirlitz.json");

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_LINES = 5;
const MAX_TEXT_LENGTH = 250;
const MAX_ATTEMPTS = 10;
const CACHE_TTL = 10_000;

// Content filter: profanity, group slurs, political
const BANNED_PATTERNS = [
  // Russian mat (profanity) — stems cover all morphological forms
  /хуй|хуя|хую|хуем|нахуй|похуй|охуе/i,
  /пизд/i,
  /еба|ёба|заеб|выеб|наеб|поеб|уеб|ебан|ёбан/i,
  /блядь|блять|бляди|блядск/i,
  /мудак|мудил/i,
  /залуп/i,
  /шлюх/i,
  /сука|суки|суку|сукой/i,
  // Group slurs
  /негр/i,
  /пидор|пидар|педик/i,
  /чурк/i,
  /жид(?!к)/i,           // жид-slur, but not жидкий/жидкость
  /хач(?!апури)/i,       // хач-slur, but not хачапури
  /ниггер/i,
  // Political: Russia/Ukraine conflict, specific leaders
  /путин/i,
  /хохол|хохлы|хохла|хохлов/i,
  /китаец|китайц/i,
  /зеленск/i,
  /навальн/i,
  /лукашенк/i,
];

function containsBannedContent(text) {
  return BANNED_PATTERNS.some((p) => p.test(text));
}

function fitsIn200px(html, plainText) {
  const lines = (html.match(/<br\s*\/?>/gi) || []).length + 1;
  return lines <= MAX_LINES && plainText.length <= MAX_TEXT_LENGTH;
}

async function fetchJoke() {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const res = await fetch("https://baneks.ru/random", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AnekdotWidget/1.0; +https://github.com)",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const el = $("article p");
    const jokeHtml = el.html();
    const jokeText = el.text();
    if (
      jokeHtml &&
      fitsIn200px(jokeHtml, jokeText) &&
      !containsBannedContent(jokeText)
    ) {
      return jokeHtml.trim().replace(/<br\s*\/?>\s*/gi, "<br>");
    }
  }
  return null;
}

// --- Image generation helpers ---

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function wrapText(text, maxChars) {
  const lines = [];
  for (const para of text.split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (line.length + 1 + word.length <= maxChars) {
        line += " " + word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateJokeImage(jokeText, label = "Случайный анекдот:") {
  const W = 200, PAD = 12, FS = 13, LH = 20;
  const LABEL_FS = 10, LABEL_H = 16;
  const CHARS_PER_LINE = 22;

  const lines = wrapText(jokeText, CHARS_PER_LINE);
  const height = PAD + LABEL_H + lines.length * LH + PAD;

  const labelNode =
    `<text x="${PAD}" y="${PAD + LABEL_FS}" ` +
    `font-family="DejaVu Sans,Liberation Sans,sans-serif" ` +
    `font-size="${LABEL_FS}" fill="#999999">${escapeXml(label)}</text>`;

  const textNodes = lines
    .map(
      (l, i) =>
        `<text x="${PAD}" y="${PAD + LABEL_H + i * LH + FS}" ` +
        `font-family="DejaVu Sans,Liberation Sans,sans-serif" ` +
        `font-size="${FS}" fill="#1a1a1a">${escapeXml(l)}</text>`
    )
    .join("\n  ");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}">` +
    `<rect width="${W}" height="${height}" fill="white"/>` +
    `${labelNode}${textNodes}</svg>`;

  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

// --- Page renderers ---

function renderPage(jokeHtml, href = "/") {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Анекдот дня</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { height: auto; overflow: hidden; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: transparent;
      color: #1a1a1a;
      padding: 10px;
    }

    @media (prefers-color-scheme: dark) {
      body { color: #e8e8e8; }
    }

    .card {
      max-width: 600px;
      text-align: left;
    }

    .joke {
      font-size: 16px;
      line-height: 1.6;
      white-space: normal;
    }

    .actions {
      margin-top: 8px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      display: inline-block;
      padding: 6px 16px;
      font-size: 13px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: filter 0.2s;
    }

    .btn:hover { filter: brightness(0.85); }

</style>
</head>
<body>
  <div class="card">
    <div class="joke">${jokeHtml}</div>
    <div class="actions">
      <a class="btn" id="btn" href="${href}">Ещё анекдот</a>
    </div>
  </div>
  <script>
    (function() {
      var h = Math.floor(Math.random() * 360);
      var s = 55 + Math.floor(Math.random() * 30);
      var l = 40 + Math.floor(Math.random() * 20);
      var btn = document.getElementById("btn");
      btn.style.background = "hsl(" + h + "," + s + "%," + l + "%)";
      btn.style.color = l < 55 ? "#fff" : "#1a1a1a";
    })();
  </script>
</body>
</html>`;
}

function renderError() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Анекдот дня</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; padding: 20px;
      color: #666;
    }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <p>Не удалось загрузить анекдот. <a href="/">Попробовать снова</a></p>
</body>
</html>`;
}

// --- Middleware ---

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

// --- Routes ---

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let imgCache = { buf: null, ts: 0 };
let stirlitzImgCache = { buf: null, ts: 0 };

app.get("/joke.jpg", async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /joke.jpg from ${req.ip}`);
  const now = Date.now();

  if (imgCache.buf && now - imgCache.ts < CACHE_TTL) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL / 1000}`);
    return res.send(imgCache.buf);
  }

  try {
    const jokeHtml = await fetchJoke();
    if (!jokeHtml) {
      return res.status(503).type("text").send("Не удалось загрузить анекдот");
    }
    const jokeText = htmlToText(jokeHtml);
    const buf = await generateJokeImage(jokeText);
    imgCache = { buf, ts: now };
    console.log(
      `[${new Date().toISOString()}] Generated joke image (${buf.length} bytes)`
    );
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL / 1000}`);
    res.send(buf);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Failed to generate joke image:`,
      err.message
    );
    res.status(500).type("text").send("Ошибка сервера");
  }
});

app.get("/stirlitz", (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /stirlitz from ${req.ip}`);
  const joke = randomItem(stirlitzJokes);
  res.send(renderPage(htmlEscape(joke), "/stirlitz"));
});

app.get("/stirlitz.jpg", async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /stirlitz.jpg from ${req.ip}`);
  const now = Date.now();

  if (stirlitzImgCache.buf && now - stirlitzImgCache.ts < CACHE_TTL) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL / 1000}`);
    return res.send(stirlitzImgCache.buf);
  }

  try {
    const joke = randomItem(stirlitzJokes);
    const buf = await generateJokeImage(joke, "Случайный анекдот про Штирлица:");
    stirlitzImgCache = { buf, ts: now };
    console.log(
      `[${new Date().toISOString()}] Generated stirlitz image (${buf.length} bytes)`
    );
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", `public, max-age=${CACHE_TTL / 1000}`);
    res.send(buf);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Failed to generate stirlitz image:`,
      err.message
    );
    res.status(500).type("text").send("Ошибка сервера");
  }
});

app.get("/", async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET / from ${req.ip}`);
  try {
    const joke = await fetchJoke();
    if (!joke) {
      return res.send(renderError());
    }
    console.log(
      `[${new Date().toISOString()}] Serving joke (${joke.length} chars)`
    );
    res.send(renderPage(joke));
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] Failed to fetch jokes:`,
      err.message
    );
    res.send(renderError());
  }
});

app.listen(PORT, () => {
  console.log(`Anekdot server running at http://localhost:${PORT}`);
});
