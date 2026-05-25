const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "HeadToHeadChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /const MIN_MOMENTUM_HEIGHT_PCT = 22/,
  "expected the head-to-head strip to keep readable minimum momentum bar height"
);

assert.match(
  source,
  /const MOMENTUM_BAR_WIDTH = 18/,
  "expected the head-to-head strip to keep readable momentum bar width"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*<ChartStage/s,
  "expected head-to-head to keep the shared focus card and staged momentum strip"
);

console.log("head-to-head-momentum-strip.test.cjs passed");
