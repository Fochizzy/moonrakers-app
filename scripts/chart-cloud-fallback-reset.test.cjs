const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartDetailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

assert.match(
  chartDetailSource,
  /const cloudFallbackResetKey = \[profileId,\s*datasetQuery\.queryKey\]\.join\(":"\);/,
  "expected chart detail to reset cloud fallback state for each dataset query, not only the signed-in profile",
);

assert.match(
  chartDetailSource,
  /useEffect\(\(\) => \{\s*setCloudFallbackSnapshot\(null\);\s*setCloudFallbackLoading\(false\);\s*setCloudFallbackAttempted\(false\);\s*\}, \[cloudFallbackResetKey\]\);/,
  "expected chart detail to clear stuck cloud fallback state whenever the chart dataset context changes",
);

console.log("chart-cloud-fallback-reset.test.cjs passed");
