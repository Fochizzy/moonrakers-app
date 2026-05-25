const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "game-trends.tsx"),
  "utf8",
);

assert.match(
  source,
  /import PageShell from ["']@\/components\/ui\/PageShell["']/,
  "expected game-trends to use the shared PageShell visual system",
);

assert.match(
  source,
  /import HeroCard from ["']@\/components\/ui\/HeroCard["']/,
  "expected game-trends to use the shared HeroCard visual system",
);

assert.match(
  source,
  /import SectionCard from ["']@\/components\/ui\/SectionCard["']/,
  "expected game-trends to use the shared SectionCard component",
);

assert.doesNotMatch(
  source,
  /function SectionCard\(/,
  "expected game-trends to stop defining a local SectionCard helper",
);

assert.doesNotMatch(
  source,
  /StarryNight/,
  "expected game-trends to stop using the old route-local StarryNight backdrop",
);

assert.match(
  source,
  /buildPlayerProfileRoute/,
  "expected game-trends player cards to use the canonical player profile route helper",
);

console.log("game-trends-visual-system.test.cjs passed");
