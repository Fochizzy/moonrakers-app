const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

for (const relPath of [
  "app/analytics.tsx",
  "app/stats.tsx",
  "app/insights.tsx",
  "app/elo.tsx",
  "app/charts/index.tsx",
  "app/charts/[chartKey].tsx",
]) {
  const source = read(relPath);

  assert.match(
    source,
    /lib\/cloud\/analytics\/useLiveAnalyticsQuery/,
    `expected ${relPath} to use the shared live analytics query hook`,
  );
}

console.log("analytics-live-loader-usage.test.cjs passed");
