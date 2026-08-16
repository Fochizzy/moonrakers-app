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
  /function replaceChartHubRoute\(chart: ChartCatalogEntry, setupOpen: boolean\)\s*\{[\s\S]*router\.setParams\(\s*buildChartHubParams\(chart,\s*setupOpen\)\s*\);[\s\S]*\}/,
  "expected chart-hub state changes to update params in place so selecting a chart does not re-navigate the same screen"
);

assert.doesNotMatch(
  source,
  /function replaceChartHubRoute\(chart: ChartCatalogEntry, setupOpen: boolean\)\s*\{[\s\S]*router\.replace\(/,
  "expected chart-hub state changes to stop using router.replace on the current route"
);

console.log("chart-hub-route-update.test.cjs passed");
