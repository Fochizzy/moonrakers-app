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

assert.doesNotMatch(
  source,
  /type GraphMode = "flow" \| "network";/,
  "expected the old relationship_graph graph-mode type contract to be removed"
);

assert.doesNotMatch(
  source,
  /GRAPH_MODE_OPTIONS/,
  "expected the old relationship_graph graph-mode options to be removed"
);

assert.doesNotMatch(
  source,
  /normalizeGraphMode/,
  "expected the old relationship_graph graph-mode route normalization to be removed"
);

assert.doesNotMatch(
  source,
  /params\.mode\s*=/,
  "expected the charts hub to stop serializing the old relationship_graph mode route param"
);

assert.doesNotMatch(
  source,
  /title="Graph mode"/,
  "expected the old relationship_graph Graph mode setup section to be removed"
);

console.log("chart-setup-control-system.test.cjs passed");
