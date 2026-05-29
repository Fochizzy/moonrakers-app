const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "HeadToHeadChart.tsx"),
  "utf8",
);

assert.match(
  source,
  /function runLabel\(name: string \| null, length: number\)/,
  "expected HeadToHeadChart to format the center streak pill with a dedicated compact label helper",
);

assert.match(
  source,
  /styles\.scoreLabelRow/,
  "expected HeadToHeadChart to use a dedicated player label row in the win pills",
);

assert.match(
  source,
  /styles\.matchupTitle/,
  "expected HeadToHeadChart to introduce a clear matchup title in the hero header",
);

assert.match(
  source,
  /styles\.scoreMetaRow/,
  "expected HeadToHeadChart to align the player win count and win rate inside a dedicated compact meta row",
);

assert.match(
  source,
  /styles\.summaryChipGrid/,
  "expected HeadToHeadChart to collapse the supporting stats into a lighter summary chip grid",
);

assert.match(
  source,
  /styles\.summaryChipFull/,
  "expected HeadToHeadChart to give the recent swing chip a wider full-width treatment",
);

assert.match(
  source,
  /!showHeader && styles\.headerRowCompact/,
  "expected HeadToHeadChart to compact the badge row when chart headers are hidden",
);

console.log("head-to-head-pill-formatting.test.cjs passed");
