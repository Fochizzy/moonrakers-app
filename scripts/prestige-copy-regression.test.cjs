const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const compareMetricsSource = read("utils", "compareMetrics.ts");
assert.match(
  compareMetricsSource,
  /within 3 prestige\./,
  "expected close-game copy to describe prestige instead of points",
);
assert.doesNotMatch(
  compareMetricsSource,
  /within 3 points\./,
  "expected close-game copy to stop describing scoring margins as points",
);

const rivalrySource = read("components", "charts", "RivalryGraph.tsx");
assert.match(
  rivalrySource,
  /edges on prestige/,
  "expected rivalry verdicts to describe prestige edges",
);
assert.doesNotMatch(
  rivalrySource,
  /edges on points/,
  "expected rivalry verdicts to stop describing prestige edges as points",
);

const conditionalCompareSource = read(
  "components",
  "charts",
  "compare",
  "ConditionalComparisonCard.tsx",
);
assert.match(
  conditionalCompareSource,
  /Prestige pressure/,
  "expected conditional compare score copy to describe prestige pressure",
);
assert.doesNotMatch(
  conditionalCompareSource,
  /Point pressure/,
  "expected conditional compare score copy to stop describing prestige pressure as point pressure",
);

console.log("prestige-copy-regression.test.cjs passed");
