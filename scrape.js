const cheerio = require("cheerio");
const fs = require("fs");

const MAX_LINES = 5;
const MAX_TEXT_LENGTH = 250;
const TOTAL = 1142;
const DELAY_MS = 150;

const BANNED_PATTERNS = [
  /хуй|хуя|хую|хуем|нахуй|похуй|охуе/i,
  /пизд/i,
  /еба|ёба|заеб|выеб|наеб|поеб|уеб|ебан|ёбан/i,
  /блядь|блять|бляди|блядск/i,
  /мудак|мудил/i,
  /залуп/i,
  /шлюх/i,
  /сука|суки|суку|сукой/i,
  /негр/i,
  /пидор|пидар|педик/i,
  /чурк/i,
  /жид(?!к)/i,
  /хач(?!апури)/i,
  /ниггер/i,
  /путин/i,
  /хохол|хохлы|хохла|хохлов/i,
  /китаец|китайц/i,
  /зеленск/i,
  /навальн/i,
  /лукашенк/i,
];

async function main() {
  const jokes = [];
  let skippedFilter = 0, skippedLength = 0, errors = 0;

  for (let i = 1; i <= TOTAL; i++) {
    try {
      const res = await fetch(`https://baneks.ru/${i}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AnekdotWidget/1.0; +https://github.com)",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);
      const el = $("article p");
      const jokeHtml = el.html();
      const jokeText = el.text();

      if (!jokeHtml || !jokeText.trim()) {
        errors++;
      } else {
        const lines = (jokeHtml.match(/<br\s*\/?>/gi) || []).length + 1;
        const fits = lines <= MAX_LINES && jokeText.length <= MAX_TEXT_LENGTH;
        const clean = !BANNED_PATTERNS.some((p) => p.test(jokeText));

        if (!fits) {
          skippedLength++;
        } else if (!clean) {
          skippedFilter++;
        } else {
          jokes.push(jokeHtml.trim().replace(/<br\s*\/?>\s*/gi, "<br>"));
        }
      }
    } catch (err) {
      errors++;
    }

    if (i % 100 === 0) {
      process.stdout.write(`${i}/${TOTAL} — collected: ${jokes.length}\n`);
      fs.writeFileSync("./jokes.json", JSON.stringify(jokes, null, 2));
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  fs.writeFileSync("./jokes.json", JSON.stringify(jokes, null, 2));
  console.log(`\nDone! Saved ${jokes.length} jokes.`);
  console.log(`Skipped (too long): ${skippedLength}, filtered: ${skippedFilter}, errors: ${errors}`);
}

main().catch(console.error);
