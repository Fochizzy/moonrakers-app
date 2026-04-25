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

assert.match(
  source,
  /function getDetailRouteChartKey\(chartKey: ChartCatalogKey\)\s*\{[\s\S]*chartKey === "relationship_graph"\s*\?\s*"assist_network_overview"\s*:\s*chartKey[\s\S]*\}/,
  "expected the detail launch contract to alias relationship_graph to assist_network_overview until the detail route is replaced"
);

assert.match(
  source,
  /function openChart\(chart: ChartCatalogEntry\)\s*\{[\s\S]*const detailParams = buildChartHubParams\(\s*chart,\s*true,\s*getDetailRouteChartKey\(chart\.key\)\s*\)/,
  "expected launching the Assist Network card to use the assist-network detail-route key"
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
