const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const analyticsSource = read(path.join("app", "analytics.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const chartRouteSource = read(path.join("app", "charts", "[chartKey].tsx"));

assert.match(
  analyticsSource,
  /lib\/cloud\/analytics\/getAnalyticsHome/,
  "expected app/analytics.tsx to import the server-authored analytics-home wrapper",
);

assert.match(
  statsSource,
  /lib\/cloud\/analytics\/getStatsScreen/,
  "expected app/stats.tsx to import the server-authored stats-screen wrapper",
);

assert.match(
  insightsSource,
  /lib\/cloud\/analytics\/getInsightsScreen/,
  "expected app/insights.tsx to import the server-authored insights-screen wrapper",
);

assert.match(
  chartRouteSource,
  /lib\/cloud\/analytics\/getChartDataset/,
  "expected app/charts/[chartKey].tsx to import the server-authored chart-dataset wrapper",
);

assert.doesNotMatch(
  statsSource,
  /utils\/analyticsPlayers|utils\/statsEngine|utils\/derivedMetricsEngine|utils\/correlationEngine|utils\/individualCorrelationEngine|utils\/gameCorrelationEngine/,
  "expected app/stats.tsx to stop deriving analytics locally",
);

assert.doesNotMatch(
  insightsSource,
  /utils\/charts|utils\/analyticsPlayers/,
  "expected app/insights.tsx to stop deriving insights locally",
);

assert.doesNotMatch(
  chartRouteSource,
  /utils\/charts|utils\/analyticsPlayers/,
  "expected app/charts/[chartKey].tsx to stop deriving chart datasets locally",
);

console.log("analytics-route-no-local-derivation.test.cjs passed");
