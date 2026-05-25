const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modelSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "bumpChartModel.ts"),
  "utf8"
);
const chartSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "BumpChart.tsx"),
  "utf8"
);

assert.match(
  modelSource,
  /getPlayerAccentColor\(resolveStoredPlayerColor\(color,\s*index\)\)/,
  "expected the bump chart model to normalize stored player color tokens"
);

assert.match(
  chartSource,
  /<ChartStage[\s\S]*beamId[\s\S]*<ChartFocusCard/s,
  "expected the bump chart to keep the staged plot, beam, and focus-card readout"
);

console.log("bump-chart-colors.test.cjs passed");
