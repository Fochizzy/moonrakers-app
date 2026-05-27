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
  /const statsTabs:[\s\S]*label: "Home"[\s\S]*label: "Players"[\s\S]*label: "Playstyle"[\s\S]*label: "Insights"[\s\S]*label: "Games"/,
  "expected the stats screen primary navigation to keep the Home, Players, Playstyle, Insights, and Games tabs in order"
);

assert.match(
  source,
  /<AnalyticsControlRail[\s\S]*title="Browse Statistics"[\s\S]*tabs=\{statsTabs\}[\s\S]*activeTabKey=\{activeTab\}[\s\S]*onTabChange=\{\(key\) => setActiveTab\(key as StatsTab\)\}[\s\S]*\/>/,
  "expected the stats screen primary tab rail to use the shared underline analytics control rail"
);

assert.doesNotMatch(
  source,
  /<PrimaryTabPill/,
  "expected the wrapped pill tabs to stay removed from the stats screen primary navigation"
);

console.log("stats-primary-tab-rail.test.cjs passed");
