const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const chartDetailSource = read(path.join("app", "charts", "[chartKey].tsx"));
const compareRouteSource = read(path.join("app", "charts", "compare", "index.tsx"));

assert.match(
  chartDetailSource,
  /components\/charts\/ChartSurface/,
  "expected chart detail to adopt the extracted chart surface shell",
);

assert.match(
  compareRouteSource,
  /components\/charts\/ChartSurface|components\/charts\/ChartMetricChip|components\/charts\/ChartInsightStrip/,
  "expected chart compare surfaces to adopt the shared chart/card system primitives",
);

console.log("chart-surface-system.test.cjs passed");
