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

console.log("definition-term-surface-links.test.cjs passed");
