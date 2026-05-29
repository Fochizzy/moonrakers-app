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

assert.match(
  railSource,
  /\{tab\.shortLabel \?\? tab\.label\}/,
  "expected AnalyticsControlRail to prefer short tab labels when a route provides them",
);

assert.match(
  railSource,
  /numberOfLines=\{tabVariant === "stacked" \? 3 : 1\}/,
  "expected stacked analytics rails to allow up to three lines for narrow labels"
);

assert.match(
  railSource,
  /tabRailStacked:\s*\{[\s\S]*?flexDirection:\s*"column",[\s\S]*?flexWrap:\s*"nowrap",[\s\S]*?gap:\s*4,/,
  "expected stacked analytics rails to stay on three vertical rows without wrapping into a second column"
);

assert.match(
  railSource,
  /tabButtonStacked:\s*\{[\s\S]*?alignSelf:\s*"stretch",[\s\S]*?paddingHorizontal:\s*10,[\s\S]*?paddingVertical:\s*8,[\s\S]*?gap:\s*3,/,
  "expected stacked analytics buttons to use the tighter compact padding"
);

assert.match(
  railSource,
  /tabButtonTextStacked:\s*\{[\s\S]*?fontSize:\s*13,[\s\S]*?lineHeight:\s*16,/,
  "expected stacked analytics buttons to use smaller text for long labels"
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
