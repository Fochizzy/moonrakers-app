const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);

assert.doesNotMatch(
  radarSource,
  /const summaryLines = useMemo\(/,
  "expected RadarChart summary copy to avoid an extra memo hook in the render path",
);

assert.match(
  radarSource,
  /const summaryLines = buildSummaryLines\(\{/,
  "expected RadarChart to derive summary lines directly from the current model",
);

console.log("radar-chart-render-stability.test.cjs passed");
