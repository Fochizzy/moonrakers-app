const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));

assert.doesNotMatch(
  layoutSource,
  /loadGroups\(\)/,
  "expected _layout.tsx to stop loading local groups during bootstrap",
);

assert.match(
  layoutSource,
  /const \[players,\s*games\] = await Promise\.all\(\[\s*loadPlayers\(\),\s*loadGames\(\),\s*\]\);/s,
  "expected loadLocalSnapshot to keep only local players and games",
);

assert.match(
  layoutSource,
  /groups:\s*\[\],/,
  "expected loadLocalSnapshot to return an empty local groups array",
);

console.log("shared-groups-cloud-only-bootstrap.test.cjs passed");
