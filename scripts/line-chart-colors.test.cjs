const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "LineChart.tsx"),
  "utf8"
);

assert.match(
  source,
  /resolveStoredPlayerColor/,
  "expected the line chart to normalize stored player color tokens"
);

assert.match(
  source,
  /getPlayerAccentColor\(resolveStoredPlayerColor\(raw,\s*index\)\)/,
  "expected the line chart to convert stored tokens into real accent colors"
);

console.log("line-chart-colors.test.cjs passed");
