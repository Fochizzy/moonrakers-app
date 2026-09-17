// Sanity checks for the portfolio Worker before deploying.
// Run with: npm run check --workspace @moonrakers/portfolio
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
const resume = readFileSync(resolve(root, 'public/resume.html'), 'utf8');

const problems = [];
const warnings = [];

// This repository is PUBLIC. The résumé is published with the email but without
// the phone number, deliberately. Matched as a shape rather than a literal so
// the number itself is never committed here to check against.
const PHONE = /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
for (const [name, source] of [['index.html', html], ['resume.html', resume]]) {
  const hit = source.match(PHONE);
  if (hit) problems.push(`${name} contains what looks like a phone number: ${hit[0]}`);
}
if (!resume.includes('izzy.hodnett@gmail.com')) {
  problems.push('resume.html is missing the contact email');
}
if (!html.includes('href="resume.html"')) {
  problems.push('index.html does not link to the résumé');
}

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
  'https://play.google.com/store/apps/details?id=com.fochizzy87.valeriascore',
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

// Every project and app card must carry the build attribution — that claim is
// the point of the page, so a card added without it is a bug, not a style nit.
const cards = (html.match(/<a\b[^>]*class="card"/g) ?? []).length;
const attributions = (html.match(/class="card__built"/g) ?? []).length;
if (cards !== attributions) {
  problems.push(
    `${cards} cards but ${attributions} "Built with Codex + Claude Code" lines — every card needs one`,
  );
}

if (!/<meta name="viewport"/.test(html)) problems.push('missing viewport meta tag');
if (!/<title>[^<]+<\/title>/.test(html)) problems.push('missing <title>');

for (const w of warnings) console.warn(`warn  ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`error ${p}`);
  process.exit(1);
}
console.log(
  `ok    ${expected.length} links, ${blankTargets.length} external anchors, ` +
  `${cards} cards all attributed, meta present, no phone number in either page`,
);
