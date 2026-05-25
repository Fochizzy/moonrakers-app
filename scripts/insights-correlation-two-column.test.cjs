const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "CorrelationStats.tsx"),
  "utf8",
);

assert.match(
  source,
  /<View style=\{isTwoColumn \? styles\.metricListTwoColumn : styles\.metricList\}>/,
  "expected the two-column correlation grid to switch between stacked and two-column list styles instead of inheriting the stacked list gap",
);

assert.match(
  source,
  /metricListTwoColumn:\s*\{[\s\S]*flexDirection:\s*'row'[\s\S]*flexWrap:\s*'wrap'[\s\S]*rowGap:\s*10[\s\S]*justifyContent:\s*'space-between'[\s\S]*\}/,
  "expected the dedicated two-column correlation grid style to preserve row spacing while distributing cards across both columns",
);

assert.match(
  source,
  /metricCellTwoColumn:\s*\{[\s\S]*width:\s*'49%'[\s\S]*maxWidth:\s*'49%'[\s\S]*\}/,
  "expected each two-column correlation cell to stay capped at half width",
);

console.log("insights-correlation-two-column.test.cjs passed");
