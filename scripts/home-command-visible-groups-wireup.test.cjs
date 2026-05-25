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
  /filterGroupsForSignedInPlayer/,
  "expected the home command screen to import the signed-in-group visibility helper",
);

assert.match(
  screenSource,
  /const\s+visibleGroups\s*=\s*useMemo\(\s*\(\)\s*=>\s*filterGroupsForSignedInPlayer\(rankedGroups,\s*signedInPlayerId\),/s,
  "expected the home command screen to derive a signed-in-only visibleGroups list",
);

assert.match(
  screenSource,
  /visibleGroups\.map\(\(group\)\s*=>/,
  "expected the home command screen to render only the signed-in visible groups list",
);

console.log("home-command-visible-groups-wireup.test.cjs passed");
