// Sanity checks for the portfolio Worker before deploying.
// Run with: npm run check --workspace @moonrakers/portfolio
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');

const problems = [];
const warnings = [];

// The photo is the one asset that can go missing without breaking the build:
// index.html degrades to an "IH" monogram, which is easy to ship by accident.
const portrait = resolve(root, 'public/media/portrait.jpg');
if (!existsSync(portrait)) {
  warnings.push(
    'public/media/portrait.jpg is missing — the page will render the monogram ' +
    'fallback instead of your photo. See apps/portfolio/README.md.',
  );
}

// Every destination the page promises, so a typo in a URL fails here and not
// in front of whoever the portfolio was sent to.
const expected = [
  'https://www.moonrakersapp.org/',
  'https://www.tm-stats.com/',
  'https://dnd4eparse.org/',
  'https://adnd-bestiary.fochizzy.workers.dev/',
  'https://lotus-blossom-district-atlas.fochizzy.workers.dev/',
  'https://standards.social-current.org/',
  'https://play.google.com/store/apps/details?id=com.fochizzy.moonrakers',
  'https://play.google.com/store/apps/details?id=com.fochizzy87.valeriarandom',
];
for (const url of expected) {
  if (!html.includes(`href="${url}"`)) problems.push(`missing link: ${url}`);
}

// Anything opening a new tab needs rel="noopener" alongside it.
const blankTargets = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? [];
for (const tag of blankTargets) {
  if (!tag.includes('rel="noopener noreferrer"')) {
    problems.push(`target="_blank" without rel="noopener noreferrer": ${tag.slice(0, 80)}…`);
  }
}

if (!/<meta name="viewport"/.test(html)) problems.push('missing viewport meta tag');
if (!/<title>[^<]+<\/title>/.test(html)) problems.push('missing <title>');

for (const w of warnings) console.warn(`warn  ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`error ${p}`);
  process.exit(1);
}
console.log(`ok    ${expected.length} links, ${blankTargets.length} external anchors, meta present`);
