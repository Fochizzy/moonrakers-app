const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "CorrelationStats.tsx"),
  "utf8",
);

assert.match(
  source,
  /<View style=\{\[styles\.metricHeader,\s*compact && styles\.metricHeaderCompact\]\}>/,
  "expected compact correlation cards to opt into a stacked metric header layout",
);

assert.match(
  source,
  /<Text[\s\S]*?style=\{\[styles\.metricLabel,\s*compact && styles\.metricLabelCompact\]\}[\s\S]*?numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?minimumFontScale=\{0\.7\}[\s\S]*?>/,
  "expected compact correlation card titles to stay on one line and shrink to fit narrow cards",
);

assert.match(
  source,
  /metricHeaderCompact:/,
  "expected a dedicated compact metric header style",
);

assert.match(
  source,
  /metricLabelCompact:\s*\{[\s\S]*?fontSize:\s*13,[\s\S]*?lineHeight:\s*16,/,
  "expected compact correlation card titles to use a smaller base font before scaling down further",
);

console.log("insights-correlation-card-labels.test.cjs passed");
