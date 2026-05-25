const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const railSource = read(path.join("components", "analytics", "AnalyticsControlRail.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
const compareSource = read(path.join("app", "charts", "compare", "index.tsx"));

assert.match(
  railSource,
  /import PlayerSearchPicker[\s\S]*@\/components\/players\/PlayerSearchPicker["']/,
  "expected AnalyticsControlRail to reuse the shared PlayerSearchPicker",
);

assert.match(
  railSource,
  /tabs\.map\(/,
  "expected AnalyticsControlRail to render shared tab controls from a tabs collection",
);

for (const [label, source] of [
  ["stats", statsSource],
  ["insights", insightsSource],
  ["player profile", profileSource],
  ["compare", compareSource],
]) {
  assert.match(
    source,
    /import AnalyticsControlRail from ["']@\/components\/analytics\/AnalyticsControlRail["']/,
    `expected ${label} to import the shared AnalyticsControlRail`,
  );

  assert.match(
    source,
    /<AnalyticsControlRail/,
    `expected ${label} to render the shared AnalyticsControlRail`,
  );
}

assert.doesNotMatch(
  statsSource,
  /function TabButton\(/,
  "expected stats to stop defining a route-local tab rail helper",
);

assert.doesNotMatch(
  insightsSource,
  /function SectionTabButton\(/,
  "expected insights to stop defining a route-local section tab helper",
);

console.log("analytics-control-rail.test.cjs passed");
