const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartDetailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

const shouldLoadMatch = chartDetailSource.match(
  /const shouldLoadCloudFallback =([\s\S]*?)const provenance =/,
);

assert.ok(
  shouldLoadMatch,
  "expected to find the chart-detail cloud fallback loading guard",
);

assert.doesNotMatch(
  shouldLoadMatch[1],
  /cloudFallbackAttempted|cloudFallbackLoading/,
  "expected the chart-detail cloud fallback condition to stay independent from the state it mutates, so the request does not cancel itself",
);

assert.match(
  chartDetailSource,
  /useEffect\(\(\) => \{[\s\S]*setCloudFallbackAttempted\(true\);[\s\S]*setCloudFallbackLoading\(true\);[\s\S]*\}, \[cloudFallbackResetKey,\s*profileId,\s*shouldLoadCloudFallback\]\);/,
  "expected the chart-detail cloud fallback effect to track the dataset query key instead of the state flags it updates",
);

console.log("chart-cloud-fallback-effect.test.cjs passed");
