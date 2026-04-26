const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);
const inspectorSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "components",
    "charts",
    "RadarChart",
    "RadarChartInspector.tsx"
  ),
  "utf8"
);

assert.match(
  radarSource,
  /<ChartFocusCard[\s\S]*<ChartStage[\s\S]*<RadarChartInspector/s,
  "expected the radar chart to keep the focus card, staged plot, and inspector seam"
);

assert.match(
  inspectorSource,
  /<ChartFocusCard[\s\S]*Delta/s,
  "expected the radar inspector to keep the shared focus card and delta readout"
);

console.log("radar-chart-style.test.cjs passed");
