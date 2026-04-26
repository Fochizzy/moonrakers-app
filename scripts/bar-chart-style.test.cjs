const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "BarChart", "BarChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*<ChartStage/s,
  "expected the bar chart to keep the shared focus-card readout and staged plot shell"
);

console.log("bar-chart-style.test.cjs passed");
