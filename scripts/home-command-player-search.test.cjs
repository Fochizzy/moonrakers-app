const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "index.tsx"));

assert.match(
  screenSource,
  /const\s+\[playerSearch,\s+setPlayerSearch\]\s*=\s*useState\(""\)/,
  "expected app/index.tsx to track a local playerSearch state for the Command player picker",
);

assert.match(
  screenSource,
  /placeholder="Search players"/,
  "expected app/index.tsx to render a Search players input above the Command player list",
);

assert.match(
  screenSource,
  /const\s+filteredPlayers\s*=\s*useMemo\(\s*\(\)\s*=>\s*\{[\s\S]*rankedPlayers\.filter\(/,
  "expected app/index.tsx to derive a filteredPlayers list from rankedPlayers",
);

assert.match(
  screenSource,
  /filteredPlayers\.map\(\(player\)\s*=>/,
  "expected app/index.tsx to render filteredPlayers in the Command player grid",
);

console.log("home-command-player-search.test.cjs passed");
