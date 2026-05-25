const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "Sparkline.tsx"),
  "utf8"
);

assert.match(
  source,
  /<ChartStage[\s\S]*LinearGradient id=\{beamId\}/s,
  "expected the sparkline to keep the ELO-style staged plot and beam wash"
);

assert.match(
  source,
  /<ChartFocusCard[\s\S]*legendMiniCard/s,
  "expected the sparkline to keep the focus card and compact readout cards below the plot"
);

console.log("sparkline-style.test.cjs passed");
