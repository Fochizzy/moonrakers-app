const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /import PageShell from ["']@\/components\/ui\/PageShell["']/,
  "expected player directory to use the shared PageShell visual system",
);

assert.match(
  source,
  /import HeroCard from ["']@\/components\/ui\/HeroCard["']/,
  "expected player directory to use the shared HeroCard visual system",
);

assert.match(
  source,
  /import SectionCard from ["']@\/components\/ui\/SectionCard["']/,
  "expected player directory to use the shared SectionCard component",
);

assert.doesNotMatch(
  source,
  /StarryNight/,
  "expected player directory to stop using the old StarryNight backdrop",
);

assert.match(
  source,
  /buildPlayerProfileRoute/,
  "expected player directory cards to use the canonical player profile route helper",
);

console.log("player-directory-visual-system.test.cjs passed");
