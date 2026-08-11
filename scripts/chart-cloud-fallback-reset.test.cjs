const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartDetailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

// The fallback is a whole-account snapshot loaded with loadCloudSnapshot(profileId).
// Keying its reset on datasetQuery.queryKey pulled the route metric into the key, so
// every metric tab tap discarded the snapshot and re-downloaded the entire account.
assert.match(
  chartDetailSource,
  /const cloudFallbackResetKey = profileId;/,
  "expected chart detail to reset cloud fallback state per profile, not per dataset query",
);

assert.doesNotMatch(
  chartDetailSource,
  /const cloudFallbackResetKey = \[profileId,\s*datasetQuery\.queryKey\]/,
  "expected the cloud fallback reset key to stay off datasetQuery.queryKey so metric changes do not re-download the account snapshot",
);

assert.match(
  chartDetailSource,
  /useEffect\(\(\) => \{\s*setCloudFallbackSnapshot\(null\);\s*setCloudFallbackLoading\(false\);\s*setCloudFallbackAttempted\(false\);\s*\}, \[cloudFallbackResetKey\]\);/,
  "expected chart detail to clear stuck cloud fallback state whenever the chart dataset context changes",
);

console.log("chart-cloud-fallback-reset.test.cjs passed");
