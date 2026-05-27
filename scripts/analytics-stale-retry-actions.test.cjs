const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const analyticsStateSectionSource = read(
  path.join("components", "analytics", "AnalyticsStateSection.tsx"),
);

assert.match(
  analyticsStateSectionSource,
  /ActionButton/,
  "expected AnalyticsStateSection to render quiet ready-state actions",
);

assert.match(
  analyticsStateSectionSource,
  /state === "ready"[\s\S]*primaryAction \|\| secondaryAction/,
  "expected AnalyticsStateSection to surface actions while a section stays in the ready state",
);

for (const relativePath of [
  path.join("app", "analytics.tsx"),
  path.join("app", "stats.tsx"),
  path.join("app", "insights.tsx"),
  path.join("app", "elo.tsx"),
  path.join("components", "home", "HomeLeaderboardTab.tsx"),
]) {
  const source = read(relativePath);

  assert.match(
    source,
    /primaryAction=\{freshness\.retryAction/,
    `${relativePath} should surface the shared retry action for stale analytics data`,
  );

  assert.doesNotMatch(
    source,
    /primaryAction=\{error \? freshness\.retryAction/,
    `${relativePath} should stop hiding retry behind hard-error-only checks`,
  );
}

console.log("analytics-stale-retry-actions.test.cjs passed");
