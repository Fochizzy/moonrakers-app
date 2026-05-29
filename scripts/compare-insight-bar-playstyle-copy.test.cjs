const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "compare", "CompareInsightBar.tsx"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /text={`Focus: \$\{focusLabel\(activeFocusGroup\)\}`}/,
  "expected the compare insight header pills to remove the Focus badge entirely",
);

assert.match(
  source,
  /function buildTwoPlayerPlaystyleRead\(rows: CompareRow\[\]\): string\[\]/,
  "expected a dedicated two-player playstyle narrative builder for compare insights",
);

assert.match(
  source,
  /const playstyleRead = useMemo\(\(\) => buildTwoPlayerPlaystyleRead\(rows\), \[rows\]\);/,
  "expected the compare insight card to memoize a dedicated two-player playstyle read",
);

assert.match(
  source,
  /const bottomLines = isPlayerVsFieldAggregate && fieldAggregateRead\.length >= 5[\s\S]*modeLabel === 'players' && rows\.length === 2 && playstyleRead\.length >= 3[\s\S]*readLines;/,
  "expected two-player comparisons to keep the dedicated playstyle branch after the field-aggregate branch",
);

assert.match(
  source,
  /Their pace is|At the table,|Objectives push|The cleaner closer|Neither player shows a major seat-order dependency/,
  "expected the two-player narrative copy to describe how the players differ instead of repeating the header labels",
);

console.log("compare-insight-bar-playstyle-copy.test.cjs passed");
