const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "ConsistencyBandChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*is steadiest[\s\S]*swings widest/s,
  "expected the consistency band to restore the shared focus-story card"
);

assert.match(
  source,
  /<ChartStage[\s\S]*Most Stable[\s\S]*Swingiest/s,
  "expected the consistency band to keep the staged range rails and stability flags"
);

console.log("consistency-band-style.test.cjs passed");
