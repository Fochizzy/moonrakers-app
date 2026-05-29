const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "EfficiencyFailureScatter.tsx"),
  "utf8",
);

assert.match(
  source,
  /onLayout=\{\(event\) => setContainerWidth\(event\.nativeEvent\.layout\.width\)\}/,
  "expected the efficiency scatter to measure the card width before rendering the SVG",
);

assert.match(
  source,
  /buildEfficiencyFailureScatterLayout\(containerWidth\)/,
  "expected the efficiency scatter to derive its SVG size from the shared responsive layout helper",
);

assert.match(
  source,
  /resolveEfficiencyFailureScatterLabelPlacement\(/,
  "expected the efficiency scatter to clamp point-label placement back inside the chart bounds",
);

console.log("efficiency-failure-scatter-wiring.test.cjs passed");
