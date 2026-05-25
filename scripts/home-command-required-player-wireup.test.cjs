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
  /ensureRequiredPlayerSelection/,
  "expected app/index.tsx to wire the required-player selection helper into the Command picker",
);

assert.match(
  screenSource,
  /const\s+signedInPlayerId\s*=\s*useMemo\(/,
  "expected app/index.tsx to derive a signedInPlayerId for the Command picker",
);

console.log("home-command-required-player-wireup.test.cjs passed");
