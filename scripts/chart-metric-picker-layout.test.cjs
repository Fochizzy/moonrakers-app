const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartHubSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  chartHubSource,
  /<SetupSection\s+title="Metric"[\s\S]*<SetupSegmentedTabs[\s\S]*items=\{metricOptions\}[\s\S]*selectedKeys=\{activeMetric \? \[activeMetric\] : \[\]\}[\s\S]*columns=\{2\}/s,
  "expected the metric stage to use compact segmented tabs so multiple metrics stay visible on mobile",
);

assert.match(
  chartHubSource,
  /<SetupSegmentedTabs[\s\S]*onChange=\{\(nextMetric\) => setSelectedMetric\(nextMetric\)\}/s,
  "expected the compact metric tabs to reuse the shared metric selection handler",
);

assert.match(
  chartHubSource,
  /metricGrid:\s*\{[\s\S]*width:\s*"100%"[\s\S]*gap:\s*8/s,
  "expected the metric picker grid to stay full width while spacing compact segmented rows cleanly",
);

assert.doesNotMatch(
  chartHubSource,
  /function MetricButton\(/,
  "expected the oversized custom metric card control to be removed in favor of segmented tabs",
);

assert.doesNotMatch(
  chartHubSource,
  /metricButton:\s*\{/,
  "expected the old full-card metric button styles to be removed once the segmented metric picker is restored",
);

console.log("chart-metric-picker-layout.test.cjs passed");
