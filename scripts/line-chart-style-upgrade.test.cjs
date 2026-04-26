const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "LineChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartStage[\s\S]*tone="standard"/,
  "expected the line chart to render inside the shared staged plot shell"
);

assert.match(
  source,
  /const beamId = `selectionBeam-/,
  "expected the line chart to keep the ELO-style selection beam treatment"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*Peak[\s\S]*Delta/s,
  "expected the line chart inspector to surface peak and delta context"
);

console.log("line-chart-style-upgrade.test.cjs passed");
