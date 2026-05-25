const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const analyticsStateSectionPath = path.join(
  projectRoot,
  "components",
  "analytics",
  "AnalyticsStateSection.tsx",
);

assert.equal(
  fs.existsSync(analyticsStateSectionPath),
  true,
  "expected a shared analytics state section component to exist",
);

const analyticsSource = read(path.join("app", "analytics.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const eloSource = read(path.join("app", "elo.tsx"));
const homeLeaderboardSource = read(
  path.join("components", "home", "HomeLeaderboardTab.tsx"),
);

for (const [label, source] of [
  ["analytics", analyticsSource],
  ["stats", statsSource],
  ["insights", insightsSource],
  ["elo", eloSource],
  ["home leaderboard", homeLeaderboardSource],
]) {
  assert.match(
    source,
    /AnalyticsStateSection/,
    `expected ${label} surface to adopt the shared AnalyticsStateSection`,
  );
}

console.log("analytics-shared-state-shell.test.cjs passed");
