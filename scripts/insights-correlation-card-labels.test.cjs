const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "CorrelationStats.tsx"),
  "utf8",
);

assert.match(
  source,
  /<View[\s\S]*?style=\{\[\s*styles\.metricHeader,\s*\(compact \|\| stackedHeader\) && styles\.metricHeaderCompact,\s*\]\}[\s\S]*?>/,
  "expected compact correlation cards to opt into a stacked metric header layout",
);

assert.match(
  source,
  /stackedHeader\?: boolean;/,
  "expected correlation cards to accept a stackedHeader mode for narrow live phone layouts",
);

assert.match(
  source,
  /<DefinitionTermText[\s\S]*?containerStyle=\{\s*\(compact \|\| stackedHeader\) && styles\.metricLabelContainerCompact\s*\}[\s\S]*?style=\{\[\s*styles\.metricLabel,\s*compact && styles\.metricLabelCompact,\s*stackedHeader && styles\.metricLabelStacked,\s*\]\}[\s\S]*?numberOfLines=\{compact \|\| stackedHeader \? 2 : 1\}[\s\S]*?>/,
  "expected narrow-phone pairing cards to allow wrapped titles and a full-width stacked title block",
);

assert.match(
  source,
  /metricHeaderCompact:/,
  "expected a dedicated compact metric header style",
);

assert.match(
  source,
  /metricCardCompact:\s*\{[\s\S]*?minHeight:\s*206,[\s\S]*?padding:\s*12,[\s\S]*?gap:\s*10,/,
  "expected compact correlation cards to tighten their spacing so the longer hybrid labels still fit cleanly",
);

assert.match(
  source,
  /metricLabelCompact:\s*\{[\s\S]*?minHeight:\s*36,[\s\S]*?fontSize:\s*14,[\s\S]*?lineHeight:\s*18,|metricLabelCompact:\s*\{[\s\S]*?fontSize:\s*14,[\s\S]*?lineHeight:\s*18,[\s\S]*?minHeight:\s*36,/,
  "expected compact correlation card titles to reserve room for a two-line hybrid metric label",
);

assert.match(
  source,
  /metricLabelContainerCompact:\s*\{[\s\S]*?alignSelf:\s*'stretch',[\s\S]*?width:\s*'100%',[\s\S]*?maxWidth:\s*'100%',[\s\S]*?minWidth:\s*0,/,
  "expected compact definition-linked titles to claim the full card width so long labels can wrap on narrow phones",
);

assert.match(
  source,
  /metricLabelStacked:\s*\{[\s\S]*?flex:\s*0,[\s\S]*?width:\s*'100%'[\s\S]*?minHeight:\s*40,/,
  "expected stacked narrow-phone titles to claim the full card width before the badge row",
);

console.log("insights-correlation-card-labels.test.cjs passed");
