const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8"
);

assert.match(
  source,
  /<SectionCard title="Archive Controls" subtitle=\{`\$\{displayedGames\.length\} visible`\}>/s,
  "expected Mission Archive to merge search, filters, and sorting into a single Archive Controls card"
);

assert.doesNotMatch(
  source,
  /<SectionCard title="Filter"/,
  "expected the standalone Filter card to be removed from Mission Archive"
);

assert.doesNotMatch(
  source,
  /<SectionCard title="Sort By"/,
  "expected the standalone Sort By card to be removed from Mission Archive"
);

assert.match(
  source,
  /title="Archive Controls"[\s\S]*>Filter<[\s\S]*>Sort By<[\s\S]*title="Game History"/s,
  "expected the compact archive controls to keep both filter and sort rails before the history list"
);

console.log("history-archive-controls.test.cjs passed");
