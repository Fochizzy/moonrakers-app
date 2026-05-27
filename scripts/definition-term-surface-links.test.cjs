const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const resolverSource = read(path.join("utils", "definitionTargets.ts"));
const compareSource = read(
  path.join("components", "charts", "compare", "CompareMatrixCard.tsx"),
);
const chartsSource = read(path.join("app", "charts", "index.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const turnOrderSource = read(
  path.join("components", "stats", "TurnOrderSummarySection.tsx"),
);

assert.match(
  resolverSource,
  /prestige:\s*"totalPrestige"/,
  "expected definition target aliases to normalize compare prestige keys",
);

assert.match(
  resolverSource,
  /avgStartOrder:\s*"avgStartSeat"/,
  "expected definition target aliases to normalize compare seat-order keys",
);

assert.match(
  resolverSource,
  /dataConfidenceScore:\s*"dataConfidence"/,
  "expected definition target aliases to normalize compare confidence keys",
);

assert.doesNotMatch(
  resolverSource,
  /efficiency:\s*"allContractsEfficiency"/,
  "expected metric=efficiency to resolve to the dedicated Efficiency glossary item",
);

assert.match(
  resolverSource,
  /"overall efficiency":\s*"allContractsEfficiency"/,
  "expected Overall Efficiency label aliases to keep resolving to the separate Overall Efficiency glossary item",
);

for (const [pattern, message] of [
  [
    /"turn order":\s*"turnOrder"/,
    "expected definition target aliases to expose the dedicated turn-order glossary group",
  ],
  [
    /"turn order overview":\s*"turnOrderOverview"/,
    "expected definition target aliases to resolve the turn-order overview section title",
  ],
  [
    /"by table size":\s*"turnOrderByTableSize"/,
    "expected definition target aliases to resolve the turn-order table-size section title",
  ],
  [
    /"average start seat":\s*"avgStartSeat"/,
    "expected definition target aliases to resolve the Average Start Seat label",
  ],
  [
    /"seat to win correlation":\s*"turnOrderWinCorrelation"/,
    "expected definition target aliases to normalize seat-to-win correlation labels",
  ],
  [
    /"seat vs win correlation":\s*"turnOrderWinCorrelation"/,
    "expected definition target aliases to normalize seat-vs-win correlation labels",
  ],
  [
    /"turn order win correlation":\s*"turnOrderWinCorrelation"/,
    "expected definition target aliases to normalize turn-order win correlation labels",
  ],
  [
    /"seat win rate":\s*"seatWinRate"/,
    "expected definition target aliases to resolve seat win rate labels",
  ],
  [
    /"form closing":\s*"formClosing"/,
    "expected definition target aliases to resolve the Form and Closing section title",
  ],
  [
    /"pressure context":\s*"pressureContext"/,
    "expected definition target aliases to resolve the Pressure and Context section title",
  ],
  [
    /"support context":\s*"supportContext"/,
    "expected definition target aliases to resolve the Support Context section title",
  ],
  [
    /"support context spotlight":\s*"supportContext"/,
    "expected definition target aliases to normalize the Support Context Spotlight label",
  ],
]) {
  assert.match(resolverSource, pattern, message);
}

assert.match(
  resolverSource,
  /export function resolveDefinitionTarget\(/,
  "expected a shared resolver for tappable definition targets",
);

assert.match(
  compareSource,
  /resolveDefinitionTarget/,
  "expected CompareMatrixCard to resolve metric terms through the shared definition-target helper",
);

assert.match(
  compareSource,
  /buildDefinitionsRoute/,
  "expected CompareMatrixCard to open the shared Definitions route from tappable metric terms",
);

assert.match(
  chartsSource,
  /definitionMetricKey\?: string \| null/,
  "expected chart setup metric buttons to accept a definition target key",
);

assert.match(
  chartsSource,
  /resolveDefinitionTarget\(\{\s*metric:\s*definitionMetricKey,\s*label\s*\}\)/,
  "expected chart setup metric buttons to resolve term taps through the shared definition-target helper",
);

assert.match(
  chartsSource,
  /definitionMetricKey=\{metric\.key\}/,
  "expected chart setup metric buttons to pass each metric option through the definitions target resolver",
);

assert.match(
  turnOrderSource,
  /DefinitionTermText label="Turn Order Overview"/,
  "expected the turn-order overview surface to stay wired through DefinitionTermText",
);

assert.match(
  turnOrderSource,
  /DefinitionTermText label="By Table Size"/,
  "expected the turn-order table-size surface to stay wired through DefinitionTermText",
);

for (const [pattern, message] of [
  [
    /const overviewFormClosingTitle = "Form & Closing";/,
    "expected Stats to surface the Form and Closing subsection title",
  ],
  [
    /const pressureContextTitle = "Pressure & Context";/,
    "expected Stats to surface the Pressure and Context subsection title",
  ],
  [
    /Support Context Spotlight/,
    "expected Stats to surface the Support Context Spotlight label",
  ],
]) {
  assert.match(statsSource, pattern, message);
}

console.log("definition-term-surface-links.test.cjs passed");
