const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const provenanceSource = read(path.join("lib", "charts", "chartDetailProvenance.ts"));
const chartSetupSource = read(path.join("app", "charts", "index.tsx"));

assert.match(
  provenanceSource,
  /buildAnalyticsFreshnessPresentation/,
  "expected chart detail provenance to use the shared analytics freshness presenter for live and stale server copy",
);

assert.doesNotMatch(
  provenanceSource,
  /Showing the last successful Supabase chart dataset because the latest refresh failed/,
  "expected chart detail provenance to stop hand-rolling stale chart refresh copy",
);

assert.match(
  chartSetupSource,
  /useAnalyticsPresentation/,
  "expected the chart setup screen to use the shared analytics presentation hook",
);

assert.doesNotMatch(
  chartSetupSource,
  /Showing the last successful chart-setup payload because the latest refresh failed/,
  "expected the chart setup screen to stop hand-rolling stale setup refresh copy",
);

console.log("chart-freshness-alignment.test.cjs passed");
