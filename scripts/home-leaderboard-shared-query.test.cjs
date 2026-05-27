const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "components", "home", "HomeLeaderboardTab.tsx"),
  "utf8",
);

assert.match(
  source,
  /useLiveAnalyticsQuery/,
  "expected HomeLeaderboardTab to move onto the shared live analytics query hook",
);

assert.match(
  source,
  /buildAnalyticsFreshnessPresentation/,
  "expected HomeLeaderboardTab to use the shared analytics freshness presenter",
);

assert.doesNotMatch(
  source,
  /useAnalyticsRefreshTick/,
  "expected HomeLeaderboardTab to stop manually wiring the analytics refresh tick",
);

assert.doesNotMatch(
  source,
  /const\s+\[loading,\s*setLoading\]/,
  "expected HomeLeaderboardTab to stop owning a separate loading state now that the shared query hook handles it",
);

assert.match(
  source,
  /sourceCaption=\{freshness\.sourceCaption\(/,
  "expected HomeLeaderboardTab to render the quiet shared freshness caption",
);

console.log("home-leaderboard-shared-query.test.cjs passed");
