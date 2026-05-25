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
  /function previewChart\(chartKey: ChartCatalogKey\)\s*\{[\s\S]*scrollViewRef\.current\?\.scrollTo\(\{\s*y:\s*0,\s*animated:\s*false\s*\}\);[\s\S]*setSelectedChartKey\(nextChart\.key\);/,
  "expected chart preview taps to snap the charts hub back to the top before swapping the selected graph"
);

console.log("chart-preview-scroll-reset.test.cjs passed");
