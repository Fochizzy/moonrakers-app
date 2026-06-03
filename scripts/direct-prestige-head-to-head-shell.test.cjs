const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game.tsx"),
  "utf8",
);

assert.match(
  source,
  /styles\.sectionCard,\s*\{ borderColor: withAlpha\(currentAccent, 0\.28\), backgroundColor: UI\.card \}/,
  "expected the Direct Prestige outer shell to use the same neutral section styling as Objectives",
);

assert.match(
  source,
  /styles\.headToHeadActiveBox,[\s\S]*borderColor: withAlpha\(UI\.silver, 0\.5\),[\s\S]*backgroundColor: withAlpha\(UI\.silver, 0\.12\)/,
  "expected the active Head to Head mission card to keep the silver treatment",
);

console.log("direct-prestige-head-to-head-shell.test.cjs passed");
