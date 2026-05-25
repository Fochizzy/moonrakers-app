const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RelationshipGraph.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartStage[\s\S]*<ChartUnderlineTabs[\s\S]*<ChartFocusCard/s,
  "expected the relationship graph to keep the staged graph shell, shared tabs, and focus card"
);

assert.match(
  source,
  /showAssistMetricControl = true/,
  "expected the relationship graph to preserve the assist-network metric toggle seam"
);

console.log("relationship-graph-style.test.cjs passed");
