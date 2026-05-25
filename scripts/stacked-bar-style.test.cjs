const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "StackedBarChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartUnderlineTabs[\s\S]*<ChartFocusCard[\s\S]*<ChartStage/s,
  "expected the stacked bar chart to keep shared tabs, focus card, and stage"
);

console.log("stacked-bar-style.test.cjs passed");
