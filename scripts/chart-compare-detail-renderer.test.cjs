const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8"
);

assert.match(
  source,
  /import CompareChart from "@\/components\/charts\/CompareChart";/,
  "expected the chart detail route to import the dedicated compare chart renderer"
);

assert.match(
  source,
  /const DETAIL_METRIC_CONTROL_KEYS = new Set\(\[[\s\S]*"compare"[\s\S]*\]\)/,
  "expected compare detail charts to expose the shared metric rail"
);

assert.match(
  source,
  /case "compare":[\s\S]*<CompareChart[\s\S]*statKey=\{activeMetric \?\? localChartData\.metricKey\}[\s\S]*focusPlayerId=\{localChartData\.selectedPlayer\?\.id \?\? null\}[\s\S]*comparePlayerId=\{localChartData\.comparePlayer\?\.id \?\? null\}/,
  "expected the compare detail route to render the compare chart with route-driven metric wiring"
);

console.log("chart-compare-detail-renderer.test.cjs passed");
