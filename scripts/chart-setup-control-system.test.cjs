const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /selectedChart\.key === "relationship_graph"[\s\S]*title="Assist metric"/,
  "expected the chart setup to always expose Assist metric for the profile assist network"
);

assert.match(
  source,
  /function replaceChartHubRoute\(chart: ChartCatalogEntry, setupOpen: boolean\)\s*\{[\s\S]*params:\s*buildChartHubParams\(chart,\s*setupOpen\)/,
  "expected the charts hub route state to keep relationship_graph as the hub chart key"
);

assert.doesNotMatch(
  source,
  /assist_network_overview/,
  "expected the charts hub launch contract to stop relying on the retired assist_network_overview alias"
);

assert.match(
  source,
  /function buildChartHubParams\([\s\S]*if \(chart\.key === "relationship_graph"\) \{[\s\S]*params\.assistMode = selectedAssistMode;/,
  "expected the Assist Network launch contract to keep serializing assistMode on relationship_graph"
);

assert.doesNotMatch(
  source,
  /detailMode\s*=|params\.graphVariant|graphVariant\s*=/,
  "expected the charts hub launch contract to drop the retired graphVariant detail-mode plumbing"
);

assert.match(
  source,
  /function openChart\(chart: ChartCatalogEntry\)\s*\{[\s\S]*const hubParams = buildChartHubParams\(chart,\s*true\)[\s\S]*router\.push\(\{[\s\S]*params: detailRouteParams,/,
  "expected the detail launch to push relationship_graph route params from the shared hub param builder"
);

assert.match(
  source,
  /function openSetup\(\)\s*\{[\s\S]*setChartSetupOpen\(true\)/,
  "expected tapping Adjust to keep setup route state aligned with the open setup UI"
);

assert.doesNotMatch(
  source,
  /title="Graph mode"/,
  "expected the old relationship_graph Graph mode setup section to be removed"
);

console.log("chart-setup-control-system.test.cjs passed");
