const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "HeadToHeadChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /const MOMENTUM_TRACK_HEIGHT = 96/,
  "expected the simplified head-to-head strip to use a dedicated shared track height"
);

assert.match(
  source,
  /styles\.momentumTrack/,
  "expected the simplified head-to-head strip to use a single momentum track per game"
);

assert.match(
  source,
  /styles\.momentumCapsule/,
  "expected the simplified head-to-head strip to render cleaner vertical result capsules"
);

assert.match(
  source,
  /styles\.latestResultFrame/,
  "expected the latest head-to-head result to get a dedicated highlight frame"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*<ChartStage/s,
  "expected head-to-head to keep the shared focus card and staged momentum strip"
);

console.log("head-to-head-momentum-strip.test.cjs passed");
