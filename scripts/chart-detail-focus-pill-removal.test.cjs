const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "[chartKey].tsx"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /routePlayerId \? `Focus: \$\{routePlayerId\}` : null/,
  "expected chart detail summary chips to stop rendering a Focus pill above the chart surface",
);

console.log("chart-detail-focus-pill-removal.test.cjs passed");
