const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "CorrelationStats.tsx"),
  "utf8",
);

assert.match(
  source,
  /const pairingTwoColumnMinWidth = 420;/,
  "expected Personal Correlations to wait for a wider phone breakpoint before switching back to two columns",
);

assert.match(
  source,
  /const macroTwoColumnMinWidth = 420;/,
  "expected Macro Correlations to use the same wider phone breakpoint as Personal Correlations before switching back to two columns",
);

assert.match(
  source,
  /const isTwoColumn =\s*\(view === 'pairing' && width >= pairingTwoColumnMinWidth\)\s*\|\|\s*\(view === 'macro' && width >= macroTwoColumnMinWidth\);/,
  "expected the correlation grid to use a wider breakpoint for Personal Correlations than for Macro Correlations",
);

assert.match(
  source,
  /const shouldStackCompactHeader =\s*\(view === 'pairing' && width < pairingTwoColumnMinWidth\)\s*\|\|\s*\(view === 'macro' && width < macroTwoColumnMinWidth\);/,
  "expected Personal and Macro Correlations on narrower phones to stack the card header instead of forcing title and badge onto one row",
);

assert.match(
  source,
  /<CorrelationCard[\s\S]*?strength=\{item\.strength\}[\s\S]*?compact=\{isTwoColumn\}[\s\S]*?stackedHeader=\{shouldStackCompactHeader\}[\s\S]*?\/>/,
  "expected Personal Correlations cards to reuse the shared compact stacked-header behavior",
);

assert.match(
  source,
  /<CorrelationCard[\s\S]*?label=\{item\.label\}[\s\S]*?value=\{item\.value\}[\s\S]*?compact=\{isTwoColumn\}[\s\S]*?stackedHeader=\{shouldStackCompactHeader\}[\s\S]*?\/>/,
  "expected Macro Correlations cards to receive the same stacked-header behavior on narrow phones",
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
