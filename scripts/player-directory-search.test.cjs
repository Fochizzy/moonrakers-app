const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "player-profile", "index.tsx"));

assert.match(
  screenSource,
  /const\s+\[playerSearch,\s+setPlayerSearch\]\s*=\s*useState\(""\)/,
  "expected player directory to track a local playerSearch state",
);

assert.match(
  screenSource,
  /placeholder="Search players"/,
  "expected player directory to render a Search players input near the top of the page",
);

assert.match(
  screenSource,
  /const\s+filteredPlayers\s*=\s*useMemo\(\s*\(\)\s*=>\s*\{[\s\S]*players\.filter\(/,
  "expected player directory to derive filteredPlayers from the full players list",
);

assert.match(
  screenSource,
  /filteredPlayers\.map\(\(player\)\s*=>/,
  "expected player directory to render filteredPlayers instead of the unfiltered list",
);

console.log("player-directory-search.test.cjs passed");
