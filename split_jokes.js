const fs = require("fs");

const suspicious = new Set([
  // Explicit sexual/crude
  21, 25, 32, 43, 45, 46, 51, 53, 71, 86, 88, 93, 98, 100, 101, 111, 148,
  150, 152, 155, 156, 160, 161, 172, 174, 184, 186, 190, 192, 197, 204, 207,
  219, 223, 225, 228, 229, 234, 254, 258, 260, 266, 267, 287, 309, 311, 313,
  315, 316, 327, 339, 350, 352, 353, 358, 360, 361, 363, 365, 366, 367, 371,
  395, 396, 403, 419, 451, 463, 475, 493, 494, 498, 504, 507, 515,
  // Pedophilia
  114, 295, 477, 501,
  // Rape / violence against women
  18, 27, 67, 102, 226, 230, 273, 290, 325, 371, 386,
  // Antisemitism
  35, 119, 120, 135, 167, 233, 376, 378, 379,
  // Ethnic slurs / stereotypes
  19, 20, 31, 43, 208, 239, 241, 242, 251, 297, 298, 300, 342, 377, 431,
  445, 450, 454, 486, 487, 488, 531, 533,
  // Body-shaming / ableism
  8, 11, 49, 58, 64, 75, 106, 125, 171, 188, 257, 268, 423, 467, 483, 492,
  // Homophobia
  112, 132, 414,
  // Dark cruelty (children, animals)
  102, 106, 188, 208, 268, 483,
  // Political
  83, 85, 113,
  // Not a joke / unfunny
  57, 94, 95, 253, 334, 341,
]);

const jokes = JSON.parse(fs.readFileSync("./jokes.json", "utf8"));

const clean = [];
const review = [];

jokes.forEach((joke, i) => {
  if (suspicious.has(i)) {
    review.push(joke);
  } else {
    clean.push(joke);
  }
});

fs.writeFileSync("./jokes.json", JSON.stringify(clean, null, 2));
fs.writeFileSync("./jokes_review.json", JSON.stringify(review, null, 2));

console.log(`Clean: ${clean.length}`);
console.log(`For review: ${review.length}`);
