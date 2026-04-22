const express = require("express");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_LINES = 5;
const MAX_TEXT_LENGTH = 250;
const MAX_ATTEMPTS = 10;

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
    if (jokeHtml && fitsIn200px(jokeHtml, jokeText)) {
      return jokeHtml.trim().replace(/<br\s*\/?>\s*/gi, "<br>");
    }
  }
  return null;
}

function renderPage(jokeHtml) {
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
      <a class="btn" id="btn" href="/">Ещё анекдот</a>
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

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

app.get("/", async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET / from ${req.ip}`);
  try {
    const joke = await fetchJoke();
    if (!joke) {
      return res.send(renderError());
    }
    console.log(`[${new Date().toISOString()}] Serving joke (${joke.length} chars)`);
    res.send(renderPage(joke));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to fetch jokes:`, err.message);
    res.send(renderError());
  }
});

app.listen(PORT, () => {
  console.log(`Anekdot server running at http://localhost:${PORT}`);
});
