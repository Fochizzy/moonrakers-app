const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8"
);

assert.match(
  source,
  /<View style=\{styles\.primaryTabRail\}>[\s\S]*<TabButton[\s\S]*label="Home"[\s\S]*<TabButton[\s\S]*label="Players"[\s\S]*<TabButton[\s\S]*label="Playstyle"[\s\S]*<TabButton[\s\S]*label="Insights"[\s\S]*<TabButton[\s\S]*label="Games"[\s\S]*<\/View>/,
  "expected the stats screen primary navigation to use underline TabButton controls for Home, Players, Playstyle, Insights, and Games"
);

assert.match(
  source,
  /primaryTabRail:\s*\{[\s\S]*flexDirection:\s*"row",[\s\S]*flexWrap:\s*"nowrap"/,
  "expected the stats screen primary tab rail to stay on a single line"
);

assert.doesNotMatch(
  source,
  /<View style=\{styles\.primaryTabRail\}>[\s\S]*<PrimaryTabPill/,
  "expected the wrapped pill tabs to be removed from the stats screen primary navigation"
);

console.log("stats-primary-tab-rail.test.cjs passed");
