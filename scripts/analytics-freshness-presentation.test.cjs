const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const helperPath = path.join("utils", "analyticsFreshness.ts");
const helperSource = read(helperPath);

assert.match(
  helperSource,
  /export function buildAnalyticsFreshnessPresentation/,
  "expected a shared analytics freshness presenter helper to exist",
);

assert.match(
  helperSource,
  /sourceKind:/,
  "expected the shared freshness presenter to provide a source kind",
);

assert.match(
  helperSource,
  /sourceCaption:/,
  "expected the shared freshness presenter to provide a quiet source caption",
);

assert.match(
  helperSource,
  /retryAction:/,
  "expected the shared freshness presenter to provide a retry action when freshness degrades",
);

assert.match(
  helperSource,
  /Latest refresh failure:/,
  "expected the shared freshness presenter to normalize stale refresh failure messaging",
);

for (const [relativePath, expectedPattern] of [
  ["app/analytics.tsx", /useAnalyticsPresentation/],
  ["app/stats.tsx", /useAnalyticsPresentation/],
  ["app/insights.tsx", /useAnalyticsPresentation/],
  ["app/elo.tsx", /useAnalyticsPresentation/],
  ["app/player-profile/[playerId].tsx", /buildAnalyticsFreshnessPresentation/],
]) {
  const source = read(relativePath);

  assert.match(
    source,
    expectedPattern,
    `expected ${relativePath} to adopt the shared analytics freshness presenter`,
  );

  assert.doesNotMatch(
    source,
    /const staleSourceCaption = isStale\s*\?/,
    `expected ${relativePath} to stop hand-rolling stale source captions`,
  );
}

console.log("analytics-freshness-presentation.test.cjs passed");
