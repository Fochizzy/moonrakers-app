const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bumpChartSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "BumpChart.tsx"),
  "utf8",
);

const consistencyBandSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "ConsistencyBandChart.tsx"),
  "utf8",
);

const barChartSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "BarChart", "BarChart.tsx"),
  "utf8",
);

assert.match(
  bumpChartSource,
  /buildLineSeriesIdentities/,
  "expected the bump chart to reuse the shared duplicate-color identity helper",
);

assert.match(
  bumpChartSource,
  /strokeDasharray=\{series\.strokeDasharray \?\? undefined\}/,
  "expected the bump chart paths to render the duplicate-color stroke identity",
);

assert.match(
  bumpChartSource,
  /collisionBadgeText/,
  "expected the bump chart to surface a matching duplicate-color badge in the graph and legend",
);

assert.match(
  consistencyBandSource,
  /buildLineSeriesIdentities/,
  "expected the consistency band chart to reuse the shared duplicate-color identity helper",
);

assert.match(
  consistencyBandSource,
  /collisionBadgeText/,
  "expected the consistency band chart rows to surface the duplicate-color badge next to player identity",
);

assert.match(
  barChartSource,
  /buildLineSeriesIdentities/,
  "expected the bar chart to reuse the shared duplicate-color identity helper",
);

assert.match(
  barChartSource,
  /collisionBadgeText/,
  "expected the bar chart rows to surface the duplicate-color badge next to player identity",
);

console.log("chart-series-collision-wiring.test.cjs passed");
