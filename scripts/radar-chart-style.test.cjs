const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);

assert.match(
  radarSource,
  /<ChartFocusCard[\s\S]*<ChartStage[\s\S]*Comparison Summary[\s\S]*Deep Comparison Report[\s\S]*Trait Definitions/s,
  "expected the radar chart to keep the focus card, staged plot, comparison summary, deep comparison report, and trait glossary seam"
);

assert.match(
  radarSource,
  /Tap a point to highlight its matching axis definition\./,
  "expected the radar chart to keep the tap-to-highlight helper copy for the trait glossary"
);

console.log("radar-chart-style.test.cjs passed");
