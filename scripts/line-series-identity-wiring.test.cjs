const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lineChartSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "LineChart.tsx"),
  "utf8",
);

const eloChartSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "ELO", "EloChartPlot.tsx"),
  "utf8",
);

assert.match(
  lineChartSource,
  /buildLineSeriesIdentities/,
  "expected the shared line chart to derive duplicate-color identities from the shared helper",
);

assert.match(
  lineChartSource,
  /strokeDasharray=\{row\.strokeDasharray \?\? undefined\}/,
  "expected the shared line chart paths to render the per-series dash identity",
);

assert.match(
  lineChartSource,
  /collisionBadgeText/,
  "expected the shared line chart to surface the duplicate-color badge in the plot and legend",
);

assert.match(
  eloChartSource,
  /buildLineSeriesIdentities/,
  "expected the Elo plot to reuse the shared duplicate-color identity helper",
);

assert.match(
  eloChartSource,
  /strokeDasharray=\{row\.strokeDasharray \?\? undefined\}/,
  "expected the Elo plot paths to render the per-series dash identity",
);

assert.match(
  eloChartSource,
  /collisionBadgeText/,
  "expected the Elo plot to surface the duplicate-color badge in the plot and legend",
);

console.log("line-series-identity-wiring.test.cjs passed");
