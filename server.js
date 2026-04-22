const express = require("express");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

let cache = { date: null, jokes: [] };

async function fetchJokes() {
  const today = new Date().toISOString().slice(0, 10);
  if (cache.date === today && cache.jokes.length > 0) {
    return cache.jokes;
  }

  const res = await fetch("https://www.anekdot.ru/release/anekdot/day/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AnekdotWidget/1.0; +https://github.com)",
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const jokes = [];
  $(".text").each((_, el) => {
    const text = $(el).html();
    if (text && text.trim().length > 0) {
      jokes.push(text.trim());
    }
  });

  if (jokes.length > 0) {
    cache = { date: today, jokes };
  }

  return jokes;
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

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #fff;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(16px, 4vw, 32px);
    }

    .card {
      max-width: 600px;
      width: 100%;
    }

    .joke {
      font-size: clamp(15px, 2.5vw, 18px);
      line-height: 1.6;
      white-space: pre-line;
    }

    .actions {
      margin-top: clamp(16px, 3vw, 24px);
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      display: inline-block;
      padding: 8px 20px;
      font-size: clamp(13px, 2vw, 15px);
      color: #fff;
      background: #2563eb;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }

    .btn:hover { background: #1d4ed8; }

    .source {
      margin-top: clamp(20px, 4vw, 32px);
      font-size: clamp(11px, 1.8vw, 13px);
      color: #999;
    }

    .source a { color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="joke">${jokeHtml}</div>
    <div class="actions">
      <a class="btn" href="/">Ещё анекдот</a>
    </div>
    <div class="source">Источник: <a href="https://www.anekdot.ru" target="_blank" rel="noopener">anekdot.ru</a></div>
  </div>
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

app.get("/", async (req, res) => {
  try {
    const jokes = await fetchJokes();
    if (jokes.length === 0) {
      return res.send(renderError());
    }
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    res.removeHeader("X-Frame-Options");
    res.send(renderPage(joke));
  } catch (err) {
    console.error("Failed to fetch jokes:", err.message);
    res.send(renderError());
  }
});

app.listen(PORT, () => {
  console.log(`Anekdot server running at http://localhost:${PORT}`);
});
