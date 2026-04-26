const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "Heatmap.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*<ChartStage[\s\S]*<ChartUnderlineTabs/s,
  "expected the heatmap to keep the focus card, staged grid shell, and shared tabs"
);

console.log("heatmap-style.test.cjs passed");
